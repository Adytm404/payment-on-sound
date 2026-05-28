import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireActiveUser } from "../middleware/admin";
import { broadcastToUser } from "../realtime";
import { toJson } from "../utils/json";
import { generateOrderId } from "../utils/orderId";
import { getWithdrawalSummary, MINIMUM_WITHDRAWAL } from "../utils/withdrawals";
import { notifyAdminsNewWithdrawal } from "../utils/email";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  amount: z.number().int().min(MINIMUM_WITHDRAWAL),
  userNote: z.string().max(1000).optional().nullable(),
});

router.get("/summary", async (req, res) => {
  const summary = await getWithdrawalSummary(BigInt(req.auth!.userId));
  res.json({ summary: toJson(summary) });
});

router.get("/", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ data: toJson(withdrawals) });
});

router.post("/", requireActiveUser, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data penarikan tidak valid" });
    return;
  }

  const userId = BigInt(req.auth!.userId);
  const summary = await getWithdrawalSummary(userId);
  if (summary.merchantStatus !== "verified") {
    res.status(403).json({ message: "Data merchant belum diverifikasi admin" });
    return;
  }
  if (!summary.bank.code || !summary.bank.name || !summary.bank.accountNumber || !summary.bank.accountName) {
    res.status(400).json({ message: "Rekening penarikan belum lengkap" });
    return;
  }
  if (summary.hasActiveRequest) {
    res.status(409).json({ message: "Masih ada request penarikan yang aktif" });
    return;
  }
  if (parsed.data.amount > summary.availableBalance) {
    res.status(400).json({ message: "Saldo tersedia tidak mencukupi. Beberapa transaksi mungkin masih menunggu settlement H+1 pukul 12.00 WIB." });
    return;
  }

  const withdrawal = await prisma.withdrawalRequest.create({
    data: {
      userId,
      requestId: generateOrderId("WD"),
      amount: parsed.data.amount,
      bankCode: summary.bank.code,
      bankName: summary.bank.name,
      accountNumber: summary.bank.accountNumber,
      accountName: summary.bank.accountName,
      userNote: parsed.data.userNote?.trim() || null,
    },
  });
  broadcastToUser(userId, "withdrawal:created", { type: "withdrawal:created", requestId: withdrawal.requestId, status: withdrawal.status });

  const settings = await prisma.userSettings.findUnique({ where: { userId }, select: { merchantName: true } });
  notifyAdminsNewWithdrawal({
    merchantName: settings?.merchantName ?? "Merchant",
    amount: withdrawal.amount,
    bankName: withdrawal.bankName,
    accountNumber: withdrawal.accountNumber,
    accountName: withdrawal.accountName,
    requestId: withdrawal.requestId,
    userNote: withdrawal.userNote,
  });

  res.status(201).json({ withdrawal: toJson(withdrawal) });
});

router.post("/:requestId/cancel", requireActiveUser, async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const requestId = String(req.params.requestId);
  const withdrawal = await prisma.withdrawalRequest.findFirst({ where: { userId, requestId } });
  if (!withdrawal) {
    res.status(404).json({ message: "Request penarikan tidak ditemukan" });
    return;
  }
  if (withdrawal.status !== "pending") {
    res.status(400).json({ message: "Request hanya bisa dibatalkan saat masih pending" });
    return;
  }
  const updated = await prisma.withdrawalRequest.update({
    where: { id: withdrawal.id },
    data: { status: "cancelled", adminNote: String(req.body.adminNote ?? withdrawal.adminNote ?? "") || null },
  });
  broadcastToUser(userId, "withdrawal:updated", { type: "withdrawal:updated", requestId: updated.requestId, status: updated.status });
  res.json({ withdrawal: toJson(updated) });
});

export { router as withdrawalsRouter };
