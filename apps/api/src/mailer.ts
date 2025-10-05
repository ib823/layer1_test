import nodemailer from 'nodemailer';

export function makeTransport() {
  const host = process.env.SMTP_HOST || 'localhost';
  const port = Number(process.env.SMTP_PORT || 1025);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const auth = user ? { user, pass } : undefined;

  return nodemailer.createTransport({ host, port, secure, auth });
}

export async function sendMagicLink(email: string, url: string) {
  const from = process.env.SMTP_FROM || 'no-reply@sapmvp.local';
  const transport = makeTransport();
  await transport.sendMail({
    from,
    to: email,
    subject: 'Your sign-in link',
    text: `Click to sign in: ${url}`,
    html: `<p>Click to sign in:</p><p><a href="${url}">${url}</a></p>`
  });
}
