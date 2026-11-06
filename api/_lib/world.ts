// World ID Agent Pass: human checkpoint before a deposit rollover.
// Flow (OIDC step-up, https://auth.world.org/docs/guides/step-up):
//   1. /api/world-start    checks the passport exists on Arc, makes a one-time attempt, returns the World authorize URL
//   2. user proves they are a human at World (fresh authentication, max_age=0)
//   3. /api/world-callback validates state, code, ID token (signature, iss, aud, nonce, auth_time, acr) in this backend,
//                          and ONLY THEN signs the EIP-712 Rollover approval with the approver key.
// The browser never receives a signature unless every check passed. Nothing the client says is treated as authorization.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createPublicClient, http, isAddress, serializeSignature, type Hex } from "viem";
import { privateKeyToAccount, sign } from "viem/accounts";

export type Cfg = {
  issuer: string; // https://auth.world.org
  clientId: string;
  clientSecret: string; // client_secret_basic
  appUrl: string; // https://your-app.vercel.app (no trailing slash)
  stateSecret: string; // random string, >= 32 chars
  approverKey: Hex; // the key set as `approver` on the vault
  rpcUrl: string; // Arc testnet RPC
  vault: Hex; // RentDepositVaultV2 address
  acr: string[]; // acceptable assurance classes; [] disables the check (sandbox only)
  approvalTtlSec?: number; // how long the signed approval is valid
  attemptTtlSec?: number; // how long the World attempt is valid
  mock?: boolean; // DEMO ONLY: stand-in human check page (no World). Never counts as the official integration.
};

export type Out =
  | { kind: "json"; status: number; body: unknown }
  | { kind: "redirect"; location: string };

const ABI = [
  { type: "function", name: "passportHash", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "funded", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "bool" }] },
  {
    type: "function", name: "rolloverDigest", stateMutability: "view",
    inputs: [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function", name: "getLease", stateMutability: "view", inputs: [{ type: "uint256" }],
    outputs: [{
      type: "tuple", components: [
        { name: "tenant", type: "address" }, { name: "landlord", type: "address" }, { name: "leaseHash", type: "bytes32" },
        { name: "deposit", type: "uint256" }, { name: "startTime", type: "uint256" }, { name: "endTime", type: "uint256" },
        { name: "claimDeadline", type: "uint256" }, { name: "claimedAmount", type: "uint256" }, { name: "status", type: "uint8" },
        { name: "disputeResolved", type: "bool" }, { name: "resolvedTenantAmount", type: "uint256" },
        { name: "resolvedLandlordAmount", type: "uint256" }, { name: "claimEvidenceHash", type: "bytes32" },
      ],
    }],
  },
] as const;

const b64u = (b: Buffer) => b.toString("base64url");
const now = () => Math.floor(Date.now() / 1000);

