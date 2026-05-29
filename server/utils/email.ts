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

type MerchantStatusKind = "approved" | "needs_revision" | "rejected";

function emailShell(heading: string, body: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #D71920; margin-bottom: 16px;">${heading}</h2>
      ${body}
    </div>
  `;
}

export function buildMerchantStatusEmail(kind: MerchantStatusKind, note: string | null) {
  const appUrl = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  const settingsUrl = `${appUrl}/pengaturan`;
  const noteBlock = note?.trim()
    ? `<p style="margin: 16px 0; padding: 12px 16px; background: #FFF1F1; border-radius: 12px; color: #b91c1c; font-size: 14px;">Catatan admin: ${note.trim()}</p>`
    : "";

  if (kind === "approved") {
    return emailShell(
      "Merchant Terverifikasi",
      `<p>Selamat! Data merchant kamu sudah <strong>terverifikasi</strong> dan siap menerima pembayaran QRIS.</p>
       <p style="margin: 24px 0;">
         <a href="${settingsUrl}" style="display: inline-block; background: #D71920; color: #fff; padding: 12px 32px; border-radius: 99px; text-decoration: none; font-weight: bold;">Mulai Terima Pembayaran</a>
       </p>`,
    );
  }
  if (kind === "needs_revision") {
    return emailShell(
      "Data Merchant Perlu Perbaikan",
      `<p>Admin meminta beberapa perbaikan pada data merchant kamu sebelum bisa diverifikasi.</p>
       ${noteBlock}
       <p style="margin: 24px 0;">
         <a href="${settingsUrl}" style="display: inline-block; background: #D71920; color: #fff; padding: 12px 32px; border-radius: 99px; text-decoration: none; font-weight: bold;">Perbaiki Data Merchant</a>
       </p>`,
    );
  }
  return emailShell(
    "Pendaftaran Merchant Ditolak",
    `<p>Maaf, pendaftaran merchant kamu belum bisa kami setujui.</p>
     ${noteBlock}
     <p style="font-size: 13px; color: #888;">Kamu bisa memperbaiki data dan mengajukan ulang dari halaman pengaturan.</p>`,
  );
}

const MERCHANT_STATUS_SUBJECT: Record<MerchantStatusKind, string> = {
  approved: "[Pasound] Merchant kamu sudah terverifikasi",
  needs_revision: "[Pasound] Data merchant perlu diperbaiki",
  rejected: "[Pasound] Pendaftaran merchant ditolak",
};

export async function notifyMerchantStatus(userId: bigint, kind: MerchantStatusKind, note: string | null) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) return;
    await sendEmail(user.email, MERCHANT_STATUS_SUBJECT[kind], buildMerchantStatusEmail(kind, note));
  } catch (err) {
    console.error("Failed to notify merchant about verification status:", err);
  }
}
