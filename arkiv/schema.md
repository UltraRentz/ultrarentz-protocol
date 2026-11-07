# Arkiv schema

Namespace: `ultrarentz-xrent.record` (defined in `src/lib/arkivPassport.ts`). One entity type, two kinds of record.

| Field | Type | Indexed | Meaning |
|---|---|---|---|
| `tenancyId` | string | yes | The on-chain tenancy id on Arc (vault `RentDepositVaultV2`). This is the main query filter. |
| `tenant` | address | yes | The tenant the record is about. |
| `kind` | string | yes | `evidence` (the evidence bundle) or `passport` (the clean-tenancy summary that Arc fingerprints). |
| `recordHash` | string | yes | `keccak256` of the canonical JSON in `bundle`. This is the value stored on Arc by `recordCleanTenancy`. |
| `bundle` | bytes | no | Canonical JSON: sorted keys, no spaces. Holds the summary, document fingerprints (sha256), claims and a timestamp. |

**Owner:** the writer address that created it. Records for tenancy 3 (the live demo) were written by `0x86ac2901a4b258CF149dcD5De16DC8aE274d8FAb`; the earlier records for tenancy 1 were written by `0xdC7e6995Be5810e8B308D602816C9c7837F0600A`. Only the owner can change or delete an entity.

**Expiration:** 30 days from the write (`ExpirationTime.fromDays(30)`, set with `EXPIRY_DAYS`). Records are personal data about a tenancy, so they should not live forever by default. A passport that expires simply stops verifying; the hash on Arc remains.

**Queried fields:** `tenancyId` (equality), then `kind` is filtered to `passport` in the app. See the query in the README.

**No personal documents are stored.** Only SHA-256 fingerprints of documents and a short text summary. Arkiv entities are public.
