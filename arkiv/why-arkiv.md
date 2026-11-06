# Why Arkiv

**What the record is for.** A tenant who finishes a tenancy without a claim wants to move their rent deposit to the next tenancy. The next party (a new landlord, an agent, a scheme) needs to check that the "clean tenancy" record is real and has not been edited.

**What users would lose on Postgres (or any database we run):**
- *Trust in us.* With our own database the tenant has to believe that we did not edit a record. With Arkiv the record sits on a public data layer, and the fingerprint on Arc lets anyone re-hash it and compare. We cannot quietly change history, and the tenant does not have to trust our server being online or honest.
- *Portability.* The record does not die with our company. A tenant, a landlord or a regulator can read it with a public query (`scripts/arkiv-read.ts`) without our API.
- *Built-in expiry.* Arkiv entities expire by design. For personal data this is a feature: records disappear by default instead of piling up in a table nobody cleans.
- *Owner-only edits.* Only the writing address can change an entity, which is exactly the property a dispute record needs.

**What Arkiv enables that the original source (our Arc contract) does not.** Arc stores a 32-byte fingerprint cheaply but cannot hold the evidence itself. Arkiv holds the readable bundle with queryable fields (`tenancyId`, `tenant`, `kind`), and the Verify button joins the two: read from Arkiv, re-hash, compare to Arc.

**Honest limit.** The bundle is public. We therefore store fingerprints and a short summary, never the documents themselves. Before real use, a privacy review of what a public record may contain is required.
