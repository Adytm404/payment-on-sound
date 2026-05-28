import nodemailer from "nodemailer";
import { prisma } from "../db";

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

export function buildVerificationEmail(verifyUrl: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #D71920; margin-bottom: 16px;">Verifikasi Email Pasound</h2>
      <p>Selamat datang di Pasound! Silakan verifikasi email kamu untuk mulai menggunakan layanan kami.</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="display: inline-block; background: #D71920; color: #fff; padding: 12px 32px; border-radius: 99px; text-decoration: none; font-weight: bold;">Verifikasi Email</a>
      </p>
      <p style="font-size: 13px; color: #888;">Link ini berlaku selama 24 jam. Jika kamu tidak mendaftar di Pasound, abaikan email ini.</p>
    </div>
  `;
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export function buildWithdrawalNotificationEmail(data: {
  merchantName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  requestId: string;
  userNote: string | null;
}) {
  const appUrl = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  const adminUrl = `${appUrl}/admin/withdrawals/${data.requestId}`;

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #D71920; margin-bottom: 16px;">Request Penarikan Baru</h2>
      <p>Merchant <strong>${data.merchantName}</strong> mengajukan penarikan dana.</p>
      <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #888;">Request ID</td><td style="padding: 8px 0; font-weight: bold;">${data.requestId}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Nominal</td><td style="padding: 8px 0; font-weight: bold; color: #D71920;">${formatRupiah(data.amount)}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Bank</td><td style="padding: 8px 0;">${data.bankName}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">No. Rekening</td><td style="padding: 8px 0;">${data.accountNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #888;">Atas Nama</td><td style="padding: 8px 0;">${data.accountName}</td></tr>
        ${data.userNote ? `<tr><td style="padding: 8px 0; color: #888;">Catatan</td><td style="padding: 8px 0;">${data.userNote}</td></tr>` : ""}
      </table>
      <p style="margin: 24px 0;">
        <a href="${adminUrl}" style="display: inline-block; background: #D71920; color: #fff; padding: 12px 32px; border-radius: 99px; text-decoration: none; font-weight: bold;">Review di Admin Panel</a>
      </p>
    </div>
  `;
}

export async function notifyAdminsNewWithdrawal(data: {
  merchantName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  requestId: string;
  userNote: string | null;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin", isActive: true },
      select: { email: true },
    });
    if (admins.length === 0) return;

    const html = buildWithdrawalNotificationEmail(data);
    const subject = `[Pasound] Request Penarikan ${formatRupiah(data.amount)} dari ${data.merchantName}`;

    await Promise.allSettled(
      admins.map((admin) => sendEmail(admin.email, subject, html)),
    );
  } catch (err) {
    console.error("Failed to notify admins about withdrawal:", err);
  }
}
