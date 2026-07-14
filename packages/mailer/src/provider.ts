export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type SendResult = { delivered: true; messageId: string } | { delivered: false; error: string };

/**
 * The single integration point for outbound transactional email (prospect
 * invites today; invoice delivery, digest emails, etc. later). No real
 * provider (Resend/SES/Postmark) is wired up yet, so the product ships
 * against `ConsoleMailProvider`. When one is picked, a new class
 * implementing this interface is the only new code required — no changes
 * to callers.
 */
export interface MailProvider {
  readonly providerName: "console" | "resend" | "ses";
  send(message: MailMessage): Promise<SendResult>;
}
