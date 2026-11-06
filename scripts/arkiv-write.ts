// Writes the evidence + passport records for one tenancy to Arkiv (Rabdi testnet).
// Usage:
//   TENANCY_ID=1 TENANT=0x... ARKIV_WRITER_KEY=0x... ARKIV_ACCESS_KEY=... npx tsx scripts/arkiv-write.ts
//   DRY=1 ... prints the hash only, no network call (no key needed).
// Optional: DOCS=path1,path2 fingerprints real files (sha256); otherwise two labelled demo placeholders.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename } from "node:path";
import type { Hex } from "viem";
import { hashBundle, writeRecord, type EvidenceBundle } from "../src/lib/arkivPassport";

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var ${k}`);
  return v;
};

const tenancyId = need("TENANCY_ID");
const tenant = need("TENANT") as Hex;
const sha = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

const documents = process.env.DOCS
  ? process.env.DOCS.split(",").map((p) => ({ name: basename(p), sha256: sha(readFileSync(p)) }))
  : [
      { name: "demo-check-in-report.txt", sha256: sha("demo check-in report, placeholder") },
      { name: "demo-check-out-report.txt", sha256: sha("demo check-out report, placeholder") },
    ];

const bundle: EvidenceBundle = {
  tenancyId,
  tenant,
  summary: "Tenancy ended; check-out inspection clean; landlord made no claim in the claim period.",
  documents,
  claims: [],
  createdAt: new Date().toISOString(),
};

const recordHash = hashBundle(bundle);

if (process.env.DRY) {
  console.log(JSON.stringify({ dry: true, recordHash }));
  process.exit(0);
}

const key = need("ARKIV_WRITER_KEY") as Hex;
const access = process.env.ARKIV_ACCESS_KEY ?? "";
const days = Number(process.env.EXPIRY_DAYS ?? 30);

const ev = await writeRecord(key, access, "evidence", bundle, days);
const pass = await writeRecord(key, access, "passport", bundle, days);
const out = {
  writer: pass.writer,
  tenancyId,
  recordHash,
  evidenceEntityKey: ev.entityKey,
  passportEntityKey: pass.entityKey,
  expiresInDays: days,
  writtenAt: new Date().toISOString(),
};
mkdirSync("arkiv", { recursive: true });
writeFileSync(`arkiv/write-${tenancyId}.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