// ---- encrypted, stateless attempt (works on serverless; the PKCE verifier never appears in clear in a URL)
const key = (cfg: Cfg) => createHash("sha256").update(cfg.stateSecret).digest();
export function seal(cfg: Cfg, obj: unknown): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(cfg), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return b64u(Buffer.concat([iv, c.getAuthTag(), ct]));
}
export function unseal<T>(cfg: Cfg, s: string): T | null {
  try {
    const raw = Buffer.from(s, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(cfg), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

type Attempt = { tenant: Hex; oldId: string; newId: string; nonce: string; verifier: string; startedAt: number; exp: number };

const discoveryCache = new Map<string, any>();
async function discovery(cfg: Cfg) {
  const url = `${cfg.issuer}/.well-known/openid-configuration`;
  if (!discoveryCache.has(url)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`discovery ${r.status}`);
    discoveryCache.set(url, await r.json());
  }
  return discoveryCache.get(url);
}

const chain = (cfg: Cfg) => createPublicClient({ transport: http(cfg.rpcUrl) });
const fail = (status: number, error: string): Out => ({ kind: "json", status, body: { ok: false, error } });
const back = (cfg: Cfg, params: Record<string, string>): Out => ({
  kind: "redirect",
  location: `${cfg.appUrl}/passport#${new URLSearchParams(params).toString()}`,
});

/** Step 1. Called by the browser with ?tenant=&oldId=&newId= */
export async function start(cfg: Cfg, q: Record<string, string | undefined>): Promise<Out> {
  const { tenant, oldId, newId } = q;
  if (!tenant || !isAddress(tenant) || !/^\d{1,18}$/.test(oldId ?? "") || !/^\d{1,18}$/.test(newId ?? "")) {
    return fail(400, "bad_request");
  }
  // Refuse early (and never open World) when the rollover could not succeed anyway.
  const c = chain(cfg);
  const read = (fn: any, args: any[]) => c.readContract({ address: cfg.vault, abi: ABI, functionName: fn, args } as any);
  try {
    const [passport, oldLease, newLease, isFunded] = await Promise.all([
      read("passportHash", [BigInt(oldId!)]), read("getLease", [BigInt(oldId!)]),
      read("getLease", [BigInt(newId!)]), read("funded", [BigInt(newId!)]),
    ]) as [Hex, { tenant: string }, { tenant: string }, boolean];
    if (/^0x0+$/.test(passport)) return fail(409, "no_passport_recorded");
    if (oldLease.tenant.toLowerCase() !== tenant.toLowerCase() || newLease.tenant.toLowerCase() !== tenant.toLowerCase())
      return fail(403, "not_your_tenancy");
    if (isFunded) return fail(409, "new_tenancy_already_funded");
  } catch {
    return fail(502, "chain_unreachable");
  }

  const verifier = b64u(randomBytes(32));
  const nonce = b64u(randomBytes(16));
  const t = now();
  const attempt: Attempt = { tenant: tenant as Hex, oldId: oldId!, newId: newId!, nonce, verifier, startedAt: t, exp: t + (cfg.attemptTtlSec ?? 600) };
  if (cfg.mock) {
    const m = new URL(`${cfg.appUrl}/api/world-mock`);
    m.searchParams.set("state", seal(cfg, attempt));
    return { kind: "json", status: 200, body: { ok: true, url: m.toString(), mock: true } };
  }
  const d = await discovery(cfg);
  const u = new URL(d.authorization_endpoint);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", cfg.clientId);
  u.searchParams.set("redirect_uri", `${cfg.appUrl}/api/world-callback`);
  u.searchParams.set("scope", "openid");
  u.searchParams.set("state", seal(cfg, attempt));
  u.searchParams.set("nonce", nonce);
  u.searchParams.set("code_challenge", b64u(createHash("sha256").update(verifier).digest()));
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("max_age", "0"); // fresh authentication for this transaction
  u.searchParams.set("prompt", "login");
  if (cfg.acr.length) u.searchParams.set("claims", JSON.stringify({ id_token: { acr: { essential: true, values: cfg.acr } } }));
  return { kind: "json", status: 200, body: { ok: true, url: u.toString() } };
}

/** Step 3. World redirects the browser here with ?code=&state= (or ?error=). */
export async function callback(cfg: Cfg, q: Record<string, string | undefined>): Promise<Out> {
  const a = q.state ? unseal<Attempt>(cfg, q.state) : null;
  if (!a) return back(cfg, { world_error: "invalid_state" });
  if (now() > a.exp) return back(cfg, { world_error: "attempt_expired" });
  if (q.error) return back(cfg, { world_error: q.error }); // access_denied, login_required, ... -> no approval
  if (!q.code) return back(cfg, { world_error: "no_code" });

  let claims: Record<string, any> = {};
  if (cfg.mock && q.code === "mock") {
    // DEMO ONLY. The stand-in page stands for World; no identity is validated. Falls through to signing.
  } else try {
    const d = await discovery(cfg);
    const tok = await fetch(d.token_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: "Basic " + Buffer.from(`${encodeURIComponent(cfg.clientId)}:${encodeURIComponent(cfg.clientSecret)}`).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code", code: q.code,
        redirect_uri: `${cfg.appUrl}/api/world-callback`, code_verifier: a.verifier,
      }),
    });
    if (!tok.ok) return back(cfg, { world_error: "token_exchange_failed" });
    const { id_token } = (await tok.json()) as { id_token?: string };
    if (!id_token) return back(cfg, { world_error: "no_id_token" });
    const { payload } = await jwtVerify(id_token, createRemoteJWKSet(new URL(d.jwks_uri)), {
      issuer: d.issuer ?? cfg.issuer, audience: cfg.clientId, algorithms: ["RS256"], clockTolerance: 30,
    });
    claims = payload as Record<string, any>;
  } catch {
    return back(cfg, { world_error: "id_token_invalid" });
  }

  const isMock = !!cfg.mock && q.code === "mock";
  if (!isMock) {
    if (claims.nonce !== a.nonce) return back(cfg, { world_error: "nonce_mismatch" });
    if (typeof claims.sub !== "string" || !claims.sub) return back(cfg, { world_error: "no_subject" });
    // max_age=0: the authentication must belong to THIS attempt (began after it started, not in the future).
    const authTime = Number(claims.auth_time);
    if (!Number.isFinite(authTime) || authTime < a.startedAt - 30 || authTime > now() + 30) return back(cfg, { world_error: "not_fresh" });
    if (cfg.acr.length && !cfg.acr.includes(String(claims.acr))) return back(cfg, { world_error: "assurance_too_low" });
  }

  // Every check passed: build and sign the approval.
  try {
    const nonce = BigInt("0x" + randomBytes(16).toString("hex"));
    const deadline = BigInt(now() + (cfg.approvalTtlSec ?? 600));
    const digest = (await chain(cfg).readContract({
      address: cfg.vault, abi: ABI, functionName: "rolloverDigest",
      args: [a.tenant, BigInt(a.oldId), BigInt(a.newId), nonce, deadline],
    })) as Hex;
    const sig = serializeSignature(await sign({ hash: digest, privateKey: cfg.approverKey }));
    return back(cfg, { approval: sig, old: a.oldId, new: a.newId, nonce: nonce.toString(), deadline: deadline.toString(), tenant: a.tenant, ...(isMock ? { mock: "1" } : {}) });
  } catch {
    return back(cfg, { world_error: "signing_failed" });
  }
}

export const approverAddress = (cfg: Cfg) => privateKeyToAccount(cfg.approverKey).address;

export function cfgFromEnv(env: Record<string, string | undefined>): Cfg {
  const need = (k: string) => { const v = env[k]; if (!v) throw new Error(`missing env ${k}`); return v; };
  return {
    issuer: env.WORLD_ISSUER ?? "https://auth.world.org",
    clientId: env.WORLD_MOCK === "1" ? (env.WORLD_CLIENT_ID ?? "mock") : need("WORLD_CLIENT_ID"),
    clientSecret: env.WORLD_MOCK === "1" ? (env.WORLD_CLIENT_SECRET ?? "mock") : need("WORLD_CLIENT_SECRET"),
    appUrl: need("APP_URL").replace(/\/$/, ""), stateSecret: need("STATE_SECRET"),
    approverKey: need("APPROVER_PRIVATE_KEY") as Hex, rpcUrl: env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
    vault: need("VAULT_V2_ADDRESS") as Hex,
    mock: env.WORLD_MOCK === "1",
    acr: (env.WORLD_ACR ?? "https://world.org/oidc/acr/orb,https://world.org/oidc/acr/selfie").split(",").map((s) => s.trim()).filter(Boolean),
  };
}
