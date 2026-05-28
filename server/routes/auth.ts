import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { signToken } from "../utils/token";
import { sendEmail, buildResetPasswordEmail } from "../utils/email";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(191),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6).max(100),
});

function publicUser(user: {
  id: bigint;
  name: string;
  email: string;
  role: "admin" | "merchant";
  isActive: boolean;
  adminNote: string | null;
}) {
  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    adminNote: user.adminNote ?? "",
  };
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data register tidak valid" });
    return;
  }

  const { name, email, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    res.status(409).json({ message: "Email sudah terdaftar" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const freePlan = await prisma.plan.findUnique({ where: { slug: "free" } });
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      ...(freePlan ? { planId: freePlan.id } : {}),
      settings: {
        create: {
          merchantName: name,
          pakasirProject: "",
          pakasirApiKey: "",
        },
      },
    },
  });
  const token = signToken({ userId: user.id.toString(), email: user.email, role: user.role });
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data login tidak valid" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    res.status(401).json({ message: "Email atau password salah" });
    return;
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ message: "Email atau password salah" });
    return;
  }

  const token = signToken({ userId: user.id.toString(), email: user.email, role: user.role });
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(req.auth!.userId) },
  });
  if (!user) {
    res.status(404).json({ message: "User tidak ditemukan" });
    return;
  }
  res.json({ user: publicUser(user) });
});

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Email tidak valid" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    res.json({ ok: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  const resetUrl = `${frontendOrigin}/reset-password?token=${token}`;

  try {
    await sendEmail(user.email, "Reset Password Pasound", buildResetPasswordEmail(resetUrl));
  } catch (err) {
    console.error("Failed to send reset email:", err);
  }

  res.json({ ok: true });
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data reset password tidak valid" });
    return;
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    res.status(400).json({ message: "Token tidak valid atau sudah kedaluwarsa" });
    return;
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  res.json({ ok: true });
});

export { router as authRouter };
