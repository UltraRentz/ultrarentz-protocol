// src/services/DeFiService.ts

class DeFiService {
  // We keep it simple. The actual interaction is handled in RentPaymentFlow.tsx
  // to avoid Ethers v5 vs v6 version conflicts.
  
  static formatAPY(apy: number): string {
    return `${apy.toFixed(1)}% APY`;
  }

  static calculateExpectedYield(amount: number, apy: number, days: number = 365): number {
    return (amount * apy * days) / (365 * 100);
  }
}

export default DeFiService;