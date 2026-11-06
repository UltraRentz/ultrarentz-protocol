# Friction (feedback for Arkiv)

Observed while integrating `@arkiv-network/sdk@1.0.1` on 5 November 2026. Reproducible steps for each.

1. **Old doc URLs return only a redirect notice.** Opening `https://docs.arkiv.network/start-here/installation/` and `https://docs.arkiv.network/typescript-sdk/querying-data/` returns "Redirecting from … to …" with no content for a non-browser fetch. Search engines still list the old URLs. *Fix:* serve a real HTTP 301, or keep a stub page with the content.
2. **Setup information is split across several pages.** The first-entity page has the install command, `rabdi()` and the faucet, but the RPC URL and chain id are on a separate "networks/rabdi" page, and client setup for reads is on another page ("Connect to Arkiv"). A new user needs three pages to do one write and one read. *Fix:* one quick-start with write + read + RPC + faucet.
3. **Expiry option naming differs between pages and search snippets.** Some results mention `expiresIn`; the current docs use `expiration: ExpirationTime.fromDays(n)`. *Reproduce:* search "Arkiv createEntity expiresIn". *Fix:* one name, with a note on the old one.
4. **Reading `bytes` attributes.** The docs show reading strings (`row.title.value`) but not what a `bytes()` attribute returns on read (hex string or `Uint8Array`). We handle both in `readPassport`. *Fix:* add a read example for `bytes()`.

**TO ADD AFTER THE LIVE RUN (founder to fill in from the real terminal output):**
- time from `npm install` to first successful write: `<minutes>`
- faucet and access-key steps: what worked / what did not
- any error messages, with the exact text and the command that produced them
