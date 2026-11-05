// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {RentDepositVaultV2} from "../src/contracts/RentDepositVaultV2.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// Tests for the hackathon changes in RentDepositVaultV2.
/// Code identifiers such as createLease refer to a tenancy.
contract RentDepositVaultV2Test is Test {
    MockUSDC usdc;
    RentDepositVaultV2 vault;

    address agent = makeAddr("agent");
    address arbiter = makeAddr("arbiter");
    address tenant = makeAddr("tenant");
    address landlord = makeAddr("landlord");
    address landlord2 = makeAddr("landlord2");
    address stranger = makeAddr("stranger");
    address approver;
    uint256 approverPk;

    uint256 constant DEP = 1_000e6;
    uint256 constant YIELD_ON_DEP = 50e6; // 5% for one full year
    uint256 constant YEAR = 365 days;
    uint256 constant CLAIM = 14 days;
    bytes32 constant EVIDENCE = keccak256("evidence-bundle");

    function setUp() public {
        vm.warp(1_700_000_000);
        (approver, approverPk) = makeAddrAndKey("approver");
        usdc = new MockUSDC();
        vault = new RentDepositVaultV2(address(usdc), agent, arbiter, approver);

        usdc.mint(address(this), 10_000e6);
        usdc.approve(address(vault), type(uint256).max);
        vault.fundYieldReserve(5_000e6);

        usdc.mint(tenant, 10_000e6);
        vm.prank(tenant);
        usdc.approve(address(vault), type(uint256).max);
    }

    // ------------------------------------------------------------ helpers

    function _create(address t, address l, uint256 dep, uint256 start) internal returns (uint256) {
        return vault.createLease(t, l, keccak256("tenancy-agreement"), dep, start, start + YEAR, CLAIM);
    }

    function _fund(uint256 id) internal {
        vm.prank(tenant);
        vault.fundLease(id);
    }

    /// Funded tenancy that ended with no claim; the claim window has passed.
    function _cleanOld(uint256 dep) internal returns (uint256 id) {
        id = _create(tenant, landlord, dep, block.timestamp);
        _fund(id);
        vm.warp(block.timestamp + YEAR + CLAIM);
    }

    function _recorded(uint256 dep) internal returns (uint256 id) {
        id = _cleanOld(dep);
        vm.prank(agent);
        vault.recordCleanTenancy(id, EVIDENCE);
    }

    function _newTenancy(uint256 dep) internal returns (uint256) {
        return _create(tenant, landlord2, dep, block.timestamp);
    }

    function _sig(uint256 oldId, uint256 newId, uint256 nonce, uint256 deadline, uint256 pk)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = vault.rolloverDigest(tenant, oldId, newId, nonce, deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _roll(uint256 oldId, uint256 newId, uint256 nonce) internal {
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, nonce, dl, approverPk);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, nonce, sig);
    }

    // ------------------------------------------------- baseline regression

    function test_baselineHappyPathStillWorks() public {
        uint256 id = _cleanOld(DEP);
        uint256 before = usdc.balanceOf(tenant);
        vm.prank(agent);
        vault.requestRelease(id);
        vm.warp(block.timestamp + 1 hours);
        vault.executeRelease(id);
        assertEq(usdc.balanceOf(tenant), before + DEP + YIELD_ON_DEP);
    }

    // ------------------------------------------------------ funding guard

    function test_unfundedDepositCannotBeReleased() public {
        uint256 id = _create(tenant, landlord, DEP, block.timestamp);
        vm.warp(block.timestamp + YEAR + CLAIM);
        vm.expectRevert(RentDepositVaultV2.NotFunded.selector);
        vm.prank(agent);
        vault.requestRelease(id);
    }

    function test_cannotFundTwice() public {
        uint256 id = _create(tenant, landlord, DEP, block.timestamp);
        _fund(id);
        vm.expectRevert(RentDepositVaultV2.AlreadyFunded.selector);
        vm.prank(tenant);
        vault.fundLease(id);
    }

    function test_fundingSetsFlag() public {
        uint256 id = _create(tenant, landlord, DEP, block.timestamp);
        assertFalse(vault.funded(id));
        _fund(id);
        assertTrue(vault.funded(id));
    }

    // ------------------------------------------------------ record passport

    function test_recordCleanTenancy() public {
        uint256 id = _cleanOld(DEP);
        vm.expectEmit(true, true, false, true);
        emit RentDepositVaultV2.PassportRecorded(id, tenant, EVIDENCE);
        vm.prank(agent);
        vault.recordCleanTenancy(id, EVIDENCE);
        assertEq(vault.passportHash(id), EVIDENCE);
    }

    function test_recordRequiresAgent() public {
        uint256 id = _cleanOld(DEP);
        vm.expectRevert(RentDepositVaultV2.NotAgent.selector);
        vm.prank(tenant);
        vault.recordCleanTenancy(id, EVIDENCE);
    }

    function test_recordBeforeDeadlineReverts() public {
        uint256 id = _create(tenant, landlord, DEP, block.timestamp);
        _fund(id);
        vm.expectRevert(RentDepositVaultV2.NotCleanTenancy.selector);
        vm.prank(agent);
        vault.recordCleanTenancy(id, EVIDENCE);
    }

    function test_recordRequiresFunded() public {
        uint256 id = _create(tenant, landlord, DEP, block.timestamp);
        vm.warp(block.timestamp + YEAR + CLAIM);
        vm.expectRevert(RentDepositVaultV2.NotFunded.selector);
        vm.prank(agent);
        vault.recordCleanTenancy(id, EVIDENCE);
    }

    function test_recordTwiceReverts() public {
        uint256 id = _recorded(DEP);
        vm.expectRevert(RentDepositVaultV2.PassportAlreadyRecorded.selector);
        vm.prank(agent);
        vault.recordCleanTenancy(id, EVIDENCE);
    }

    function test_recordZeroHashReverts() public {
        uint256 id = _cleanOld(DEP);
        vm.expectRevert(RentDepositVaultV2.MissingEvidence.selector);
        vm.prank(agent);
        vault.recordCleanTenancy(id, bytes32(0));
    }

    function test_recordBlockedWhenReleasePending() public {
        uint256 id = _cleanOld(DEP);
        vm.prank(agent);
        vault.requestRelease(id);
        vm.expectRevert(RentDepositVaultV2.ReleasePending.selector);
        vm.prank(agent);
        vault.recordCleanTenancy(id, EVIDENCE);
    }

    function test_claimBlocksRecording() public {
        uint256 id = _create(tenant, landlord, DEP, block.timestamp);
        _fund(id);
        vm.warp(block.timestamp + YEAR + 1);
        vm.prank(landlord);
        vault.submitClaim(id, 100e6, keccak256("damage-photos"));
        vm.warp(block.timestamp + CLAIM);
        vm.expectRevert(RentDepositVaultV2.NotCleanTenancy.selector);
        vm.prank(agent);
        vault.recordCleanTenancy(id, EVIDENCE);
    }

    // ------------------------------------------------------------ rollover

    function test_rolloverSameDeposit() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);
        uint256 vaultBefore = usdc.balanceOf(address(vault));
        uint256 tenantBefore = usdc.balanceOf(tenant);

        vm.expectEmit(true, true, true, true);
        emit RentDepositVaultV2.DepositRolledOver(oldId, newId, tenant, DEP, YIELD_ON_DEP, 0, 0);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);

        assertEq(usdc.balanceOf(tenant), tenantBefore + YIELD_ON_DEP);
        assertEq(usdc.balanceOf(address(vault)), vaultBefore - YIELD_ON_DEP);
        assertEq(vault.yieldReserve(), 5_000e6 - YIELD_ON_DEP);
        assertTrue(vault.funded(newId));
        assertEq(uint256(vault.getLease(oldId).status), uint256(RentDepositVaultV2.LeaseStatus.Released));
    }

    function test_rolloverWithTopUp() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(1_200e6);
        uint256 vaultBefore = usdc.balanceOf(address(vault));
        uint256 tenantBefore = usdc.balanceOf(tenant);

        _roll(oldId, newId, 1);

        assertEq(usdc.balanceOf(tenant), tenantBefore + YIELD_ON_DEP - 200e6);
        assertEq(usdc.balanceOf(address(vault)), vaultBefore - YIELD_ON_DEP + 200e6);
        assertTrue(vault.funded(newId));
    }

    function test_rolloverWithRefund() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(800e6);
        uint256 vaultBefore = usdc.balanceOf(address(vault));
        uint256 tenantBefore = usdc.balanceOf(tenant);

        _roll(oldId, newId, 1);

        assertEq(usdc.balanceOf(tenant), tenantBefore + YIELD_ON_DEP + 200e6);
        assertEq(usdc.balanceOf(address(vault)), vaultBefore - YIELD_ON_DEP - 200e6);
    }

    function test_rolledTenancyCanBeReleasedLater() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        _roll(oldId, newId, 1);

        vm.warp(block.timestamp + YEAR + CLAIM);
        uint256 before = usdc.balanceOf(tenant);
        vm.prank(agent);
        vault.requestRelease(newId);
        vm.warp(block.timestamp + 1 hours);
        vault.executeRelease(newId);
        assertEq(usdc.balanceOf(tenant), before + DEP + YIELD_ON_DEP);
    }

    function test_oldTenancyCannotBeReleasedAfterRollover() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        _roll(oldId, newId, 1);

        vm.expectRevert(RentDepositVaultV2.AlreadyReleased.selector);
        vm.prank(agent);
        vault.requestRelease(oldId);

        vm.expectRevert(RentDepositVaultV2.ReleaseNotReady.selector);
        vault.executeRelease(oldId);
    }

    function test_disputeBlocksRollover() public {
        uint256 oldId = _create(tenant, landlord, DEP, block.timestamp);
        _fund(oldId);
        vm.warp(block.timestamp + YEAR + 1);
        vm.prank(landlord);
        vault.submitClaim(oldId, 100e6, keccak256("damage-photos"));
        vm.prank(tenant);
        vault.disputeClaim(oldId);
        vm.warp(block.timestamp + CLAIM);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.NotCleanTenancy.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_acceptedClaimBlocksRollover() public {
        uint256 oldId = _create(tenant, landlord, DEP, block.timestamp);
        _fund(oldId);
        vm.warp(block.timestamp + YEAR + 1);
        vm.prank(landlord);
        vault.submitClaim(oldId, 100e6, keccak256("damage-photos"));
        vm.prank(tenant);
        vault.acceptClaim(oldId);
        vm.warp(block.timestamp + CLAIM);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.NotCleanTenancy.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_beforeClaimDeadlineBlocksRollover() public {
        uint256 oldId = _create(tenant, landlord, DEP, block.timestamp);
        _fund(oldId);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.NotCleanTenancy.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_noPassportBlocksRollover() public {
        uint256 oldId = _cleanOld(DEP); // clean, but the agent never recorded a passport
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.PassportMissing.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_unfundedOldTenancyCannotRoll() public {
        uint256 oldId = _create(tenant, landlord, DEP, block.timestamp);
        vm.warp(block.timestamp + YEAR + CLAIM);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.NotFunded.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_pendingReleaseBlocksRollover() public {
        uint256 oldId = _recorded(DEP);
        vm.prank(agent);
        vault.requestRelease(oldId);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.ReleasePending.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_newTenancyAlreadyFundedBlocks() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        _fund(newId);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.NewLeaseNotFundable.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_wrongTenantRejected() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.WrongTenant.selector);
        vm.prank(landlord);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_newTenancyOfSomeoneElseRejected() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _create(stranger, landlord2, DEP, block.timestamp);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.WrongTenant.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_wrongSignerRejected() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        (, uint256 evilPk) = makeAddrAndKey("evil");
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, evilPk);

        vm.expectRevert(RentDepositVaultV2.BadApprover.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_garbageSignatureRejected() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;

        vm.expectRevert(RentDepositVaultV2.BadApprover.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, hex"1234");
    }

    function test_expiredApprovalRejected() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp - 1;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.ApprovalExpired.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_signatureBoundToNewTenancy() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 otherNewId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        // Same signature, different target tenancy: the digest differs, so the signer does not match.
        vm.expectRevert(RentDepositVaultV2.BadApprover.selector);
        vm.prank(tenant);
        vault.rollover(oldId, otherNewId, dl, 1, sig);
    }

    function test_signatureBoundToNonce() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectRevert(RentDepositVaultV2.BadApprover.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 2, sig);
    }

    function test_replayRejected() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);

        // Second use of the same approval: the old tenancy is already Released.
        vm.expectRevert(RentDepositVaultV2.NotCleanTenancy.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_pausedBlocksRollover() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);
        vault.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    // ------------------------------------------------------------ approver

    function test_setApproverOnlyOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        vm.prank(stranger);
        vault.setApprover(stranger);
    }

    function test_setApproverRejectsZero() public {
        vm.expectRevert(RentDepositVaultV2.InvalidAddress.selector);
        vault.setApprover(address(0));
    }

    function test_oldApproverStopsWorkingAfterChange() public {
        uint256 oldId = _recorded(DEP);
        uint256 newId = _newTenancy(DEP);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sig(oldId, newId, 1, dl, approverPk);

        vm.expectEmit(true, false, false, false);
        emit RentDepositVaultV2.ApproverUpdated(stranger);
        vault.setApprover(stranger);

        vm.expectRevert(RentDepositVaultV2.BadApprover.selector);
        vm.prank(tenant);
        vault.rollover(oldId, newId, dl, 1, sig);
    }

    function test_constructorRejectsZeroApprover() public {
        vm.expectRevert(RentDepositVaultV2.InvalidAddress.selector);
        new RentDepositVaultV2(address(usdc), agent, arbiter, address(0));
    }
}
