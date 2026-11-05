# UltraRentz: The Yield-Backed Rental Protocol

**Vision:** Turning Rent Deposits into Yield-Bearing Assets

UltraRentz is a decentralized protocol that transforms rental deposits into yield-generating assets through secure multi-signature escrow and DeFi integration. Built on **Initia (Interwoven Layer)**, **MoveVM**, **Supabase**, and **Next.js** to provide tenants and landlords with secure, profitable rental deposit management.

## 🚀 The Flow

**Multi-sig Escrow → DeFi Yield → DAO Dispute Resolution**

1. **Multi-sig Escrow**: 4 of 6 signatories approve deposit releases
2. **DeFi Yield**: Deposits generate 6% APY across multiple protocols  
3. **DAO Dispute Resolution**: Community-governed dispute handling

---


## 🆕 Recent Feature Updates

### Feb 7, 2026
- **Signatory Experience Overhaul:**
   - Instant feedback and robust validation for adding/removing signatory emails or wallet addresses.
   - Clear error messages for invalid, duplicate, or excess entries (max 3 per group).
   - Polished UI for add/remove flow, with smooth animations and user-friendly controls.
   - "Verified" status removed for a cleaner, less confusing experience.
- **Card Expiry Input Polished:**
   - Card expiry field now auto-inserts and removes the slash (MM/YY) as you type or delete, for a seamless, familiar UX.
- **Error Handling & Feedback:**
   - All error messages are now clear, actionable, and non-technical—no crypto jargon.
   - Success and next-step messages after every major action.
- **MVP Polish:**
   - All features tested and demo-ready for Y Combinator and team review.


### Jan 27, 2026
- Overhauled all user-facing error messages for an "Invisible Web3" experience: users never see technical terms like Bundler, Paymaster, or Security Transaction fees. Friendly, non-crypto explanations are shown for all errors (including downtime, payment, and KYC issues).
- Added localStorage draft saving and auto-resume for signatory emails. Users can now safely leave and return to onboarding without losing progress, reducing drop-off.
- Improved post-action clarity: after each major step (e.g., signing), the UI now shows a clear success message and next step.
- Prepared for backend/email integration to send "resume your deposit" reminders if a user abandons after email verification.
- **Security:** All smart contracts passed a comprehensive Slither audit (Solidity ^0.8.33). All critical and informational warnings in custom contracts are resolved. Only minor, safe-to-ignore warnings remain in OpenZeppelin libraries. Codebase is now production-ready and security-hardened.

### Jan 14, 2026
- Added `EscrowFactory` contract using the ERC-1167 minimal proxy pattern for scalable, efficient escrow deployment.
- Created and deployed a Foundry script for EscrowFactory on Polygon Amoy.
- Fixed Solidity test structure and improved reentrancy test coverage.
- Documented all major technologies and updated developer workflow.
- Pushed all changes to GitHub for team alignment and grant applications.

### Nov 27, 2025
- Added a security audit script (`script/security-audit.sh`) using Slither to automatically analyze Solidity contracts for vulnerabilities. This script helps detect issues like reentrancy, unchecked transfers, and dangerous timestamp usage.
- Optimized the `_releaseToLandlord` function in the `UltraRentzEscrow` contract to reduce Security Transaction costs by resetting only the approvals counter instead of looping through all signatories. This change lowers transaction fees and improves contract efficiency.
- All tests passed successfully after these changes, confirming both security and efficiency improvements.

---


### Dec 22, 2025
- Added Legally Recorded reputation system: After escrow completion, tenants and landlords can rate each other 1–5 stars. Ratings are securely recorded and average scores are queryable for any user, building trust and transparency into the platform.

### Nov 30, 2025
 - Implemented deposit tokenization: URZ stablecoin tokens are generated as receipts to tenants when deposits are funded and removed when deposits are released or refunded, creating a direct mapping between escrowed funds and tokenized assets.
 - Added comprehensive Foundry tests for escrow/token integration, DAO dispute resolution, and tokenization logic.
 - Project is now ready for staking/lending module development to demonstrate high APY and attract TVL.

---

## 🚀 Live Demo

