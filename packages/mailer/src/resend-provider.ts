import type { MailMessage, MailProvider, SendResult } from "./provider";

/**
 * Talks to Resend's HTTP API directly (fetch, no SDK dependency) — one POST,
 * one response shape, not worth a wrapper library. Swap points documented in
 * ./provider.ts.
 */
export class ResendMailProvider implements MailProvider {
  readonly providerName = "resend" as const;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<SendResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { delivered: false, error: `Resend ${res.status}: ${body || res.statusText}` };
    }

    const data = (await res.json()) as { id: string };
    return { delivered: true, messageId: data.id };
  }
}
