import { ConnectKitButton } from "connectkit";
import { useAccount, useReadContract } from "wagmi";
import { erc20Abi } from "viem";
import { Link } from "react-router-dom";
import { arcTestnet, getUsdc } from "@/onchain-facts";
import { formatUsdc } from "@/onchain-money";

const usdc = getUsdc(arcTestnet.id);

function UsdcBalance({ address }: { address: `0x${string}` }) {
  const { data, isLoading, isError } = useReadContract({
    address: usdc?.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address],
    chainId: arcTestnet.id,
    query: { enabled: Boolean(usdc) },
  });

  if (isLoading) return <p className="text-gray-500">Loading balance...</p>;
  if (isError || data === undefined) {
    return <p className="text-gray-500">Balance unavailable right now.</p>;
  }
  return (
    <p className="text-3xl font-semibold tabular-nums">
      {formatUsdc(arcTestnet.id, data)} <span className="text-base">USDC</span>
    </p>
  );
}

export default function Passport() {
  const { address, isConnected, chainId } = useAccount();

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <Link to="/" className="font-semibold">
          UltraRentz
        </Link>
        <ConnectKitButton />
      </header>
      <main className="max-w-md mx-auto px-4 py-8 space-y-4">
        <h1 className="text-xl font-semibold">Passport</h1>
        {!isConnected || !address ? (
          <p className="text-gray-600">
            Connect a wallet to see your Arc Testnet USDC balance.
          </p>
        ) : (
          <div className="rounded-xl border border-gray-200 p-4 space-y-2">
            <p className="text-sm text-gray-500 break-all">{address}</p>
            <UsdcBalance address={address} />
            <p className="text-xs text-gray-500">
              {chainId === arcTestnet.id
                ? "Connected to Arc Testnet."
                : "Switch your wallet to Arc Testnet to transact."}
            </p>
            <a
              className="text-sm underline"
              href={`${arcTestnet.blockExplorers.default.url}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on explorer
            </a>
          </div>
        )}
      </main>
    </>
  );
}
