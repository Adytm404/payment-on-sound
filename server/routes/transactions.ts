import { Router } from "express";
import { z } from "zod";
import { Prisma, type TransactionStatus } from "@prisma/client";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { generateOrderId } from "../utils/orderId";
import { cancelTransaction, createQris, simulatePayment, transactionDetail } from "../utils/pakasir";
import { toJson } from "../utils/json";
import { broadcastToUser } from "../realtime";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  amount: z.number().int().min(1000).max(10_000_000),
  description: z.string().max(255).optional().nullable(),
});

const statusValues = ["pending", "completed", "cancelled", "expired", "failed"] as const;

function dateStart(period?: string) {
  const now = new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "today") return d;
  if (period === "week") {
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (period === "month") {
    d.setDate(d.getDate() - 29);
    return d;
  }
  return null;
}

async function getSettings(userId: bigint) {
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings?.pakasirProject || !settings?.pakasirApiKey) {
    throw new Error("Pengaturan Pakasir belum lengkap");
  }
  return {
    project: settings.pakasirProject,
    apiKey: settings.pakasirApiKey,
    sandbox: settings.sandbox,
  };
}

function shape(tx: unknown) {
  return toJson(tx);
}

router.get("/", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 100)));
  const status = String(req.query.status ?? "all");
  const search = String(req.query.search ?? "").trim();
  const start = dateStart(String(req.query.period ?? "all"));

  const where: Prisma.TransactionWhereInput = { userId };
  if (start) where.createdAt = { gte: start };
  if (status !== "all" && statusValues.includes(status as TransactionStatus)) {
    where.status = status as TransactionStatus;
  }
  if (search) {
    const amount = Number(search.replace(/\D/g, ""));
    where.OR = [
      { orderId: { contains: search } },
      { description: { contains: search } },
      { paymentMethod: { contains: search } },
      ...(Number.isFinite(amount) && amount > 0
        ? [{ amount }, { totalPayment: amount }]
        : []),
    ];
  }

  const [
    total,
    data,
    aggregate,
    completedCount,
    pendingCount,
    pendingAggregate,
    adminFeeAggregate,
  ] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.aggregate({ where: { ...where, status: "completed" }, _sum: { amount: true } }),
    prisma.transaction.count({ where: { ...where, status: "completed" } }),
    prisma.transaction.count({ where: { ...where, status: "pending" } }),
    prisma.transaction.aggregate({ where: { ...where, status: "pending" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...where, status: "completed" }, _sum: { fee: true } }),
  ]);

  res.json({
    data: shape(data),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    summary: {
      income: aggregate._sum.amount ?? 0,
      pending: pendingAggregate._sum.amount ?? 0,
      adminFee: adminFeeAggregate._sum.fee ?? 0,
      completedCount,
      pendingCount,
    },
  });
});

router.delete("/", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  await prisma.transaction.deleteMany({ where: { userId } });
  broadcastToUser(userId, "transactions:cleared", { type: "transactions:cleared" });
  res.json({ ok: true });
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data transaksi tidak valid" });
    return;
  }

  const userId = BigInt(req.auth!.userId);
  try {
    const settings = await getSettings(userId);
    const orderId = generateOrderId();
    const payment = await createQris({ config: settings, orderId, amount: parsed.data.amount });
    const tx = await prisma.transaction.create({
      data: {
        userId,
        orderId,
        description: parsed.data.description?.trim() || null,
        amount: payment.payment.amount,
        fee: payment.payment.fee,
        totalPayment: payment.payment.total_payment,
        paymentNumber: payment.payment.payment_number,
        paymentMethod: payment.payment.payment_method,
        status: "pending",
        expiredAt: new Date(payment.payment.expired_at),
      },
    });
    broadcastToUser(userId, "transaction:created", {
      type: "transaction:created",
      orderId: tx.orderId,
      status: tx.status,
    });
    res.status(201).json({ transaction: shape(tx) });
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Gagal membuat transaksi" });
  }
});

router.get("/:orderId", async (req, res) => {
  const tx = await prisma.transaction.findFirst({
    where: { userId: BigInt(req.auth!.userId), orderId: req.params.orderId },
  });
  if (!tx) {
    res.status(404).json({ message: "Transaksi tidak ditemukan" });
    return;
  }
  res.json({ transaction: shape(tx) });
});

router.post("/:orderId/check", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const tx = await prisma.transaction.findFirst({ where: { userId, orderId: req.params.orderId } });
  if (!tx) {
    res.status(404).json({ message: "Transaksi tidak ditemukan" });
    return;
  }
  try {
    const settings = await getSettings(userId);
    const detail = await transactionDetail({ config: settings, orderId: tx.orderId, amount: tx.amount });
    const statusChanged = tx.status !== detail.transaction.status;
    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: detail.transaction.status,
        completedAt: detail.transaction.completed_at ? new Date(detail.transaction.completed_at) : tx.completedAt,
      },
    });
    if (statusChanged) {
      broadcastToUser(userId, "transaction:updated", {
        type: "transaction:updated",
        orderId: updated.orderId,
        status: updated.status,
      });
    }
    res.json({ transaction: shape(updated) });
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Gagal cek transaksi" });
  }
});

router.post("/:orderId/cancel", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const tx = await prisma.transaction.findFirst({ where: { userId, orderId: req.params.orderId } });
  if (!tx) {
    res.status(404).json({ message: "Transaksi tidak ditemukan" });
    return;
  }
  try {
    const settings = await getSettings(userId);
    await cancelTransaction({ config: settings, orderId: tx.orderId, amount: tx.amount });
  } catch {
    // keep local cancel even if upstream rejects
  }
  const updated = await prisma.transaction.update({ where: { id: tx.id }, data: { status: "cancelled" } });
  broadcastToUser(userId, "transaction:updated", {
    type: "transaction:updated",
    orderId: updated.orderId,
    status: updated.status,
  });
  res.json({ transaction: shape(updated) });
});

router.post("/:orderId/simulate", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const tx = await prisma.transaction.findFirst({ where: { userId, orderId: req.params.orderId } });
  if (!tx) {
    res.status(404).json({ message: "Transaksi tidak ditemukan" });
    return;
  }
  try {
    const settings = await getSettings(userId);
    if (!settings.sandbox) {
      res.status(400).json({ message: "Mode sandbox tidak aktif" });
      return;
    }
    await simulatePayment({ config: settings, orderId: tx.orderId, amount: tx.amount });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Gagal simulasi" });
  }
});

export { router as transactionsRouter };
