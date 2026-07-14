import { createHash, randomBytes } from "node:crypto";

/** One-time tokens for unauthenticated flows (prospect intake links today).
 * Only the SHA-256 hash is ever persisted — the raw token exists only in
 * the emailed URL and briefly in memory, the same discipline a
 * password-reset token gets. */
export function generateInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
