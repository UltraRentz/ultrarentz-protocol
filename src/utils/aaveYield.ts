// Utility for interacting with Aave v3 from the backend/frontend
import { ethers } from "ethers";

// Replace with actual Aave Pool and aToken addresses for your network
export const AAVE_POOL_ADDRESS = "0x...";
export const AAVE_ATOKEN_ADDRESS = "0x...";

export const AAVE_POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external",
  "function withdraw(address asset, uint256 amount, address to) external returns (uint256)"
];

export const ATOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)"
];

export async function supplyToAave(provider: ethers.providers.Provider, signer: ethers.Signer, amount: ethers.BigNumberish) {
  const pool = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, signer);
  // Approve pool to spend tokens first (not shown here)
  // Call supply
  return await pool.supply(AAVE_ATOKEN_ADDRESS, amount, await signer.getAddress(), 0);
}

export async function withdrawFromAave(provider: ethers.providers.Provider, signer: ethers.Signer, amount: ethers.BigNumberish) {
  const pool = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, signer);
  return await pool.withdraw(AAVE_ATOKEN_ADDRESS, amount, await signer.getAddress());
}

export async function getAaveYield(provider: ethers.providers.Provider, userAddress: string) {
  const aToken = new ethers.Contract(AAVE_ATOKEN_ADDRESS, ATOKEN_ABI, provider);
  return await aToken.balanceOf(userAddress);
}
