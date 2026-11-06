# World ID Agent Pass: integration debrief

**What we protect.** Rolling a rent deposit over to a new tenancy moves a tenant's deposit between contracts. The action is gated on a real person confirming it. Our backend validates the result and only then signs an EIP-712 approval; the vault contract rejects any rollover without that signature.

**Flow (OIDC step-up, per `auth.world.org/docs/guides/step-up`).**
1. `/api/world-start` checks on Arc that a passport exists and the wallet is the tenant, then builds the authorize URL (PKCE S256, `max_age=0`, `prompt=login`, essential `acr`, nonce, encrypted one-time state).
2. The person completes the check at World.
3. `/api/world-callback` validates `state`, redeems the code once, verifies the ID token (RS256 signature from the issuer's JWKS, issuer, audience, nonce, `auth_time` fresh for this attempt, `acr` in the accepted list) and signs the approval only if everything passes. Secrets stay on the server.

**Denied, expired and failed paths (tested, 17 automated checks against a mock identity provider and a local chain).** Denied by the person, expired attempt, tampered state, token endpoint refusal, wrong nonce, stale authentication, insufficient credential, ID token signed by another key, ID token for another audience: in every case no approval is issued and nothing moves. A valid approval is useless to a different wallet and cannot be replayed.

**Time to first success.** `<fill in after the live run: minutes from account creation to the first real approved rollover>`

**Friction found while reading the docs (5 Nov 2026).**
- The prize page says "Agent Pass", but the docs are under "World ID for authentication" with no page titled Agent Pass; it took several pages (overview, getting-started, step-up, app-registration) to find the flow.
- The step-up page shows two forms for the same `claims` request (`"value"` and `"values"`) without saying which is canonical.
- The token-endpoint call and `private_key_jwt` details are not on the step-up page; the page says to use the OIDC guide.
- Sandbox and test identities are only referenced (a link to the testing guide), and error codes for cancelled and expired outcomes are not listed.

**Missing capability / highest-impact improvement.** A minimal end-to-end example (server code, about 60 lines) of "human approves one specific action, backend verifies, action runs once", with the exact error codes for cancelled and expired.

**Honest limits.** Proofs in the sandbox use fake identities and must not be relied on in production. The approver key is a single hot key in this hackathon build. The assurance level accepted is set by configuration (`WORLD_ACR`); sandbox identities may need it relaxed for the demo, which will be stated here if used: `<fill in>`.
