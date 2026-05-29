import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db";

export async function requireActiveUser(req: Request, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(req.auth!.userId) },
    select: { isActive: true, adminNote: true },
  });

  if (!user) {
    res.status(404).json({ message: "User tidak ditemukan" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ message: user.adminNote || "Akun dinonaktifkan oleh admin" });
    return;
  }
  next();
}

/**
 * Ensures the user is active AND has a verified email. Use on actions that
 * should be gated behind email verification (creating payments, withdrawals,
 * submitting KYC). Returns 403 with code "email_unverified" so the frontend can
 * surface a tailored message.
 */
export async function requireVerifiedEmail(req: Request, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(req.auth!.userId) },
    select: { isActive: true, adminNote: true, emailVerified: true },
  });

  if (!user) {
    res.status(404).json({ message: "User tidak ditemukan" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ message: user.adminNote || "Akun dinonaktifkan oleh admin" });
    return;
  }
  if (!user.emailVerified) {
    res.status(403).json({ code: "email_unverified", message: "Verifikasi email kamu dulu untuk melanjutkan." });
    return;
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(req.auth!.userId) },
    select: { role: true, isActive: true },
  });

  if (!user || user.role !== "admin") {
    res.status(403).json({ message: "Akses admin ditolak" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ message: "Akun admin nonaktif" });
    return;
  }
  next();
}
