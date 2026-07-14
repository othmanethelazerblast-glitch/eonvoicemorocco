import { randomUUID } from "node:crypto";
import type { MailMessage, MailProvider, SendResult } from "./provider";

/**
 * Logs the message instead of sending it, so the full invite -> onboard ->
 * review flow can be built and demoed before a real provider is wired up.
 * Every environment defaults to this until MAIL_PROVIDER is set otherwise.
 */
export class ConsoleMailProvider implements MailProvider {
  readonly providerName = "console" as const;

  async send(message: MailMessage): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.info(
      `[mailer:console] to=${message.to} subject="${message.subject}"\n${message.text ?? message.html}`,
    );
    return { delivered: true, messageId: `console-${randomUUID()}` };
  }
}
