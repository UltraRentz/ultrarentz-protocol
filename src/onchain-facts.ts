import { defineChain, type Chain } from "viem";

/**
 * Network facts for the chains this app supports.
 * Values come from the Arc docs (https://docs.arc.io). On Arc the native gas
 * asset is USDC: 18 decimals in the native view, 6 decimals in the ERC-20 view.
 */

const ARC_USDC = "0x3600000000000000000000000000000000000000" as const;

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.io"] } },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://explorer.testnet.arc.io" },
  },
  testnet: true,
});

export const arcMainnet = defineChain({
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.mainnet.arc.io"] } },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://explorer.arc.io" },
  },
});

export const ONCHAIN_CHAINS: readonly Chain[] = [arcTestnet, arcMainnet];
export const TESTNET_ONCHAIN_CHAINS: readonly Chain[] = ONCHAIN_CHAINS.filter(
  (c) => c.testnet,
);

export interface UsdcFact {
  address: `0x${string}`;
  /** Decimals of the ERC-20 view. Use this for balances, transfers and display. */
  decimals: number;
}

const USDC_BY_CHAIN: Record<number, UsdcFact> = {
  [arcTestnet.id]: { address: ARC_USDC, decimals: 6 },
  [arcMainnet.id]: { address: ARC_USDC, decimals: 6 },
};

export function getChain(chainId: number): Chain | undefined {
  return ONCHAIN_CHAINS.find((c) => c.id === chainId);
}

export function requireChain(chainId: number): Chain {
  const chain = getChain(chainId);
  if (!chain) throw new Error(`Unsupported chain ${chainId}`);
  return chain;
}

export function getUsdc(chainId: number): UsdcFact | undefined {
  return USDC_BY_CHAIN[chainId];
}

export function buildTxExplorerUrl(chainId: number, hash: string): string {
  const base = requireChain(chainId).blockExplorers?.default.url;
  if (!base) throw new Error(`No explorer for chain ${chainId}`);
  return `${base}/tx/${hash}`;
}
