// utils/kycProvider.ts
// Simulated KYC provider integration for MVP

export interface KYCStatus {
  [email: string]: 'pending' | 'verified' | 'failed';
}

// Simulate starting a KYC check (in real app, call provider API)
export async function startKYC(email: string): Promise<'pending'> {
  // In production, trigger KYC provider (e.g., Onfido, Persona, Stripe Identity)
  // Here, just simulate a delay
  return new Promise((resolve) => setTimeout(() => resolve('pending'), 1000));
}

// Simulate KYC verification result (in real app, provider would callback)
export async function simulateKYCResult(email: string): Promise<'verified' | 'failed'> {
  // Simulate random pass/fail for demo
  return new Promise((resolve) => setTimeout(() => {
    const result = Math.random() > 0.1 ? 'verified' : 'failed';
    resolve(result);
  }, 3000));
}
