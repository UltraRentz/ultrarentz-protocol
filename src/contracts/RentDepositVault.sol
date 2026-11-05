// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RentDepositVault is
    Ownable2Step,
    Pausable,
    ReentrancyGuard
{
    using SafeERC20 for IERC20;

    uint256 public constant AGENT_DELAY = 1 hours;
    uint256 public constant YIELD_RATE_BPS = 500; // 5% simulated APY - DEMO ONLY

    IERC20 public immutable usdc;

    address public aiAgent;
    address public arbiter;

    uint256 public yieldReserve;

    enum LeaseStatus {
        Active,
        ClaimPeriod,
        Claimed,
        Disputed,
        Resolved,
        Released
    }

    struct Lease {
        address tenant;
        address landlord;
        bytes32 leaseHash;
        uint256 deposit;
        uint256 startTime;
        uint256 endTime;
        uint256 claimDeadline;
        uint256 claimedAmount;
        LeaseStatus status;
        bool disputeResolved;
        uint256 resolvedTenantAmount;
        uint256 resolvedLandlordAmount;
        bytes32 claimEvidenceHash;
    }

    mapping(uint256 => Lease) public leases;
    uint256 public nextLeaseId = 1;

    struct ReleaseRequest {
        uint256 leaseId;
        uint256 amount;
        uint256 executeAfter;
        bool executed;
    }

    mapping(uint256 => ReleaseRequest) public releaseRequests;

    uint256 public constant AGENT_CHANGE_DELAY = 24 hours;

    address public pendingAgent;
    uint256 public pendingAgentTime;

    address public pendingArbiter;
    uint256 public pendingArbiterTime;

    event LeaseCreated(uint256 indexed leaseId, address indexed tenant, address indexed landlord, uint256 deposit, uint256 startTime, uint256 endTime, uint256 claimDeadline, bytes32 leaseHash);
    event LeaseFunded(uint256 indexed leaseId, uint256 amount);
    event LandlordClaimSubmitted(uint256 indexed leaseId, uint256 amount, bytes32 evidenceHash);
    event ClaimAccepted(uint256 indexed leaseId, uint256 amount);
    event ClaimDisputed(uint256 indexed leaseId);
    event ClaimResolved(uint256 indexed leaseId, uint256 tenantAmount, uint256 landlordAmount);
    event ReleaseRequested(uint256 indexed leaseId, uint256 amount, uint256 executeAfter);
    event DepositReleased(uint256 indexed leaseId, address indexed recipient, uint256 amount);
    event AgentChangeRequested(address indexed newAgent, uint256 executeAfter);
    event AgentUpdated(address indexed newAgent);
    event ArbiterChangeRequested(address indexed newArbiter, uint256 executeAfter);
    event ArbiterUpdated(address indexed newArbiter);
    event YieldReserveFunded(uint256 amount);
    event YieldPaid(uint256 indexed leaseId, address indexed recipient, uint256 amount);

    error InvalidAddress();
    error InvalidLease();
    error InvalidAmount();
    error InvalidDates();
    error NotTenant();
    error NotLandlord();
    error NotArbiter();
    error NotAgent();
    error LeaseNotActive();
    error LeaseNotEnded();
    error ClaimPeriodActive();
    error ClaimPeriodExpired();
    error ClaimAlreadyExists();
    error ClaimTooLarge();
    error NoClaim();
    error NotDisputed();
    error AlreadyReleased();
    error ReleaseNotReady();
    error ReleaseAlreadyRequested();
    error InvalidResolution();
    error NothingToRelease();
    error AgentChangeNotReady();
    error ArbiterChangeNotReady();
    error InsufficientVaultBalance();
    error MissingEvidence();

    modifier onlyAgent() {
        if (msg.sender != aiAgent) revert NotAgent();
        _;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert NotArbiter();
        _;
    }

    constructor(address _usdc, address _aiAgent, address _arbiter) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidAddress();
        if (_aiAgent == address(0)) revert InvalidAddress();
        if (_arbiter == address(0)) revert InvalidAddress();
        usdc = IERC20(_usdc);
        aiAgent = _aiAgent;
        arbiter = _arbiter;
    }

    function createLease(address tenant, address landlord, bytes32 leaseHash, uint256 depositAmount, uint256 startTime, uint256 endTime, uint256 claimPeriod) external whenNotPaused nonReentrant returns (uint256 leaseId) {
        if (tenant == address(0) || landlord == address(0)) revert InvalidAddress();
        if (depositAmount == 0) revert InvalidAmount();
        if (endTime <= startTime) revert InvalidDates();
        if (claimPeriod == 0) revert InvalidDates();

        leaseId = nextLeaseId++;
        leases[leaseId] = Lease({
            tenant: tenant, landlord: landlord, leaseHash: leaseHash, deposit: depositAmount,
            startTime: startTime, endTime: endTime, claimDeadline: endTime + claimPeriod,
            claimedAmount: 0, status: LeaseStatus.Active, disputeResolved: false,
            resolvedTenantAmount: 0, resolvedLandlordAmount: 0, claimEvidenceHash: bytes32(0)
        });

        emit LeaseCreated(leaseId, tenant, landlord, depositAmount, startTime, endTime, endTime + claimPeriod, leaseHash);
    }

    function fundLease(uint256 leaseId) external whenNotPaused nonReentrant {
        Lease storage lease = leases[leaseId];
        if (lease.tenant == address(0)) revert InvalidLease();
        if (msg.sender != lease.tenant) revert NotTenant();
        if (lease.status != LeaseStatus.Active) revert LeaseNotActive();

        uint256 beforeBalance = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(msg.sender, address(this), lease.deposit);
        uint256 received = usdc.balanceOf(address(this)) - beforeBalance;
        if (received != lease.deposit) revert InvalidAmount();

        emit LeaseFunded(leaseId, received);
    }

    function fundYieldReserve(uint256 amount) external onlyOwner nonReentrant {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        yieldReserve += amount;
        emit YieldReserveFunded(amount);
    }

    function pendingYield(uint256 leaseId) public view returns (uint256) {
        Lease memory lease = leases[leaseId];
        if (lease.tenant == address(0)) return 0;
        uint256 endPoint = block.timestamp < lease.endTime ? block.timestamp : lease.endTime;
        if (endPoint <= lease.startTime) return 0;
        uint256 elapsed = endPoint - lease.startTime;
        return (lease.deposit * YIELD_RATE_BPS * elapsed) / (365 days * 10_000);
    }

    function submitClaim(uint256 leaseId, uint256 amount, bytes32 evidenceHash) external whenNotPaused nonReentrant {
        Lease storage lease = leases[leaseId];
        if (lease.tenant == address(0)) revert InvalidLease();
        if (msg.sender != lease.landlord) revert NotLandlord();
        if (block.timestamp < lease.endTime) revert LeaseNotEnded();
        if (block.timestamp > lease.claimDeadline) revert ClaimPeriodExpired();
        if (evidenceHash == bytes32(0)) revert MissingEvidence();

        if (lease.status != LeaseStatus.ClaimPeriod) {
            if (lease.status != LeaseStatus.Active) revert ClaimAlreadyExists();
            lease.status = LeaseStatus.ClaimPeriod;
        }
        if (amount == 0) revert InvalidAmount();
        if (amount > lease.deposit) revert ClaimTooLarge();
        if (lease.claimedAmount != 0) revert ClaimAlreadyExists();

        lease.claimedAmount = amount;
        lease.claimEvidenceHash = evidenceHash;
        lease.status = LeaseStatus.Claimed;

        emit LandlordClaimSubmitted(leaseId, amount, evidenceHash);
    }

    function acceptClaim(uint256 leaseId) external whenNotPaused nonReentrant {
        Lease storage lease = leases[leaseId];
        if (lease.tenant == address(0)) revert InvalidLease();
        if (msg.sender != lease.tenant) revert NotTenant();
        if (lease.status != LeaseStatus.Claimed) revert NoClaim();
        lease.status = LeaseStatus.Resolved;
        emit ClaimAccepted(leaseId, lease.claimedAmount);
    }

    function disputeClaim(uint256 leaseId) external whenNotPaused nonReentrant {
        Lease storage lease = leases[leaseId];
        if (lease.tenant == address(0)) revert InvalidLease();
        if (msg.sender != lease.tenant) revert NotTenant();
        if (lease.status != LeaseStatus.Claimed) revert NoClaim();
        lease.status = LeaseStatus.Disputed;
        emit ClaimDisputed(leaseId);
    }

    function resolveDispute(uint256 leaseId, uint256 tenantAmount, uint256 landlordAmount) external onlyArbiter whenNotPaused nonReentrant {
        Lease storage lease = leases[leaseId];
        if (lease.tenant == address(0)) revert InvalidLease();
        if (lease.status != LeaseStatus.Disputed) revert NotDisputed();
        if (tenantAmount + landlordAmount != lease.deposit) revert InvalidResolution();

        lease.disputeResolved = true;
        lease.resolvedTenantAmount = tenantAmount;
        lease.resolvedLandlordAmount = landlordAmount;
        lease.status = LeaseStatus.Resolved;

        emit ClaimResolved(leaseId, tenantAmount, landlordAmount);
    }

    function requestRelease(uint256 leaseId) external onlyAgent whenNotPaused nonReentrant {
        Lease storage lease = leases[leaseId];
        if (lease.tenant == address(0)) revert InvalidLease();
        if (lease.status == LeaseStatus.Released) revert AlreadyReleased();

        ReleaseRequest storage request = releaseRequests[leaseId];
        if (request.executeAfter != 0 && !request.executed) revert ReleaseAlreadyRequested();

        uint256 amount;
        if (block.timestamp >= lease.claimDeadline && lease.claimedAmount == 0) {
            amount = lease.deposit;
            lease.status = LeaseStatus.Resolved;
        } else if (lease.status == LeaseStatus.Resolved && lease.claimedAmount > 0) {
            amount = lease.deposit;
        } else {
            revert NothingToRelease();
        }

        releaseRequests[leaseId] = ReleaseRequest({
            leaseId: leaseId, amount: amount, executeAfter: block.timestamp + AGENT_DELAY, executed: false
        });

        emit ReleaseRequested(leaseId, amount, block.timestamp + AGENT_DELAY);
    }

    function executeRelease(uint256 leaseId) external whenNotPaused nonReentrant {
        ReleaseRequest storage request = releaseRequests[leaseId];
        Lease storage lease = leases[leaseId];

        if (request.executeAfter == 0) revert ReleaseNotReady();
        if (request.executed) revert AlreadyReleased();
        if (block.timestamp < request.executeAfter) revert ReleaseNotReady();
        if (lease.status == LeaseStatus.Disputed) revert NotDisputed();

        request.executed = true;
        lease.status = LeaseStatus.Released;

        uint256 yieldDue = pendingYield(leaseId);
        if (yieldDue > yieldReserve) yieldDue = yieldReserve;
        if (yieldDue > 0) {
            yieldReserve -= yieldDue;
            usdc.safeTransfer(lease.tenant, yieldDue);
            emit YieldPaid(leaseId, lease.tenant, yieldDue);
        }

        if (lease.claimedAmount == 0) {
            usdc.safeTransfer(lease.tenant, lease.deposit);
            emit DepositReleased(leaseId, lease.tenant, lease.deposit);
        } else {
            uint256 landlordAmount;
            uint256 tenantAmount;
            if (lease.disputeResolved) {
                landlordAmount = lease.resolvedLandlordAmount;
                tenantAmount = lease.resolvedTenantAmount;
            } else {
                landlordAmount = lease.claimedAmount;
                tenantAmount = lease.deposit - landlordAmount;
            }
            if (landlordAmount > 0) {
                usdc.safeTransfer(lease.landlord, landlordAmount);
                emit DepositReleased(leaseId, lease.landlord, landlordAmount);
            }
            if (tenantAmount > 0) {
                usdc.safeTransfer(lease.tenant, tenantAmount);
                emit DepositReleased(leaseId, lease.tenant, tenantAmount);
            }
        }
    }

    function requestAgentChange(address newAgent) external onlyOwner {
        if (newAgent == address(0)) revert InvalidAddress();
        pendingAgent = newAgent;
        pendingAgentTime = block.timestamp + AGENT_CHANGE_DELAY;
        emit AgentChangeRequested(newAgent, pendingAgentTime);
    }

    function executeAgentChange() external onlyOwner {
        if (pendingAgent == address(0) || block.timestamp < pendingAgentTime) revert AgentChangeNotReady();
        aiAgent = pendingAgent;
        pendingAgent = address(0);
        pendingAgentTime = 0;
        emit AgentUpdated(aiAgent);
    }

    function requestArbiterChange(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert InvalidAddress();
        pendingArbiter = newArbiter;
        pendingArbiterTime = block.timestamp + AGENT_CHANGE_DELAY;
        emit ArbiterChangeRequested(newArbiter, pendingArbiterTime);
    }

    function executeArbiterChange() external onlyOwner {
        if (pendingArbiter == address(0) || block.timestamp < pendingArbiterTime) revert ArbiterChangeNotReady();
        arbiter = pendingArbiter;
        pendingArbiter = address(0);
        pendingArbiterTime = 0;
        emit ArbiterUpdated(arbiter);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function getLease(uint256 leaseId) external view returns (Lease memory) {
        return leases[leaseId];
    }

    function vaultBalance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function isEligibleForTenantRelease(uint256 leaseId) public view returns (bool) {
        Lease memory lease = leases[leaseId];
        return (
            lease.tenant != address(0) &&
            block.timestamp >= lease.claimDeadline &&
            lease.claimedAmount == 0 &&
            lease.status != LeaseStatus.Released
        );
    }
}