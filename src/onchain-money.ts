import { formatUnits, parseUnits } from "viem";
import { getUsdc, requireChain } from "./onchain-facts";

/**
 * USDC amount helpers. On Arc, native gas and the USDC ERC-20 are the same
 * pool of funds seen at two scales (18 vs 6 decimals). Convert only with the
 * functions below, never with a hand-written rescale.
 */

export function usdcDecimalsFor(chainId: number): number {
  const usdc = getUsdc(chainId);
  if (!usdc) throw new Error(`USDC is not available on chain ${chainId}`);
  return usdc.decimals;
}

export function nativeDecimalsFor(chainId: number): number {
  return requireChain(chainId).nativeCurrency.decimals;
}

/** Parse user input such as "12.5" into raw ERC-20 USDC units. */
export function parseUsdc(chainId: number, input: string): bigint {
  return parseUnits(input.trim(), usdcDecimalsFor(chainId));
}

/** Format raw ERC-20 USDC units for display. */
export function formatUsdc(chainId: number, raw: bigint, maxFraction = 2): string {
  const [whole, frac = ""] = formatUnits(raw, usdcDecimalsFor(chainId)).split(".");
  const trimmed = frac.slice(0, maxFraction).padEnd(Math.min(2, maxFraction), "0");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

/** ERC-20 USDC units to native (gas / msg.value) units. */
export function usdcToGasToken(chainId: number, usdcRaw: bigint): bigint {
  const shift = nativeDecimalsFor(chainId) - usdcDecimalsFor(chainId);
  return usdcRaw * 10n ** BigInt(shift);
}

/** Native (gas / msg.value) units to ERC-20 USDC units, rounded down. */
export function gasTokenToUsdc(chainId: number, nativeRaw: bigint): bigint {
  const shift = nativeDecimalsFor(chainId) - usdcDecimalsFor(chainId);
  return nativeRaw / 10n ** BigInt(shift);
}
