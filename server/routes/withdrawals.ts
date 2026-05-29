import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireActiveUser, requireVerifiedEmail } from "../middleware/admin";
import { broadcastToUser } from "../realtime";
import { toJson } from "../utils/json";
import { generateOrderId } from "../utils/orderId";
import { getWithdrawalSummary, MINIMUM_WITHDRAWAL } from "../utils/withdrawals";
import { notifyAdminsNewWithdrawal } from "../utils/email";

const router = Router();
router.use(requireAuth);

class WithdrawalError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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

router.post("/", requireVerifiedEmail, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data penarikan tidak valid" });
    return;
  }

  const userId = BigInt(req.auth!.userId);
  try {
    const withdrawal = await prisma.$transaction(async (tx) => {
      const summary = await getWithdrawalSummary(userId, tx);
      if (summary.merchantStatus !== "verified") {
        throw new WithdrawalError(403, "Data merchant belum diverifikasi admin");
      }
      if (!summary.bank.code || !summary.bank.name || !summary.bank.accountNumber || !summary.bank.accountName) {
        throw new WithdrawalError(400, "Rekening penarikan belum lengkap");
      }
      if (summary.hasActiveRequest) {
        throw new WithdrawalError(409, "Masih ada request penarikan yang aktif");
      }
      if (parsed.data.amount > summary.availableBalance) {
        throw new WithdrawalError(400, "Saldo tersedia tidak mencukupi. Beberapa transaksi mungkin masih menunggu settlement H+1 pukul 12.00 WIB.");
      }

      return tx.withdrawalRequest.create({
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
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

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
  } catch (err) {
    if (err instanceof WithdrawalError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2034" || err.code === "P2002")) {
      // Serialization conflict / deadlock from a concurrent withdrawal request.
      res.status(409).json({ message: "Permintaan penarikan sedang diproses. Coba lagi sebentar." });
      return;
    }
    throw err;
  }
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
