// /passport: the Deposit Passport flow (Arc + Arkiv + World ID Agent Pass).
//   1. Read the passport from Arkiv, re-hash it, compare with the hash stored on Arc.
//   2. Human check: World ID step-up, validated in our backend (/api/world-*). Backend signs only if it passes.
//   3. Roll the rent deposit over to the new tenancy on Arc using that signed approval.
import { useEffect, useState } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { formatUnits, parseAbi, parseGwei, type Hex } from "viem";
import { canonicalJson, hashBundle, readPassport, type EvidenceBundle } from "../lib/arkivPassport";

const env = import.meta.env as Record<string, string | undefined>;
const VAULT = (env.VITE_VAULT_V2_ADDRESS ?? "0xa79059db1cD0f5220959B484B89993b04b0E7578") as Hex;
const ARKIV_KEY = env.VITE_ARKIV_ACCESS_KEY ?? "";
const EXPLORER = (env.VITE_EXPLORER_URL ?? "https://testnet.arcscan.app").replace(/\/$/, "");
// Arc rejects transactions with maxFeePerGas below 20 Gwei.
const FEES = { maxFeePerGas: parseGwei("25"), maxPriorityFeePerGas: parseGwei("1") } as const;

const vaultAbi = parseAbi([
  "function passportHash(uint256) view returns (bytes32)",
  "function usdc() view returns (address)",
  "function getLease(uint256) view returns ((address tenant,address landlord,bytes32 leaseHash,uint256 deposit,uint256 startTime,uint256 endTime,uint256 claimDeadline,uint256 claimedAmount,uint8 status,bool disputeResolved,uint256 resolvedTenantAmount,uint256 resolvedLandlordAmount,bytes32 claimEvidenceHash))",
  "function rollover(uint256 oldLeaseId,uint256 newLeaseId,uint256 deadline,uint256 nonce,bytes signature)",
]);
const erc20Abi = parseAbi([
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
]);

const WORLD_ERRORS: Record<string, string> = {
  access_denied: "You declined the human check. No approval was issued and nothing moved.",
  attempt_expired: "The check took too long and expired. No approval was issued. Start again.",
  not_fresh: "That sign-in was not fresh for this transaction. No approval was issued.",
  assurance_too_low: "The credential was not strong enough. No approval was issued.",
  nonce_mismatch: "The response did not match this request. No approval was issued.",
  id_token_invalid: "The identity result could not be validated. No approval was issued.",
  invalid_state: "The request could not be recognised. No approval was issued.",
  token_exchange_failed: "World did not confirm the check. No approval was issued.",
  login_required: "A fresh sign-in was required. No approval was issued.",
  no_passport_recorded: "This tenancy has no passport recorded on Arc, so there is nothing to roll over.",
  not_your_tenancy: "The connected wallet is not the tenant of both tenancies.",
  new_tenancy_already_funded: "The new tenancy already has a deposit.",
};
const explain = (code: string) => WORLD_ERRORS[code] ?? `The check did not pass (${code}). No approval was issued.`;

type Approval = { sig: Hex; old: string; new: string; nonce: string; deadline: string; tenant: string };
const short = (h?: string) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "");
const usdc = (n?: bigint) => (n === undefined ? "?" : `${formatUnits(n, 6)} USDC`);

