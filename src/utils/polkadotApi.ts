import { ApiPromise, WsProvider } from '@polkadot/api';

let api: ApiPromise | null = null;

export async function getPolkadotApi(): Promise<ApiPromise> {
  if (!api) {
    const provider = new WsProvider('wss://rpc.polkadot.io'); // Use your testnet or local node here
    api = await ApiPromise.create({ provider });
  }
  return api;
}
