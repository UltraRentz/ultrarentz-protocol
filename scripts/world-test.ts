// Offline test of the World backend against a mock identity provider and a local chain (anvil).
import http from "node:http";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { callback, start, type Cfg, type Out } from "../api/_lib/world";

const [USDC, VAULT] = readFileSync("/tmp/anvil_addrs.txt", "utf8").trim().split(" ");
const K0 = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // approver on the test vault
const K1 = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"; // tenant
const T = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const OLD = process.env.OLD_ID ?? "3", NEW = process.env.NEW_ID ?? "4";
const RPC = "http://127.0.0.1:8545";

const good = await generateKeyPair("RS256");
const evil = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(good.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
let nextToken: () => Promise<{ status: number; body: any }> = async () => ({ status: 500, body: {} });
const srv = http.createServer(async (req, res) => {
  const base = `http://127.0.0.1:${(srv.address() as any).port}`;
  const send = (s: number, b: unknown) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(b)); };
  if (req.url!.startsWith("/.well-known/openid-configuration"))
    return send(200, { issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`, jwks_uri: `${base}/jwks` });
  if (req.url === "/jwks") return send(200, { keys: [jwk] });
  if (req.url === "/token") { const r = await nextToken(); return send(r.status, r.body); }
  send(404, {});
});
await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
const issuer = `http://127.0.0.1:${(srv.address() as any).port}`;
const cfg: Cfg = {
  issuer, clientId: "cid", clientSecret: "secret", appUrl: "https://app.test", stateSecret: "x".repeat(40),
  approverKey: K0 as any, rpcUrl: RPC, vault: VAULT as any,
  acr: ["https://world.org/oidc/acr/orb", "https://world.org/oidc/acr/selfie"],
};

let pass = 0, failN = 0;
const ok = (name: string, cond: boolean, extra = "") => { cond ? pass++ : failN++; console.log(`${cond ? "PASS" : "FAIL"}  ${name} ${cond ? "" : extra}`); };
const frag = (o: Out) => (o.kind === "redirect" ? new URLSearchParams(o.location.split("#")[1] ?? "") : new URLSearchParams());

async function attempt(c: Cfg = cfg, tenant = T, o = OLD, n = NEW) {
  const s = await start(c, { tenant, oldId: o, newId: n });
  if (s.kind !== "json" || !(s.body as any).ok) return { s, state: "", nonce: "" };
  const u = new URL((s.body as any).url);
  return { s, state: u.searchParams.get("state")!, nonce: u.searchParams.get("nonce")!, u };
}
const idToken = (claims: Record<string, unknown>, key = good.privateKey, aud = "cid") =>
  new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(issuer).setAudience(aud).setSubject("pairwise-sub-123").setIssuedAt().setExpirationTime("5m").sign(key);
const tokenReturns = (build: () => Promise<string>) => { nextToken = async () => ({ status: 200, body: { id_token: await build() } }); };
const nowS = () => Math.floor(Date.now() / 1000);

// --- start() checks
{
  const a = await attempt();
  ok("start: authorize URL has PKCE S256, max_age=0, claims, nonce, encrypted state",
    !!a.u && a.u.searchParams.get("code_challenge_method") === "S256" && a.u.searchParams.get("max_age") === "0" &&
    a.u.searchParams.get("claims")!.includes("essential") && !!a.nonce && !a.state.includes("."),
    JSON.stringify((a.s as any).body));
  const np = await attempt(cfg, T, "2", NEW);
  ok("start: refuses when no passport is recorded", (np.s as any).body?.error === "no_passport_recorded", JSON.stringify((np.s as any).body));
  const wt = await attempt(cfg, "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
  ok("start: refuses a wallet that is not the tenant", (wt.s as any).body?.error === "not_your_tenancy", JSON.stringify((wt.s as any).body));
  const bad = await start(cfg, { tenant: "nope", oldId: "x", newId: "1" });
  ok("start: rejects malformed input", (bad as any).status === 400);
}
// --- denied / failure paths: none may produce an approval
const noApproval = (o: Out) => !frag(o).has("approval");
{
  const a = await attempt();
  const o = await callback(cfg, { state: a.state, error: "access_denied" });
  ok("denied by user -> world_error, no approval", frag(o).get("world_error") === "access_denied" && noApproval(o));
}
{
  const a = await attempt();
  const mid = Math.floor(a.state.length / 2);
  const flipped = a.state.slice(0, mid) + (a.state[mid] === "A" ? "B" : "A") + a.state.slice(mid + 1);
  const o = await callback(cfg, { state: flipped, code: "c" });
  ok("tampered state -> invalid_state, no approval", frag(o).get("world_error") === "invalid_state" && noApproval(o));
}
{
  const a = await attempt({ ...cfg, attemptTtlSec: -5 });
  const o = await callback(cfg, { state: a.state, code: "c" });
  ok("expired attempt -> attempt_expired, no approval", frag(o).get("world_error") === "attempt_expired" && noApproval(o));
}
{
  const a = await attempt();
  nextToken = async () => ({ status: 400, body: { error: "invalid_grant" } });
  const o = await callback(cfg, { state: a.state, code: "c" });
  ok("token endpoint refuses code -> token_exchange_failed", frag(o).get("world_error") === "token_exchange_failed" && noApproval(o));
}
{
  const a = await attempt();
  tokenReturns(() => idToken({ nonce: "WRONG", auth_time: nowS(), acr: "https://world.org/oidc/acr/orb" }));
  const o = await callback(cfg, { state: a.state, code: "c" });
  ok("nonce mismatch -> rejected", frag(o).get("world_error") === "nonce_mismatch" && noApproval(o));
}
{
  const a = await attempt();
  tokenReturns(() => idToken({ nonce: a.nonce, auth_time: nowS() - 3600, acr: "https://world.org/oidc/acr/orb" }));
  const o = await callback(cfg, { state: a.state, code: "c" });
  ok("stale auth_time (old login) -> not_fresh", frag(o).get("world_error") === "not_fresh" && noApproval(o));
}
{
  const a = await attempt();
  tokenReturns(() => idToken({ nonce: a.nonce, auth_time: nowS(), acr: "https://world.org/oidc/acr/passkey" }));
  const o = await callback(cfg, { state: a.state, code: "c" });
  ok("insufficient assurance (passkey) -> assurance_too_low", frag(o).get("world_error") === "assurance_too_low" && noApproval(o));
}
{
  const a = await attempt();
  tokenReturns(() => idToken({ nonce: a.nonce, auth_time: nowS(), acr: "https://world.org/oidc/acr/orb" }, evil.privateKey));
  const o = await callback(cfg, { state: a.state, code: "c" });
  ok("ID token signed by wrong key -> id_token_invalid", frag(o).get("world_error") === "id_token_invalid" && noApproval(o));
}
{
  const a = await attempt();
  tokenReturns(() => idToken({ nonce: a.nonce, auth_time: nowS(), acr: "https://world.org/oidc/acr/orb" }, good.privateKey, "someone-else"));
  const o = await callback(cfg, { state: a.state, code: "c" });
  ok("ID token for another audience -> id_token_invalid", frag(o).get("world_error") === "id_token_invalid" && noApproval(o));
}
// --- MOCK mode (demo stand-in): labelled, off by default, never skips the shared state/expiry checks
{
  const mcfg: Cfg = { ...cfg, mock: true };
  const a = await attempt(mcfg);
  ok("mock: start returns the /api/world-mock page and mock:true", (a.s as any).body?.mock === true && String((a.s as any).body?.url).startsWith("https://app.test/api/world-mock?state="), JSON.stringify((a.s as any).body));
  const state = new URL((a.s as any).body.url).searchParams.get("state")!;
  const off = await callback(cfg, { state, code: "mock" });
  ok("mock disabled: code=mock is rejected, no approval", noApproval(off));
  const dn = await callback(mcfg, { state, error: "access_denied" });
  ok("mock: Decline -> access_denied, no approval", frag(dn).get("world_error") === "access_denied" && noApproval(dn));
  const bad = await callback(mcfg, { state: state.slice(0, 10) + (state[10] === "A" ? "B" : "A") + state.slice(11), code: "mock" });
  ok("mock: tampered state -> no approval", noApproval(bad));
  const ap = await callback(mcfg, { state, code: "mock" });
  ok("mock: Approve -> approval issued and flagged mock=1", frag(ap).has("approval") && frag(ap).get("mock") === "1", ap.kind === "redirect" ? ap.location : "");
}
// --- success path, then use the approval on-chain
{
  const a = await attempt();
  tokenReturns(() => idToken({ nonce: a.nonce, auth_time: nowS(), acr: "https://world.org/oidc/acr/orb", amr: ["pop"] }));
  const o = await callback(cfg, { state: a.state, code: "c" });
  const f = frag(o);
  ok("valid human check -> approval issued", f.has("approval") && f.get("old") === OLD && f.get("new") === NEW, o.kind === "redirect" ? o.location : "");
  if (f.has("approval")) {
    const cast = (s: string) => execSync(`cast ${s} --rpc-url ${RPC}`, { encoding: "utf8" }).trim();
    // wrong wallet cannot use it
    let wrongWorks = true;
    try { cast(`send ${VAULT} "rollover(uint256,uint256,uint256,uint256,bytes)" ${OLD} ${NEW} ${f.get("deadline")} ${f.get("nonce")} ${f.get("approval")} --private-key ${K0}`); } catch { wrongWorks = false; }
    ok("approval is useless to a different wallet", !wrongWorks);
    const before = cast(`call ${USDC} "balanceOf(address)(uint256)" ${T}`);
    // new deposit is 1 USDC larger: the tenant approves the top-up first (the UI does this too)
    cast(`send ${USDC} "approve(address,uint256)" ${VAULT} 1000000 --private-key ${K1}`);
    cast(`send ${VAULT} "rollover(uint256,uint256,uint256,uint256,bytes)" ${OLD} ${NEW} ${f.get("deadline")} ${f.get("nonce")} ${f.get("approval")} --private-key ${K1}`);
    ok("tenant rolls the deposit over on-chain with the backend's signature", cast(`call ${VAULT} "funded(uint256)(bool)" ${NEW}`) === "true");
    console.log("   tenant USDC before/after:", before, "->", cast(`call ${USDC} "balanceOf(address)(uint256)" ${T}`));
    let replay = true;
    try { cast(`send ${VAULT} "rollover(uint256,uint256,uint256,uint256,bytes)" ${OLD} ${NEW} ${f.get("deadline")} ${f.get("nonce")} ${f.get("approval")} --private-key ${K1}`); } catch { replay = false; }
    ok("replaying the same approval fails", !replay);
  }
}
srv.close();
console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
