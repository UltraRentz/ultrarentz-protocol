// src/utils/accountAbstraction.ts
// Minimal Secure Digital Vault and Paymaster utility setup
import { Bundler, UserOperation, PaymasterAPI, SimpleAccountAPI } from '@account-abstraction/sdk';
import { ethers } from 'ethers';

// Configure your bundler and paymaster endpoints here
const BUNDLER_URL = process.env.VITE_BUNDLER_URL || '';
const PAYMASTER_URL = process.env.VITE_PAYMASTER_URL || '';

export async function create4337Account(provider: ethers.BrowserProvider, owner: ethers.Signer) {
  const bundler = new Bundler(BUNDLER_URL, provider);
  const paymaster = new PaymasterAPI(PAYMASTER_URL);
  const account = new SimpleAccountAPI({
    provider,
    owner,
    bundler,
    paymasterAPI: paymaster
  });
  return account;
}

export async function sendUserOp(account: SimpleAccountAPI, op: Partial<UserOperation>) {
  // Fill in required fields and send UserOperation
  const userOp = await account.createSignedUserOp(op);
  return account.sendUserOp(userOp);
}