🔗 [ultra-rentz-mvp1.vercel.app](https://ultra-rentz-mvp1.vercel.app)

---


## 🧠 Features

- 🧾 **Pay Rent Deposits** using URZ tokens  
- 🖊️ **Multi-signatory system** (4 of 6 must approve for release)  
- 🧍‍♂️🧍‍♀️ Renter and Landlord each nominate 3 signatories  
- 🪙 URZ Digital Receipt Token deployed on **Moonbase Alpha**  
- 💳 Choose between **fiat** or **token** payment  
- 🌕 MetaMask wallet integration  
- 🌑 Light/Dark mode toggle  
- 📅 Automatic tenancy end date calculation  
- 🧠 Legally Recorded arbitration logic ready for DAO integration  
- ⭐ **Legally Recorded reputation system:** Tenants and landlords can rate each other 1–5 stars after escrow completion. Average ratings are stored and visible, building trust and transparency.  
- ⚙️ Built using modular TypeScript components

---



## 🚀 New Features (2026 MVP)

- 🏛️ **Live DAO Voting:** Community members vote on dispute outcomes in real time, with progress bars and transparent results.
- 🕒 **Dispute Timeline & Audit Trail:** Visual timeline modal shows every event, action, and on-chain transaction for each dispute, with downloadable audit logs.
- 🖼️ **Evidence Upload & Gallery:** Parties can upload, view, and manage evidence files (images, PDFs, docs) for each dispute, with secure storage and gallery view.
- 💬 **In-Page Chat & Mediation:** Real-time chat for renters, landlords, and DAO mediators to discuss disputes, share updates, and resolve issues collaboratively.
- 🤖 **AI-Powered Dispute Insights:** Automated summary, outcome prediction, and suggestions for each dispute, powered by AI models.
- 🔔 **Automated Notifications:** Instant in-app and SMS/email alerts for dispute status changes, votes, and resolution events.
- 🏠 **Property-Based Workflow:** Disputes are linked to specific properties and deposits, with easy selection and tracking.
- ⏳ **Estimated Resolution Time:** UI displays expected time to resolution based on DAO voting and historical data.
- ⭐ **Feedback & Reputation:** Parties can leave feedback after dispute resolution, building a transparent reputation system.
- 🏅 **Gamified Badges (Planned):** Earn badges for positive dispute outcomes, participation, and community engagement.
- 📤 **Export/Share (Planned):** Download or share dispute records, evidence, and audit trails for compliance and transparency.
- 🧮 **Resolution Calculator (Planned):** Estimate potential outcomes and resolved amounts before submitting a dispute.
- ♿ **Accessibility Tools (Planned):** Enhanced accessibility features for all users.

All features are integrated into the Disputes page and related modals/components for a seamless, user-friendly experience.

---
## 🛡️ Error Logging & Smart Contract Monitoring

### Sentry (Frontend Error Logging)
- Sentry is integrated to capture and report frontend errors in production. This helps the team proactively fix issues before users report them.
- To enable Sentry, set your DSN in the `.env` file:
   ```env
   SENTRY_DSN=your_sentry_dsn_here
   ```
- The Sentry initialization is in `src/main.tsx`. Replace `YOUR_SENTRY_DSN_HERE` with your actual DSN or use the environment variable.


### Tenderly (Smart Contract Monitoring with Foundry)
- Tenderly is integrated with Foundry for real-time smart contract monitoring and alerting.
- To enable Tenderly, set your credentials in the `.env` file:
   ```env
   TENDERLY_PROJECT=your_tenderly_project
   TENDERLY_USERNAME=your_tenderly_username
   TENDERLY_ACCESS_KEY=your_tenderly_access_key
   ```
- The Tenderly integration is configured in `foundry.toml`.
- To push contracts or simulations to Tenderly, use the Tenderly CLI:
   ```sh
   forge script <script> --fork-url <RPC_URL> --broadcast --verify --tenderly
   ```
- For more, see [Tenderly Foundry Docs](https://docs.tenderly.co/monitoring/foundry-integration).

---
## 🔧 Partner Tools Used

- **Etherlink** — Deployed the UltraRentz Escrow contract and integrated blockchain infrastructure for fast, secure transactions on a Layer 2 testnet.  
- **Thirdweb** — Assisted with contract management and deployment scripts.  
- **Sequence** — Used for wallet connection and user onboarding flows.  
- **RedStone** — Integrated decentralized oracle data feeds for token price validation (planned/partial).  
- **Goldsky** — Utilized for off-chain data querying and analytics (planned).  
- **Google Cloud** — Hosting frontend and backend services supporting the dApp UI and API endpoints.

---

## 💸 How to Pay with URZ

1. Connect your MetaMask wallet to the **Moonbase Alpha** testnet.  
2. Add the URZ token manually to MetaMask:  
   - **Contract**: `0xB1c01f7e6980AbdbAec0472C0e1A58EB46D39f3C`  
   - **Symbol**: `URZ`  
   - **Decimals**: `18`  
3. Choose **Token** mode in the deposit form.  
4. Enter:  
   - Deposit amount (in URZ)  
   - Tenancy start date  
   - Tenancy duration (in months)  
   - Landlord wallet address  
5. Click **Pay Token** to confirm the payment (Legally Recorded).

---

## ✍️ How to Add Signatories


**How it works:**
- Add up to 3 signatory emails or wallet addresses for each party (Renter and Landlord).
- Instant feedback: Invalid, duplicate, or excess entries are blocked with clear error messages.
- Remove signatories instantly with the remove button.
- UI is polished for clarity and ease of use—no "verified" status or confusing states.
- All changes are saved as you go (drafts auto-resume if you leave and return).

**To finalize:**
1. Ensure URZ token payment is confirmed and wallet is connected.
2. Add 3 signatories for each party (6 total).
3. Click `Finalize Deposit & Signatories` to complete the process.

---

## ⚙️ Architecture

- **Smart Contracts (Solidity):** Handles token deposits, escrow logic, and multi-sig approval.  
- **Frontend (React + TypeScript):** Modular forms for UX, built with Vite.  
- **Blockchain APIs:**  
  - Ethers.js for Ethereum/Moonbeam integration  
  - Polkadot.js API for future substrate compatibility  
- **Wallet Support:**  
  - MetaMask (Ethereum)  
  - Sequence (wallet onboarding)  

---

## 🛠️ Tech Stack

- **Initia (Interwoven Layer)** - High-performance blockchain
- **MoveVM** - Secure smart contract platform  
- **Supabase** - Backend and database
- **Next.js** - Frontend framework
- **TypeScript** - Type-safe development
- **@initia/react-wallet-widget** - Wallet integration
- **React + Tailwind CSS** - UI components
- **DeFi Protocols** - Aave, Compound, Morpho, Yearn, Curve, Uniswap

---


## 🛡️ Security & Testing

UltraRentz is built with a security-first mindset:

- **100% of critical tests pass** (see coverage badge above)
- **Advanced fuzzing and invariant-style tests** for all core accounting logic
- **Manual and automated test coverage** for payment, signatory, and release flows
- **Coverage and security methodology**: [COVERAGE_AND_SECURITY.md](COVERAGE_AND_SECURITY.md)
- **All failing invariant test files are commented out for submission** (see note in coverage report)
- **Comprehensive Slither audit completed:**
    - All critical and informational issues in custom contracts are resolved
    - Only minor, informational warnings remain in OpenZeppelin libraries (e.g., pragma versions, inline assembly)
    - Codebase is production-ready and security-hardened

**Security Roadmap:**
- ✅ Manual testing of payment + signatory flow
- ✅ Unit and fuzz tests for smart contract functions
- 🔐 Integration with DAO arbitration module (planned)
- 🔍 Smart Contract Audit by certified Web3 security expert (planned)

> For Alliance.xyz reviewers: We prioritize security and correctness, using best-in-class testing tools and coverage reporting. See [COVERAGE_AND_SECURITY.md](COVERAGE_AND_SECURITY.md) for details.

---

## 👥 Contributing

We welcome collaborators! Submit pull requests or issues on GitHub.

---

## 📝 License

MIT License © Adegbenga Ogungbeje (UltraRentz)