function Card({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-slate-800 p-5 space-y-3">
      <h2 className="text-lg font-semibold"><span className="mr-2 text-emerald-400">{n}.</span>{title}</h2>
      {children}
    </section>
  );
}
const Btn = (p: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-900 disabled:opacity-40 ${p.className ?? ""}`} />
);

export default function Passport() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: wallet } = useWalletClient();
  const q = new URLSearchParams(window.location.search);
  const [oldId, setOldId] = useState(q.get("old") ?? env.VITE_DEMO_OLD_ID ?? "1");
  const [newId, setNewId] = useState(q.get("new") ?? env.VITE_DEMO_NEW_ID ?? "2");

  const [onchain, setOnchain] = useState<Hex | null>(null);
  const [arkiv, setArkiv] = useState<{ entityKey: Hex; storedHash: string; recomputedHash: Hex; bundle: EvidenceBundle } | null>(null);
  const [arkivMsg, setArkivMsg] = useState("");
  const [tamper, setTamper] = useState<{ hash: Hex; field: string } | null>(null);
  const [deposits, setDeposits] = useState<{ old?: bigint; new?: bigint }>({});
  const [approval, setApproval] = useState<Approval | null>(null);
  const [worldMsg, setWorldMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [tx, setTx] = useState<{ approve?: Hex; rollover?: Hex } | null>(null);
  const [err, setErr] = useState("");

  // Returning from World: the backend put the result in the URL fragment.
  useEffect(() => {
    const f = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (f.get("world_error")) setWorldMsg(explain(f.get("world_error")!));
    else if (f.get("approval")) {
      const a: Approval = { sig: f.get("approval") as Hex, old: f.get("old")!, new: f.get("new")!, nonce: f.get("nonce")!, deadline: f.get("deadline")!, tenant: f.get("tenant")! };
      try { sessionStorage.setItem("ur_approval", JSON.stringify(a)); } catch { /* storage may be blocked */ }
      setApproval(a); setOldId(a.old); setNewId(a.new);
      setWorldMsg("Human check passed. The backend signed an approval for this rollover only.");
    } else {
      try { const s = sessionStorage.getItem("ur_approval"); if (s) setApproval(JSON.parse(s)); } catch { /* ignore */ }
    }
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function loadChain() {
    if (!publicClient) return;
    const [h, o, n] = await Promise.all([
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "passportHash", args: [BigInt(oldId)] }),
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "getLease", args: [BigInt(oldId)] }),
      publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "getLease", args: [BigInt(newId)] }),
    ]);
    setOnchain(h as Hex);
    setDeposits({ old: (o as any).deposit, new: (n as any).deposit });
  }
  useEffect(() => { loadChain().catch(() => setErr("Could not read the vault on Arc.")); /* eslint-disable-next-line */ }, [publicClient, oldId, newId]);

  async function verify() {
    setBusy("arkiv"); setErr(""); setTamper(null);
    try {
      const r = await readPassport(ARKIV_KEY, oldId);
      if (!r) { setArkiv(null); setArkivMsg("No passport found on Arkiv for this tenancy (records expire after 30 days)."); }
      else { setArkiv(r); setArkivMsg(""); }
      await loadChain();
    } catch (e: any) { setErr(`Arkiv read failed: ${e?.message ?? e}`); }
    setBusy("");
  }

  function tamperTest() {
    if (!arkiv) return;
    const edited = { ...arkiv.bundle, summary: arkiv.bundle.summary + " (edited)" };
    setTamper({ hash: hashBundle(edited), field: "summary" });
  }

  async function startWorld() {
    if (!address) return;
    setBusy("world"); setErr(""); setWorldMsg("");
    try {
      const r = await fetch(`/api/world-start?tenant=${address}&oldId=${oldId}&newId=${newId}`);
      const j = await r.json();
      if (!j.ok) setWorldMsg(explain(j.error));
      else window.location.href = j.url;
    } catch { setErr("Could not reach the approval service."); }
    setBusy("");
  }

  async function rollover() {
    if (!approval || !wallet || !publicClient || !address) return;
    setBusy("tx"); setErr(""); setTx(null);
    try {
      const diff = (deposits.new ?? 0n) - (deposits.old ?? 0n);
      const out: { approve?: Hex; rollover?: Hex } = {};
      if (diff > 0n) {
        const token = (await publicClient.readContract({ address: VAULT, abi: vaultAbi, functionName: "usdc" })) as Hex;
        const have = (await publicClient.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [address, VAULT] })) as bigint;
        if (have < diff) {
          out.approve = await wallet.writeContract({ address: token, abi: erc20Abi, functionName: "approve", args: [VAULT, diff], chain: wallet.chain, account: address, ...FEES });
          await publicClient.waitForTransactionReceipt({ hash: out.approve });
        }
      }
      out.rollover = await wallet.writeContract({
        address: VAULT, abi: vaultAbi, functionName: "rollover",
        args: [BigInt(approval.old), BigInt(approval.new), BigInt(approval.deadline), BigInt(approval.nonce), approval.sig],
        chain: wallet.chain, account: address, ...FEES,
      });
      await publicClient.waitForTransactionReceipt({ hash: out.rollover });
      setTx(out);
      try { sessionStorage.removeItem("ur_approval"); } catch { /* ignore */ }
      setApproval(null);
      await loadChain();
    } catch (e: any) { setErr(`Rollover failed: ${e?.shortMessage ?? e?.message ?? e}`); }
    setBusy("");
  }

  const topUp = (deposits.new ?? 0n) - (deposits.old ?? 0n);
  const match = arkiv && onchain && arkiv.storedHash === arkiv.recomputedHash && arkiv.recomputedHash.toLowerCase() === onchain.toLowerCase();
  const noPassport = onchain !== null && /^0x0+$/.test(onchain);

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-white">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Deposit Passport</h1>
            <p className="text-sm text-slate-300">Move your rent deposit to your next tenancy without paying two deposits. Testnet, practice money only.</p>
          </div>
          <ConnectKitButton />
        </div>

        <div className="flex gap-3 text-sm">
          <label>Old tenancy # <input value={oldId} onChange={(e) => setOldId(e.target.value.replace(/\D/g, ""))} className="ml-1 w-16 rounded bg-slate-700 px-2 py-1" /></label>
          <label>New tenancy # <input value={newId} onChange={(e) => setNewId(e.target.value.replace(/\D/g, ""))} className="ml-1 w-16 rounded bg-slate-700 px-2 py-1" /></label>
        </div>

        <Card n={1} title="Check the record (Arkiv vs Arc)">
          <p className="text-sm text-slate-300">The evidence bundle lives on Arkiv. Arc stores only its fingerprint. We fetch the bundle, hash it again and compare.</p>
          <Btn onClick={verify} disabled={busy === "arkiv"}>{busy === "arkiv" ? "Reading Arkiv…" : "Verify from Arkiv"}</Btn>
          {noPassport && <p className="text-sm text-amber-300">No passport has been recorded on Arc for tenancy {oldId} yet.</p>}
          {arkivMsg && <p className="text-sm text-amber-300">{arkivMsg}</p>}
          {arkiv && (
            <div className="space-y-2 text-sm">
              <p className={match ? "text-emerald-400" : "text-red-400"}>{match ? "Match: the record on Arkiv is exactly what Arc fingerprinted." : "MISMATCH: the record does not match the fingerprint on Arc."}</p>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-2 gap-y-1 break-all text-slate-300">
                <dt>Arkiv entity</dt><dd>{short(arkiv.entityKey)}</dd>
                <dt>Hash of Arkiv data</dt><dd>{arkiv.recomputedHash}</dd>
                <dt>Hash stored on Arc</dt><dd>{onchain}</dd>
                <dt>Summary</dt><dd>{arkiv.bundle.summary}</dd>
                <dt>Documents</dt><dd>{arkiv.bundle.documents.map((d) => d.name).join(", ")}</dd>
              </dl>
              <details><summary className="cursor-pointer text-slate-400">Show the exact bytes that were hashed</summary><pre className="whitespace-pre-wrap break-all text-xs text-slate-400">{canonicalJson(arkiv.bundle)}</pre></details>
              <Btn className="bg-slate-600 text-white" onClick={tamperTest}>Tamper test: change one field</Btn>
              {tamper && (
                <p className="text-red-400">Changed the {tamper.field}: new hash {short(tamper.hash)} no longer equals {short(onchain ?? "")} on Arc. Any edit is caught.</p>
              )}
            </div>
          )}
        </Card>

        <Card n={2} title="Human check (World ID)">
          <p className="text-sm text-slate-300">Before the deposit moves, a real person must confirm. Our backend validates the World result and only then signs an approval for this exact rollover.</p>
          <Btn onClick={startWorld} disabled={!address || busy === "world" || noPassport}>{busy === "world" ? "Opening World…" : "Confirm I am a person"}</Btn>
          {!address && <p className="text-sm text-slate-400">Connect your wallet first.</p>}
          {worldMsg && <p className={`text-sm ${approval ? "text-emerald-400" : "text-amber-300"}`}>{worldMsg}</p>}
        </Card>

        <Card n={3} title="Roll the deposit over (Arc)">
          <p className="text-sm text-slate-300">
            Old deposit {usdc(deposits.old)} → new deposit {usdc(deposits.new)}.
            {topUp > 0n && ` You top up ${usdc(topUp)}.`}{topUp < 0n && ` You are refunded ${usdc(-topUp)}.`} Interest earned on the old tenancy is paid to you.
          </p>
          <Btn onClick={rollover} disabled={!approval || !wallet || busy === "tx"}>{busy === "tx" ? "Waiting for Arc…" : "Roll over deposit"}</Btn>
          {!approval && <p className="text-sm text-slate-400">Locked until the human check in step 2 passes. Without an approval the contract rejects the rollover.</p>}
          {tx?.rollover && (
            <p className="text-sm text-emerald-400">
              Done. <a className="underline" href={`${EXPLORER}/tx/${tx.rollover}`} target="_blank" rel="noreferrer">View the transaction</a>
              {tx.approve && <> (top-up approval: <a className="underline" href={`${EXPLORER}/tx/${tx.approve}`} target="_blank" rel="noreferrer">tx</a>)</>}
            </p>
          )}
        </Card>

        {err && <p className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{err}</p>}
        <p className="text-xs text-slate-500">Vault {VAULT}. Testnet only, unaudited. World proofs here use sandbox identities.</p>
      </div>
    </div>
  );
}
