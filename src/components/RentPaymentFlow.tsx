import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { ethers } from 'ethers';

const VAULT_ADDRESS = "0xDc7F1A35181C2d607F79616Ab48D81d1144d9244";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const LEASE_ID = 1;

const VAULT_ABI = [
  "function fundLease(uint256 leaseId) external",
  "function pendingYield(uint256 leaseId) view returns (uint256)",
  "function requestRelease(uint256 leaseId) external",
  "function executeRelease(uint256 leaseId) external",
  "function getLease(uint256 leaseId) view returns (tuple(address tenant,address landlord,bytes32 leaseHash,uint256 deposit,uint256 startTime,uint256 endTime,uint256 claimDeadline,uint256 claimedAmount,uint8 status,bool disputeResolved,uint256 resolvedTenantAmount,uint256 resolvedLandlordAmount,bytes32 claimEvidenceHash))"
];

const ERC20_ABI = ["function approve(address spender, uint256 amount) external returns (bool)"];

const ARC_TESTNET_PARAMS = {
  chainId: "0x4cef52",
  chainName: "Arc Testnet",
  rpcUrls: ["https://rpc.testnet.arc.network"],
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  blockExplorerUrls: ["https://testnet.arcscan.app"],
};

const RentPaymentFlow = () => {
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [status, setStatus] = useState<'DISCONNECTED' | 'FUNDING' | 'FUNDED' | 'RELEASE_REQUESTED' | 'RELEASED'>('DISCONNECTED');
  const [yieldAmount, setYieldAmount] = useState('0');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    if (!window.ethereum) return alert("No wallet found");
    try {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: ARC_TESTNET_PARAMS.chainId }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [ARC_TESTNET_PARAMS],
          });
        } else {
          throw switchError;
        }
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      setSigner(await provider.getSigner());
      setStatus('FUNDING');
    } catch (err) {
      console.error(err);
      alert("Wallet connection failed.");
    }
  };

  const handleFund = async () => {
    if (!signer) return;
    setBusy(true);
    try {
      const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
      const lease = await vault.getLease(LEASE_ID);
      await (await usdc.approve(VAULT_ADDRESS, lease.deposit)).wait();
      await (await vault.fundLease(LEASE_ID)).wait();
      setStatus('FUNDED');
    } catch (err) {
      console.error(err);
      alert("Funding failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestRelease = async () => {
    if (!signer) return;
    setBusy(true);
    try {
      const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
      await (await vault.requestRelease(LEASE_ID)).wait();
      setStatus('RELEASE_REQUESTED');
    } catch (err) {
      console.error(err);
      alert("Release request failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleExecuteRelease = async () => {
    if (!signer) return;
    setBusy(true);
    try {
      const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, signer);
      await (await vault.executeRelease(LEASE_ID)).wait();
      setStatus('RELEASED');
    } catch (err) {
      console.error(err);
      alert("Execute release failed — check the 1hr delay has elapsed.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (status !== 'FUNDED' || !signer) return;
    const provider = signer.provider!;
    const vault = new ethers.Contract(VAULT_ADDRESS, VAULT_ABI, provider);
    const poll = async () => {
      const y = await vault.pendingYield(LEASE_ID);
      setYieldAmount(ethers.formatUnits(y, 6));
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [status, signer]);

  return (
    <div className="max-w-xl mx-auto bg-neutral-900 border border-neutral-800 rounded-[32px] p-8 shadow-2xl">
      <h2 className="text-xl font-black mb-8 flex items-center gap-2">
        UltraRentz Vault <Shield size={20} className="text-emerald-400" />
      </h2>

      {status === 'DISCONNECTED' && (
        <button onClick={connect} className="w-full bg-blue-600 py-4 rounded-2xl font-bold">
          Connect wallet
        </button>
      )}

      {status === 'FUNDING' && (
        <button onClick={handleFund} disabled={busy} className="w-full bg-white text-black py-4 rounded-2xl font-bold">
          {busy ? "Securing..." : "Fund deposit (5% simple APY)"}
        </button>
      )}

      {status === 'FUNDED' && (
        <div className="space-y-6">
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
            <p className="text-neutral-500 text-xs uppercase mb-2">Live accrued yield (USDC)</p>
            <p className="text-2xl font-mono text-emerald-400">{yieldAmount}</p>
          </div>
          <button onClick={handleRequestRelease} disabled={busy} className="w-full bg-white text-black py-4 rounded-2xl font-bold">
            {busy ? "Requesting..." : "Request release (tenancy ended)"}
          </button>
        </div>
      )}

      {status === 'RELEASE_REQUESTED' && (
        <div className="space-y-4">
          <p className="text-neutral-400 text-sm">Release requested. 1hr safety delay in progress — no funds move until it elapses.</p>
          <button onClick={handleExecuteRelease} disabled={busy} className="w-full bg-white text-black py-4 rounded-2xl font-bold">
            {busy ? "Executing..." : "Execute release"}
          </button>
        </div>
      )}

      {status === 'RELEASED' && (
        <div className="p-8 text-center bg-emerald-950/20 border border-emerald-900/50 rounded-2xl">
          <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold">Deposit + yield released</h3>
        </div>
      )}
    </div>
  );
};

export default RentPaymentFlow;