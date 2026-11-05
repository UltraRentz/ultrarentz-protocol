# Deposit Passport: one-page spec

**Status:** draft v1, 5 Nov 2026. Written against `src/contracts/RentDepositVault.sol` at baseline `cc5e4ba`.
**Rule:** the baseline contract is not edited. New work lives in a new file, `src/contracts/DepositPassportVault.sol`, which inherits the baseline vault, so the before-and-after is obvious to judges.

## The story
A tenant finishes a tenancy with no claim. The vault records a **Passport hash** (a fingerprint of the evidence bundle stored on Arkiv). The tenant then moves into a new tenancy and **rolls the deposit** into it in one transaction, but only with a signed **human approval** (World ID check done by our backend). No USDC leaves the vault, so the tenant never has to pay two deposits at once.

## What exists today (from the baseline)
- `Lease` has `tenant, landlord, leaseHash, deposit, startTime, endTime, claimDeadline, claimedAmount, status, disputeResolved, resolvedTenantAmount, resolvedLandlordAmount, claimEvidenceHash`.
- `LeaseStatus`: Active, ClaimPeriod, Claimed, Disputed, Resolved, Released.
- A tenancy is **clean** when `block.timestamp >= claimDeadline && claimedAmount == 0` (the same test `requestRelease` uses).
- `executeRelease` pays pending yield and the deposit to the tenant, sets `Released`.
- `usdc`, `aiAgent` (the agent), `yieldReserve`, `leases`, `releaseRequests` already exist.

## New state
- `address approver`: the key our World backend signs with. Set by the owner.
- `mapping(uint256 => bytes32) passportHash`: leaseId to evidence hash.
- `mapping(bytes32 => bool) approvalUsed`: replay protection, keyed by the approval digest.
- EIP-712 domain (name, version, `chainId`, `address(this)`) so signatures cannot be reused on another chain or contract.

## New functions
1. **`recordCleanTenancy(leaseId, recordHash)`** (agent only, not paused). Requires a clean tenancy, not `Released`, no pending release request, and no passport yet. Stores `passportHash[leaseId]`. Emits `PassportRecorded(leaseId, tenant, recordHash)`.
2. **`setApprover(address)`** (owner only). Emits `ApproverUpdated`. Hackathon limit: instant, no timelock (production would copy the 24-hour agent-change delay).
3. **`rollover(oldLeaseId, newLeaseId, deadline, nonce, signature)`** (tenant only, not paused, non-reentrant). Checks, in order:
   - `msg.sender == old.tenant == new.tenant`
   - old lease is clean, not `Released`, no release request pending, and `passportHash[oldLeaseId] != 0`
   - new lease exists, is not funded, and `new.landlord` may differ from `old.landlord`
   - `block.timestamp <= deadline`
   - digest = EIP-712 of `Rollover(tenant, oldLeaseId, newLeaseId, passportHash, nonce, deadline)`; `approvalUsed[digest]` is false; recovered signer equals `approver`
   Then, effects before transfers: mark approval used, set old lease `Released`, mark the new lease funded the way `fundLease` does, then settle amounts:
   - pay old-lease **yield** to the tenant (as `executeRelease` does, capped by `yieldReserve`)
   - if `new.deposit > old.deposit`: pull the **difference** from the tenant (`transferFrom`)
   - if `new.deposit < old.deposit`: **refund** the difference to the tenant
   Emits `DepositRolledOver(oldLeaseId, newLeaseId, tenant, rolled, yieldPaid, topUp, refund)`.

## Errors (new)
`PassportMissing`, `NotCleanTenancy`, `ApprovalExpired`, `ApprovalUsed`, `BadApprover`, `WrongTenant`, `NewLeaseNotFundable`, `ReleasePending`.

## Defaults I chose (change any of these)
1. The new landlord may differ from the old one (that is the real "moving home" case).
2. The deposit amount may change: tenant tops up or is refunded the difference.
3. Yield is paid to the tenant, not rolled (simple and visible in the demo).
4. The approval is bound to the passport hash, so it only works for that record.
5. Inheritance, not editing the baseline file.

## Outside the contract
- **Arkiv:** evidence entity (photos or documents list, claims, timestamps) and a passport summary, both with an expiry; `recordHash = keccak256(canonical JSON of the evidence bundle)`. The **Verify** button fetches from Arkiv, re-hashes, and compares with `passportHash` on Arc. The tamper test changes one field and shows the mismatch.
- **World backend:** serverless endpoint validates the (mocked) proof, then signs the `Rollover` message with the `approver` key. A denied, expired or cancelled proof returns no signature and the UI blocks the rollover.
- **Arc:** every transaction needs `maxFeePerGas` of at least 20 Gwei or it is silently dropped. Set it in the deploy script and in the frontend.

## Tests (Foundry)
Happy path with top-up; happy path with refund; claim blocks rollover; dispute blocks rollover; before claim deadline blocks; no passport blocks; wrong signer; wrong tenant; expired approval; replay of a used approval; pending release request blocks; old lease cannot be released again afterwards; yield paid; paused contract blocks.

## Honest limits
Testnet only. Yield is simulated from an owner-funded reserve. The approver key is a single hot key (a production system would use a multisig or a timelock). Baseline vault is unaudited, and so is this extension. World proofs are mocked.

## Assumptions to confirm when coding
How `fundLease` marks a lease funded, what `createLease` requires of the caller, how `pendingYield` is computed, and whether `yieldReserve` and the modifiers are visible to a derived contract (lines 113 to 178 of the baseline).
