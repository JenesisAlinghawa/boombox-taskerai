// In-memory store for invite tokens (token -> email mapping)
// In production, use Redis or database for persistence
const inviteTokens = new Map<string, { email: string; createdAt: number }>();

// Cleanup expired tokens every hour
setInterval(() => {
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  for (const [token, data] of inviteTokens.entries()) {
    if (now - data.createdAt > SEVEN_DAYS) {
      inviteTokens.delete(token);
    }
  }
}, 60 * 60 * 1000); // Every hour

export function storeInviteToken(token: string, email: string): void {
  inviteTokens.set(token, {
    email: email.toLowerCase(),
    createdAt: Date.now(),
  });
}

export function getEmailFromToken(token: string): string | null {
  const data = inviteTokens.get(token);
  if (!data) return null;
  
  // Check if token is expired
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  if (now - data.createdAt > SEVEN_DAYS) {
    inviteTokens.delete(token);
    return null;
  }
  
  return data.email;
}

export function deleteInviteToken(token: string): void {
  inviteTokens.delete(token);
}
