// Email delivery interface. For now messages are printed to the console;
// a real provider (SMTP, Resend, ...) can implement EmailSender later.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export const consoleEmailSender: EmailSender = {
  async send(message) {
    console.log(
      `\n[email] To: ${message.to}\n[email] Subject: ${message.subject}\n${message.text}\n`,
    );
  },
};

let sender: EmailSender = consoleEmailSender;

export function setEmailSender(next: EmailSender): void {
  sender = next;
}

export function sendEmail(message: EmailMessage): Promise<void> {
  return sender.send(message);
}
