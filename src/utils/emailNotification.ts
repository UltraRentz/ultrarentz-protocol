// utils/emailNotification.ts
// Simulated email notification utility for MVP

export async function sendDepositNotification(
  renterEmail: string,
  landlordEmail: string,
  escrowId: string,
  amount: string,
  signatoryEmails: string[] = []
) {
  try {
    const res = await fetch('/api/send-deposit-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ renterEmail, landlordEmail, escrowId, amount, signatoryEmails })
    });
    if (!res.ok) throw new Error('Failed to send notification');
    return await res.json();
  } catch (err) {
    console.error('Notification error:', err);
    throw err;
  }
}
