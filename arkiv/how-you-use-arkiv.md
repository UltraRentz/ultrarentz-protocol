# How we use Arkiv

**Writes** (`scripts/arkiv-write.ts`, `src/lib/arkivPassport.ts`): when the agent confirms a tenancy ended clean, we write two entities: the `evidence` bundle and the `passport` record. The `recordHash` is then stored on Arc via `recordCleanTenancy`.

**Reads that change what the user sees** (`src/pages/Passport.tsx`, step 1 "Verify from Arkiv"):
1. The page queries Arkiv for `tenancyId`, filtered to `kind = passport`.
2. It re-hashes the returned bundle in the browser.
3. It compares three values: the hash stored on the Arkiv entity, the re-computed hash, and the hash on Arc.
4. The result is shown to the user: "Match", or "MISMATCH". The **Tamper test** button changes one field and shows the hash no longer matches.
5. Step 3 (roll over the deposit) is only meaningful because step 1 can prove the record. If the record is missing (for example expired), the page says so.

**Filters:** equality on `tenancyId` (indexed). `tenant` and `kind` are indexed as well for the dashboards a landlord or agent would need.

**Edit permissions:** the writer address owns the entities. The tenant cannot edit their own evidence, and neither can we after the fact without changing the hash that Arc holds.

**Expiration:** 30 days by default, because the data is personal. A longer lifetime would be a product decision after a privacy review.

**Runnable query for judges:**
```
TENANCY_ID=3 npx tsx scripts/arkiv-read.ts   # an access key (ARKIV_ACCESS_KEY) is optional; reads worked without one
```
Prints the entity key, stored hash, re-computed hash and whether they match.
