import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Pasound <noreply@notify.nyanhosting.id>",
    to,
    subject,
    html,
  });
}

export function buildResetPasswordEmail(resetUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #D71920; margin-bottom: 16px;">Reset Password Pasound</h2>
      <p>Kamu menerima email ini karena ada permintaan reset password untuk akun kamu.</p>
      <p>Klik tombol di bawah untuk mengatur password baru:</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #D71920; color: #fff; padding: 12px 32px; border-radius: 99px; text-decoration: none; font-weight: bold;">Reset Password</a>
      </p>
      <p style="font-size: 13px; color: #888;">Link ini berlaku selama 1 jam. Jika kamu tidak meminta reset password, abaikan email ini.</p>
    </div>
  `;
}
