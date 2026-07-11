const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export class EmailError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "EmailError";
  }
}

export async function sendEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string;
  subject: string;
  htmlContent: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new EmailError("BREVO_API_KEY is not set");

  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? "showradar@andreric.com";
  const senderName = process.env.BREVO_SENDER_NAME ?? "ShowRadar";

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    throw new EmailError(`Brevo request failed: ${res.status} ${await res.text()}`, res.status);
  }
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return `<html>
  <head><meta charset="utf-8"></head>
  <body style="font-family: sans-serif; color: #111; line-height: 1.5;">
    <h1 style="font-size: 20px;">Redefinir sua senha</h1>
    <p>Recebemos um pedido para redefinir a senha da sua conta no ShowRadar.</p>
    <p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">
        Redefinir senha
      </a>
    </p>
    <p>Esse link expira em 1 hora. Se você não pediu essa redefinição, pode ignorar este e-mail.</p>
  </body>
</html>`;
}
