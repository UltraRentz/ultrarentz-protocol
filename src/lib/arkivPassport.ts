// Deposit Passport records on Arkiv (Rabdi testnet).
// Written during ETHGlobal Mumbai 2026. Shared by the browser app and scripts/arkiv-write.ts.
import { createPublicClient, createWalletClient, ExpirationTime } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { addr, bytes, defineSchema, str } from "@arkiv-network/sdk/schema";
import { bytesToString, hexToString, http, keccak256, stringToBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/** One entity type for both kinds of record: kind = "evidence" | "passport". */
export const PassportRecord = defineSchema("ultrarentz-xrent.record", {
  tenancyId: str().indexed(), // the on-chain tenancy id (leaseId in the contract), as a string
  tenant: addr().indexed(), // tenant wallet
  kind: str().indexed(), // "evidence" or "passport"
  recordHash: str().indexed(), // keccak256 of the canonical bundle JSON (what Arc stores)
  bundle: bytes(), // canonical JSON bundle
});

export type EvidenceBundle = {
  tenancyId: string;
  tenant: Hex;
  summary: string; // e.g. "Move-out inspection clean, no claim by landlord"
  documents: { name: string; sha256: string }[]; // fingerprints of check-in/out reports, photos
  claims: { amountUsdc: string; status: string }[]; // empty when clean
  createdAt: string; // ISO date
};

/** Stable JSON: keys sorted, no spaces, so the same data always gives the same hash. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export const hashBundle = (b: unknown): Hex => keccak256(stringToBytes(canonicalJson(b)));

export function publicClientFor(accessKey = "") {
  return createPublicClient({ chain: rabdi({ accessKey }), transport: http() });
}

/** Write a record (script/server side; needs a funded tGLM key). Expires after `days`. */
export async function writeRecord(
  privateKey: Hex,
  accessKey: string,
  kind: "evidence" | "passport",
  bundle: EvidenceBundle,
  days = 30,
) {
  const account = privateKeyToAccount(privateKey);
  const wallet = createWalletClient({ chain: rabdi({ accessKey }), transport: http(), account });
  const recordHash = hashBundle(bundle);
  const { entityKey } = await wallet.createEntity(
    PassportRecord,
    {
      tenancyId: bundle.tenancyId,
      tenant: addr(bundle.tenant),
      kind,
      recordHash,
      bundle: stringToBytes(canonicalJson(bundle)),
    },
    { expiration: ExpirationTime.fromDays(days) },
  );
  return { entityKey, recordHash, writer: account.address };
}

/** Read the latest passport record for a tenancy straight from Arkiv, and re-hash it. */
export async function readPassport(accessKey: string, tenancyId: string) {
  const client = publicClientFor(accessKey);
  const { entities } = await client
    .select({ $key: true, tenancyId: true, tenant: true, kind: true, recordHash: true, bundle: true })
    .from(PassportRecord)
    .where(eq("tenancyId", tenancyId))
    .fetch();
  const rows = entities.filter((r) => r.kind.value === "passport");
  const row = rows[rows.length - 1];
  if (!row) return null;
  const raw = row.bundle.value as unknown;
  // Arkiv returns `bytes` attributes as a 0x-hex string (confirmed on Rabdi, 6 Nov 2026).
  let json =
    typeof raw === "string"
      ? raw.startsWith("0x") ? hexToString(raw as Hex) : raw
      : bytesToString(raw as Uint8Array);
  // In the browser the SDK can hand back the hex TEXT as bytes, so decode a second time if it still looks like hex.
  if (/^0x[0-9a-fA-F]+$/.test(json)) json = hexToString(json as Hex);
  return {
    entityKey: row.$key as Hex,
    storedHash: row.recordHash.value as string,
    recomputedHash: keccak256(stringToBytes(json)) as Hex, // re-hash what Arkiv returned
    bundle: JSON.parse(json) as EvidenceBundle,
    json,
  };
}
