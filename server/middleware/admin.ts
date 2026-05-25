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
