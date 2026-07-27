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

// Cores da marca (ver components/layout/logo.tsx e app/page.tsx) hardcoded
// aqui porque e-mail não carrega Tailwind — precisam ser mantidas em sync
// manualmente se a paleta mudar.
const BRAND = {
  header: "#0F172A", // slate-900
  cta: "#0891B2", // cyan-600
  title: "#0F172A", // slate-900
  body: "#475569", // slate-600
  footer: "#94A3B8", // slate-400
  border: "#E2E8F0", // slate-200
  pageBg: "#F1F5F9", // slate-100
};

// Layout de e-mail compartilhado (tabelas + estilos inline) para compatibilidade
// com Outlook/Gmail, que ignoram <style> e boa parte do CSS moderno.
function emailShell({
  preheader,
  heroImageUrl,
  title,
  body,
  ctaLabel,
  ctaUrl,
  footerNote,
}: {
  preheader: string;
  heroImageUrl?: string | null;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}): string {
  const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/email-logo`;

  return `<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin: 0; padding: 0; background: ${BRAND.pageBg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${BRAND.pageBg};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid ${BRAND.border};">
            <tr>
              <td align="center" style="background: ${BRAND.header}; padding: 20px;">
                <img src="${logoUrl}" width="160" height="36" alt="ShowRadar" style="display: block;">
              </td>
            </tr>
            ${
              heroImageUrl
                ? `<tr>
              <td>
                <img src="${heroImageUrl}" width="480" alt="" style="display: block; width: 100%; height: auto; background: ${BRAND.header};">
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding: 28px 28px 8px;">
                <h1 style="margin: 0 0 12px; font-size: 20px; line-height: 1.3; color: ${BRAND.title};">${title}</h1>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: ${BRAND.body};">${body}</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 20px 28px 28px;">
                <a href="${ctaUrl}" style="display: inline-block; padding: 12px 24px; background: ${BRAND.cta}; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">${ctaLabel}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 28px 24px; border-top: 1px solid ${BRAND.border};">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: ${BRAND.footer};">${footerNote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return emailShell({
    preheader: "Redefina sua senha do ShowRadar",
    title: "Redefinir sua senha",
    body: "Recebemos um pedido para redefinir a senha da sua conta no ShowRadar. Esse link expira em 1 hora.",
    ctaLabel: "Redefinir senha",
    ctaUrl: resetUrl,
    footerNote: "Se você não pediu essa redefinição, pode ignorar este e-mail.",
  });
}

export function notificationEmailHtml({
  title,
  body,
  url,
  imageUrl,
}: {
  title: string;
  body: string;
  url: string;
  imageUrl?: string | null;
}): string {
  return emailShell({
    preheader: body,
    heroImageUrl: imageUrl,
    title,
    body,
    ctaLabel: "Ver no ShowRadar",
    ctaUrl: url,
    footerNote:
      "Você recebeu este e-mail porque tem notificações por e-mail ativadas no ShowRadar. Pode desativar a qualquer momento em Configurações.",
  });
}
