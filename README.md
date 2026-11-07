# UltraRentz: Deposit Passport

**A rent deposit that earns interest while it is held, and a verifiable record that follows the tenant to their next home.**

Built solo at ETHGlobal Mumbai 2026, Continuity track. Practice money on testnet only. No real money is used anywhere.

- Live demo: https://ultrarentz-protocol.vercel.app/ (student demo) and https://ultrarentz-protocol.vercel.app/passport (Deposit Passport)
- Demo video: `<VIDEO_LINK>`
- Arc Studio project: `<STUDIO_LINK>`

---

## The problem

A tenant pays a rent deposit, typically about five weeks of rent. It sits idle for the length of the tenancy, earns the tenant nothing, and is often hard to get back. When the tenant moves, their good history with the old landlord is not portable: the new landlord asks for a fresh deposit and a fresh reference, and the tenant starts from zero.

## The evidence

Figures below come from the articles linked, with their dates. Where a number comes from a campaign group's research, it is an estimate, not an official statistic.

- **England and Wales:** £5.37bn is held in protected deposits. Renters get about £17m a year in interest today, against an estimated £169m if the money earned market rates. 22% of renters in a survey of 2,000 report unfair deductions, but only 4% used the formal dispute process. The same group estimates that moving a deposit from one tenancy to the next ("deposit passporting") would cut upfront moving costs by £817 on average. Source: Generation Rent press releases of [25 Jul 2025](https://www.generationrent.org/2025/07/25/), [21 Jul 2025](https://www.generationrent.org/2025/07/21/flaws-in-deposit-protection-cost-1-in-5-private-renters-hundreds-of-pounds-press-release/) and [24 Sep 2026](https://www.generationrent.org/2026/09/24/) (the 17,000-signature petition).
- **England and Wales (survey):** 38.2% of 860 tenants did not know they can formally challenge a deduction. Source: LRG study via [Landlord Today, 28 Oct 2026](https://www.landlordtoday.co.uk/breaking-news/2026/10/many-tenants-ignorant-about-deposit-reductions/).
- **India:** ₹1.26 lakh crore is locked in rental security deposits across six metros, including ₹41,156 crore in Mumbai-MMR. Source: [Business Today, 8 Sep 2026](https://www.businesstoday.in/personal-finance/story/rs1-26-lakh-crore-in-rental-deposits-how-verified-data-could-transform-indias-housing-market-553799-2026-09-08). India Today (16 Jul 2026) reported over ₹1 lakh crore tied up, often 3 to 10 months of advance rent.
- **Netherlands:** more than 200 Amsterdam tenants reported not getting a full deposit back in a year. Source: !WOON via [NL Times, 10 Mar 2026](https://nltimes.nl/2026/03/10/tenants-increasingly-struggle-recover-deposits-rental-rights-group-warns) and [IamExpat, 11 Mar 2026](https://www.iamexpat.nl/housing/property-news/international-tenants-more-likely-lose-rental-deposits-netherlands).
- **Ireland:** the housing charity Threshold says thousands of renters have lost their deposit unfairly. Source: [Threshold](https://threshold.ie/deposit-unfairly-retained-across-ireland/).

## What UltraRentz does

1. **The deposit earns interest.** The tenant's deposit is held in a smart contract on Arc. Interest accrues to the tenant (simple interest, 5% a year in the demo, paid from a funded reserve).
2. **It comes back automatically.** On the end date, with no claim from the landlord during the claim period, the deposit and interest are released without chasing anyone.
3. **A clean tenancy becomes a Deposit Passport.** A tenancy that ended with no claim is recorded: the evidence is written to Arkiv, and its fingerprint (hash) is recorded on Arc.
4. **The passport moves the deposit.** For the next tenancy, the tenant can roll the deposit over from the old tenancy to the new one. A real person must confirm first (World ID step), and the contract refuses the rollover without the backend's signed approval.

## What existed before the hackathon, and what was built here

Full detail in [`docs/PRE_EXISTING.md`](docs/PRE_EXISTING.md).

| Before (tag `pre-hackathon`) | Built at the hackathon |
|---|---|
| Baseline rent deposit vault: tenancy creation, funding, yield accrual, release, dispute path | `RentDepositVaultV2`: funding guard, `recordCleanTenancy`, EIP-712 approved `rollover`, approver key, 37 tests |
| Student demo screens (practice money) | Deposit Passport page (`/passport`) |
| | Arkiv evidence and passport records (write, read, re-hash, tamper test) |
| | World ID step-up backend (`/api/world-start`, `/api/world-callback`) |
| | Deployment and setup scripts for Arc testnet |

A diff of the contract against the baseline is in [`docs/V2_vs_baseline.diff`](docs/V2_vs_baseline.diff).

## Architecture

```
 Tenant wallet (MetaMask)
        |
        v
 React app (Vercel) ----------------> Arkiv (evidence + passport records)
        |                                     ^
        | 1. read passport, re-hash           | write (founder-owned writer key)
        |    compare Arkiv hash == Arc hash   |
        v                                     |
 /api/world-start  --> checks on Arc: passport exists, wallet is the tenant
        |
        v
 World (OIDC step-up: fresh sign-in, PKCE)   [MOCK stand-in in this demo, see below]
        |
        v
 /api/world-callback --> validates result, signs EIP-712 approval (server-side key)
        |
        v
 RentDepositVaultV2 on Arc testnet  <-- tenant submits rollover(approval); replay and wrong wallet fail
```

## Partner integrations

### Arc (Circle)

- Contract `RentDepositVaultV2` deployed on Arc testnet: `0xa79059db1cD0f5220959B484B89993b04b0E7578`
- Uses native USDC (also the gas token) at `0x3600000000000000000000000000000000000000`.
- Built and deployed with Foundry; the deployment record is in `docs/PRE_EXISTING.md`.
- Arc Studio was used for `<what you used Studio for>`.

### Arkiv

Evidence and the passport summary are stored as Arkiv entities with indexed attributes, so any party can look up a tenancy's record and re-check it against the hash on Arc.

- Writer addresses (owners of the records): `0x86ac2901a4b258CF149dcD5De16DC8aE274d8FAb` wrote the live demo records (tenancy 3); `0xdC7e6995Be5810e8B308D602816C9c7837F0600A` wrote the earlier records (tenancy 1).
- Runnable query (no access key needed in our tests):

```bash
npm install
TENANCY_ID=3 npx tsx scripts/arkiv-read.ts
```

The script reads the passport for tenancy 3 from Arkiv, recomputes `keccak256` of the stored JSON, and compares it with the hash recorded on Arc.

- Records expire after 30 days by design (they are personal data about a tenancy).
- Submission files: [`arkiv/schema.md`](arkiv/schema.md), [`arkiv/friction.md`](arkiv/friction.md), [`arkiv/reach.md`](arkiv/reach.md), [`arkiv/why-arkiv.md`](arkiv/why-arkiv.md), [`arkiv/how-you-use-arkiv.md`](arkiv/how-you-use-arkiv.md).

### World ID (Agent Pass)

The rollover is gated on a person confirming. The backend implements the OIDC step-up flow (PKCE S256, fresh sign-in with `max_age=0`, essential `acr`, nonce, validation of the ID token) and signs an EIP-712 approval only after every check passes. The denied, expired and tampered paths issue no approval.

**Honest status.** The World portal first returned `account_not_eligible` for a Gmail account; it needs a Google account on its own domain. After registering the app with a company-domain account (accepted level: any account), the sandbox app could not issue a test World ID: “v4 protocol and credential issuance must both be enabled for this account”, a setting only World can enable. The real flow is implemented and tested against a local stand-in identity provider (22 checks), and our server builds a valid World authorize request, but a real sign-in has **not** completed against World's live service. For the demo, the backend has a clearly labelled **MOCK human check** (`WORLD_MOCK=1`). The mock page and the Passport page both say MOCK on screen. It is not the official World ID integration and should not be judged as one. Details: [`docs/WORLD_DEBRIEF.md`](docs/WORLD_DEBRIEF.md).

## What is real and what is not

- **Real:** the contract, the Arc deployment, the Arkiv records, the hash comparison, the signed approval and the on-chain rollover.
- **Practice money:** all USDC is testnet money.
- **Backdated demo tenancy:** to show visible interest in a short demo, the old tenancy (#1) was created with a start date 180 days in the past and an end date two minutes ahead. The contract accepts any dates; this is a demo setup, not a real tenancy.
- **Simulation:** the student demo's fast-forward is an illustration of simple interest, not a promise of any return.
- **Mock human check:** see above.
- **Not production:** a single hot approver key signs approvals in this build. Unaudited. UK law requires tenancy deposits to be held in a government-approved scheme, so the UK is a practice market only.

## Run it

```bash
npm install
cp .env.example .env     # fill in; never commit .env
npm run dev
```

Contract tests:

```bash
forge test
```

Environment variables (server): `ARC_RPC_URL`, `VAULT_V2_ADDRESS`, `APP_URL`, `STATE_SECRET`, `APPROVER_PRIVATE_KEY`, and either `WORLD_MOCK=1` or `WORLD_CLIENT_ID` and `WORLD_CLIENT_SECRET`. Client: `VITE_VAULT_V2_ADDRESS`, `VITE_ARKIV_ACCESS_KEY`, `VITE_DEMO_OLD_ID`, `VITE_DEMO_NEW_ID`.

## Demo data

The live demo uses tenancy **3** (clean, its record on Arkiv and its hash on Arc) and tenancy **4** (unfunded, the rollover target). Tenancies 1 and 2 show an earlier completed rollover: [transaction on Arc testnet](https://testnet.arcscan.app/tx/0x1c5bfeed065e1557b06a58d202d16c14305cc647514b4c6193f0b55aff6e1ba0).

## Roadmap

- Replace the mock with the live World ID flow once credentials are enabled.
- Approver key in a managed signer.
- A real-money pilot with a licensed deposit partner in a market where it is permitted (Ireland is the candidate; unverified).

## Author

Adegbenga (Ben) Ogungbeje, solo.
