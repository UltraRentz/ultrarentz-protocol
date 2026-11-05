// utils/emailVerification.ts
// Simulated email verification utility for MVP

export interface EmailVerificationStatus {
  [email: string]: boolean; // true if verified
}

// Simulate sending a verification email (in real app, call backend API)
export async function sendVerificationEmail(email: string): Promise<void> {
  // In production, trigger backend to send email with a unique link/token
  // Here, just simulate a delay
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

// Simulate verifying the email (in real app, user clicks link)
export async function verifyEmail(email: string): Promise<boolean> {
  // In production, backend would mark email as verified after link click
  // Here, just simulate success
  return new Promise((resolve) => setTimeout(() => resolve(true), 1000));
}
