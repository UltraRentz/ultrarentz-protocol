# Deposit Passport: one-page spec

**Status:** draft v2, 5 Nov 2026. Written against `src/contracts/RentDepositVault.sol` at baseline `cc5e4ba`.
**Naming:** in plain English this document says "tenancy". The baseline code still uses the identifiers `Lease`, `leaseId`, `createLease` and `fundLease`; they appear only inside code formatting.
**Rule:** the baseline contract file is not edited. New work lives in a new file, `src/contracts/RentDepositVaultV2.sol`: a copy of the baseline with a small, documented diff (a funding guard plus the Passport), so judges can run `diff` to see exactly what was built this weekend.

## The story
A tenant finishes a tenancy with no claim from the landlord. The vault records a **Passport hash** (a fingerprint of the evidence bundle stored on Arkiv). The tenant then moves into a new tenancy and **rolls the rent deposit over** in one transaction, but only with a signed **human approval** (World ID check done by our backend). No USDC leaves the vault, so the tenant never has to pay two deposits at once.

## What exists today (from the baseline)
- A tenancy record (`Lease`) holds `tenant, landlord, leaseHash, deposit, startTime, endTime, claimDeadline, claimedAmount, status, disputeResolved, resolvedTenantAmount, resolvedLandlordAmount, claimEvidenceHash`.
- Status values (`LeaseStatus`): Active, ClaimPeriod, Claimed, Disputed, Resolved, Released.
- A tenancy is **clean** when `block.timestamp >= claimDeadline && claimedAmount == 0` (the same test `requestRelease` uses).
- `executeRelease` pays pending yield and the deposit to the tenant, then sets `Released`.
- `usdc`, `aiAgent` (the agent), `yieldReserve`, `leases` and `releaseRequests` already exist.

## Baseline findings (fixed in V2, disclosed in the README)
1. There is no funded flag. `fundLease` only moves USDC and emits an event; the tenancy stays `Active`. A tenancy whose deposit was never paid can pass `requestRelease` after its claim deadline, and `executeRelease` would then pay out of other tenants' funds.
2. `fundLease` can be called repeatedly by the tenant, each time pulling the deposit again.
3. `createLease` can be called by anyone for any tenant and landlord (no direct fund risk, but it allows spam).
V2 fix: a `funded` mapping; `fundLease` reverts if already funded; `requestRelease` and `rollover` require `funded`.

## New state
- `mapping(uint256 => bool) funded`: set by `fundLease` and by `rollover`.
- `address approver`: the key our World backend signs with. Set by the owner.
- `mapping(uint256 => bytes32) passportHash`: tenancy id to evidence hash.
- `mapping(bytes32 => bool) approvalUsed`: replay protection, keyed by the approval digest.
- EIP-712 domain (name, version, `chainId`, `address(this)`) so signatures cannot be reused on another chain or contract.

## New functions
1. **`recordCleanTenancy(leaseId, recordHash)`** (agent only, not paused). Requires a clean tenancy, not `Released`, `funded`, no pending release request, and no passport yet. Stores `passportHash[leaseId]`. Emits `PassportRecorded(leaseId, tenant, recordHash)`.
2. **`setApprover(address)`** (owner only). Emits `ApproverUpdated`. Hackathon limit: instant, no timelock (production would copy the 24-hour agent-change delay).
3. **`rollover(oldLeaseId, newLeaseId, deadline, nonce, signature)`** (tenant only, not paused, non-reentrant). Checks, in order:
   - `msg.sender` is the tenant of both the old and the new tenancy
   - the old tenancy is clean, `funded`, not `Released`, has no release request pending, and `passportHash[oldLeaseId] != 0`
   - the new tenancy exists, is `Active`, and `funded[newLeaseId]` is false; its landlord may differ from the old landlord
   - `block.timestamp <= deadline`
   - digest = EIP-712 of `Rollover(tenant, oldLeaseId, newLeaseId, passportHash, nonce, deadline)`; `approvalUsed[digest]` is false; the recovered signer equals `approver`
   Then, effects before transfers: mark the approval used, set the old tenancy `Released`, set `funded[newLeaseId] = true`, then settle amounts:
   - pay the old tenancy's **yield** to the tenant (as `executeRelease` does, capped by `yieldReserve`)
   - if the new deposit is larger: pull the **difference** from the tenant (`transferFrom`)
   - if the new deposit is smaller: **refund** the difference to the tenant
   Emits `DepositRolledOver(oldLeaseId, newLeaseId, tenant, rolled, yieldPaid, topUp, refund)`.

## Errors (new)
`PassportMissing`, `PassportAlreadyRecorded`, `NotCleanTenancy`, `ApprovalExpired`, `ApprovalUsed`, `BadApprover`, `WrongTenant`, `NewLeaseNotFundable`, `ReleasePending`, `AlreadyFunded`, `NotFunded`.

Helper (view): `rolloverDigest(tenant, oldLeaseId, newLeaseId, nonce, deadline)` returns the EIP-712 digest the World backend signs. It reads the stored passport hash, so the backend and the tests build the same message.

## Defaults I chose (change any of these)
1. The new landlord may differ from the old one (that is the real "moving home" case).
2. The deposit amount may change: the tenant tops up or is refunded the difference.
3. Yield is paid to the tenant, not rolled over (simple and visible in the demo).
4. The approval is bound to the passport hash, so it only works for that record.
5. A copy of the baseline in a new file, not inheritance: the baseline functions are not `virtual`, so a child contract cannot add the funding guard to them.

## Outside the contract
- **Arkiv:** an evidence entity (list of documents and photos, claims, timestamps) and a passport summary, both with an expiry; `recordHash = keccak256(canonical JSON of the evidence bundle)`. The **Verify** button fetches from Arkiv, re-hashes, and compares with `passportHash` on Arc. The tamper test changes one field and shows the mismatch.
- **World backend:** a serverless endpoint validates the (mocked) proof, then signs the `Rollover` message with the `approver` key. A denied, expired or cancelled proof returns no signature, and the UI blocks the rollover.
- **Arc:** every transaction needs `maxFeePerGas` of at least 20 Gwei or it is silently dropped. Set it in the deploy script and in the frontend.

## Tests (Foundry)
Unfunded deposit cannot be released; cannot be funded twice; unfunded old tenancy cannot roll over; happy path with top-up; happy path with refund; a claim blocks rollover; a dispute blocks rollover; before the claim deadline blocks; no passport blocks; wrong signer; wrong tenant; expired approval; replay of a used approval; pending release request blocks; the old tenancy cannot be released again afterwards; yield paid; paused contract blocks.

## Honest limits
Testnet only. Yield is simulated from an owner-funded reserve. The approver key is a single hot key (a production system would use a multisig or a timelock). The baseline vault is unaudited, and so is this extension. World proofs are mocked. UK law requires tenancy deposits to sit in a government-approved scheme, so the UK is a practice market only.

## Confirmed from the baseline
The whole baseline contract has been read. Constructor is `(address _usdc, address _aiAgent, address _arbiter)` with `Ownable(msg.sender)`; V2 adds `_approver`. `pendingYield` is `deposit * YIELD_RATE_BPS * elapsed / (365 days * 10_000)`, with elapsed capped at `endTime`. Build needs `via_ir = true` (stack too deep otherwise).

## Test status
37 Foundry tests pass in `test/RentDepositVaultV2.t.sol`, including a regression test that the baseline release path still works. Run: `forge test`.
