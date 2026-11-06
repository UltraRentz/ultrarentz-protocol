// Runnable query for judges: reads the passport for a tenancy from Arkiv and re-hashes it.
//   TENANCY_ID=1 ARKIV_ACCESS_KEY=... npx tsx scripts/arkiv-read.ts
import { readPassport } from "../src/lib/arkivPassport";
const id = process.env.TENANCY_ID ?? "1";
const r = await readPassport(process.env.ARKIV_ACCESS_KEY ?? "", id);
if (!r) {
  console.log(`No passport found on Arkiv for tenancy ${id} (it may have expired).`);
  process.exit(1);
}
console.log(JSON.stringify({ entityKey: r.entityKey, storedHash: r.storedHash, recomputedHash: r.recomputedHash, match: r.storedHash === r.recomputedHash, bundle: r.bundle }, null, 2));
