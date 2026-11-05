// Fetches the latest URZ/ETH/USDC/fiat price using a public API (placeholder for Chainlink oracle integration)
// In production, replace with on-chain Chainlink oracle or backend API

export async function fetchTokenPrice(symbol: string, vsCurrency: string = 'gbp'): Promise<number | null> {
  try {
    // Example: Use CoinGecko API for demo
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbol}&vs_currencies=${vsCurrency}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data[symbol] && data[symbol][vsCurrency]) {
      return data[symbol][vsCurrency];
    }
    return null;
  } catch (err) {
    return null;
  }
}
