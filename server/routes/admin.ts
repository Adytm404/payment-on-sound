import { Router } from "express";
import { Prisma, type WithdrawalStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/admin";
import { toJson } from "../utils/json";
import { broadcastToUser } from "../realtime";
import { getWithdrawalSummary } from "../utils/withdrawals";

const router = Router();
router.use(requireAuth, requireAdmin);

const userStatusSchema = z.object({
  isActive: z.boolean(),
  adminNote: z.string().max(1000).optional().nullable(),
});

const planSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  price: z.number().int().min(0),
  billingPeriodDays: z.number().int().positive().nullable(),
  monthlyTransactionLimit: z.number().int().positive().nullable(),
  maxTransactionAmount: z.number().int().positive().nullable(),
  reportRetentionDays: z.number().int().positive().nullable(),
  canUseRealtime: z.boolean(),
  canExportReports: z.boolean(),
  canUseTts: z.boolean(),
  canUsePublicPaymentPage: z.boolean(),
  canSeeAdminFee: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});

const platformSettingsSchema = z.object({
  duitkuMerchantCode: z.string().max(100),
  duitkuApiKey: z.string().max(1000),
  duitkuSandbox: z.boolean(),
});

const promoSchema = z.object({
  code: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  type: z.enum(["free_trial", "percentage_discount", "fixed_discount"]),
  discountPercent: z.number().int().min(1).max(100).nullable(),
  discountAmount: z.number().int().min(0).nullable(),
  trialDays: z.number().int().min(1).nullable(),
  maxRedemptions: z.number().int().min(1).nullable(),
  startsAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  isActive: z.boolean(),
});

const merchantReviewSchema = z.object({
  pakasirProject: z.string().max(100),
  pakasirApiKey: z.string().max(5000),
  sandbox: z.boolean(),
  merchantNameValid: z.boolean(),
  legalNameValid: z.boolean(),
  ktpNumberValid: z.boolean(),
  withdrawBankValid: z.boolean(),
  withdrawAccountNumberValid: z.boolean(),
  withdrawAccountNameValid: z.boolean(),
  merchantNameNote: z.string().max(1000).optional().nullable(),
  legalNameNote: z.string().max(1000).optional().nullable(),
  ktpNumberNote: z.string().max(1000).optional().nullable(),
  withdrawBankNote: z.string().max(1000).optional().nullable(),
  withdrawAccountNumberNote: z.string().max(1000).optional().nullable(),
  withdrawAccountNameNote: z.string().max(1000).optional().nullable(),
  verificationNote: z.string().max(1000).optional().nullable(),
});

const withdrawalNoteSchema = z.object({
  adminNote: z.string().max(1000).optional().nullable(),
});

const withdrawalStatuses = ["pending", "approved", "processing", "paid", "rejected", "cancelled"] as const;

function userWhere(search: string): Prisma.UserWhereInput {
  if (!search) return {};
  return {
    OR: [{ name: { contains: search } }, { email: { contains: search } }],
  };
}

router.get("/dashboard", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    users,
    proUsers,
    transactions,
    completed,
    pending,
    income,
    fees,
    todayIncome,
    planRevenue,
    pendingPlanOrders,
    failedPlanOrders,
    expiredPlanOrders,
    pendingWithdrawals,
    processingWithdrawals,
    paidWithdrawals,
    pendingVerifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: { slug: "pro" }, OR: [{ planExpiresAt: null }, { planExpiresAt: { gt: new Date() } }] } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: "completed" } }),
    prisma.transaction.count({ where: { status: "pending" } }),
    prisma.transaction.aggregate({ where: { status: "completed" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { status: "completed" }, _sum: { fee: true } }),
    prisma.transaction.aggregate({ where: { status: "completed", createdAt: { gte: today } }, _sum: { amount: true } }),
    prisma.planOrder.aggregate({ where: { status: "paid" }, _sum: { finalAmount: true } }),
    prisma.planOrder.count({ where: { status: "pending" } }),
    prisma.planOrder.count({ where: { status: "failed" } }),
    prisma.planOrder.count({ where: { status: "expired" } }),
    prisma.withdrawalRequest.count({ where: { status: "pending" } }),
    prisma.withdrawalRequest.count({ where: { status: "processing" } }),
    prisma.withdrawalRequest.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
    prisma.userSettings.count({ where: { merchantStatus: "pending_review" } }),
  ]);

  res.json(toJson({
    summary: {
      users,
      proUsers,
      transactions,
      completed,
      pending,
      income: income._sum.amount ?? 0,
      fees: fees._sum.fee ?? 0,
      todayIncome: todayIncome._sum.amount ?? 0,
      planRevenue: planRevenue._sum.finalAmount ?? 0,
      pendingPlanOrders,
      failedPlanOrders,
      expiredPlanOrders,
      pendingWithdrawals,
      processingWithdrawals,
      paidWithdrawals: paidWithdrawals._sum.amount ?? 0,
      pendingVerifications,
    },
  }));
});

function withdrawalUpdateData(status: WithdrawalStatus, adminNote?: string | null) {
  const now = new Date();
  return {
    status,
    adminNote: adminNote?.trim() || null,
    ...(status === "approved" ? { approvedAt: now } : {}),
    ...(status === "processing" ? { processedAt: now } : {}),
    ...(status === "paid" ? { paidAt: now } : {}),
    ...(status === "rejected" ? { rejectedAt: now } : {}),
  };
}

router.get("/users", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
  const search = String(req.query.search ?? "").trim();
  const role = String(req.query.role ?? "all");
  const where: Prisma.UserWhereInput = userWhere(search);
  if (role === "admin" || role === "merchant") where.role = role;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        adminNote: true,
        planExpiresAt: true,
        createdAt: true,
        _count: { select: { transactions: true } },
        settings: { select: { merchantName: true, pakasirProject: true } },
        plan: { select: { name: true, slug: true } },
      },
    }),
  ]);

  res.json(toJson({ data: users, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } }));
});

router.get("/plans", async (_req, res) => {
  const plans = await prisma.plan.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { users: true } } },
  });
  res.json({ plans: toJson(plans) });
});

router.put("/plans/:slug", async (req, res) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data plan tidak valid" });
    return;
  }
  const plan = await prisma.plan.update({
    where: { slug: req.params.slug },
    data: parsed.data,
    include: { _count: { select: { users: true } } },
  });
  res.json({ plan: toJson(plan) });
});

router.get("/platform-settings", async (_req, res) => {
  let settings = await prisma.platformSettings.findFirst({ orderBy: { id: "asc" } });
  if (!settings) {
    settings = await prisma.platformSettings.create({ data: {} });
  }
  res.json({ settings: toJson({ ...settings, duitkuApiKey: settings.duitkuApiKey ? `••••••••${settings.duitkuApiKey.slice(-4)}` : "" }) });
});

router.put("/platform-settings", async (req, res) => {
  const parsed = platformSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data setting admin tidak valid" });
    return;
  }
  const existing = await prisma.platformSettings.findFirst({ orderBy: { id: "asc" } });
  const apiKey = parsed.data.duitkuApiKey.includes("••••") ? existing?.duitkuApiKey ?? "" : parsed.data.duitkuApiKey.trim();
  const settings = existing
    ? await prisma.platformSettings.update({ where: { id: existing.id }, data: { ...parsed.data, duitkuApiKey: apiKey } })
    : await prisma.platformSettings.create({ data: { ...parsed.data, duitkuApiKey: apiKey } });
  res.json({ settings: toJson({ ...settings, duitkuApiKey: settings.duitkuApiKey ? `••••••••${settings.duitkuApiKey.slice(-4)}` : "" }) });
});

router.get("/promos", async (_req, res) => {
  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ promos: toJson(promos) });
});

router.get("/merchants", async (req, res) => {
  const status = String(req.query.status ?? "all");
  const where: Prisma.UserSettingsWhereInput = {};
  if (["draft", "pending_review", "needs_revision", "verified", "rejected"].includes(status)) where.merchantStatus = status as any;
  const merchants = await prisma.userSettings.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
    take: 100,
  });
  res.json({ data: toJson(merchants) });
});

router.get("/merchants/:userId", async (req, res) => {
  const merchant = await prisma.userSettings.findUnique({
    where: { userId: BigInt(req.params.userId) },
    include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
  });
  if (!merchant) {
    res.status(404).json({ message: "Merchant tidak ditemukan" });
    return;
  }
  res.json({ merchant: toJson({ ...merchant, pakasirApiKey: merchant.pakasirApiKey ? `••••••••${merchant.pakasirApiKey.slice(-4)}` : "" }) });
});

router.put("/merchants/:userId/review", async (req, res) => {
  const parsed = merchantReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data review merchant tidak valid" });
    return;
  }
  const current = await prisma.userSettings.findUnique({ where: { userId: BigInt(req.params.userId) } });
  const apiKey = parsed.data.pakasirApiKey.includes("••••") ? current?.pakasirApiKey ?? "" : parsed.data.pakasirApiKey.trim();
  const merchant = await prisma.userSettings.update({
    where: { userId: BigInt(req.params.userId) },
    data: { ...parsed.data, pakasirApiKey: apiKey, pakasirProject: parsed.data.pakasirProject.trim() },
  });
  broadcastToUser(merchant.userId, "settings:updated", { type: "settings:updated" });
  res.json({ merchant: toJson(merchant) });
});

router.post("/merchants/:userId/request-revision", async (req, res) => {
  const merchant = await prisma.userSettings.update({
    where: { userId: BigInt(req.params.userId) },
    data: { merchantStatus: "needs_revision", verificationNote: String(req.body.verificationNote ?? "") },
  });
  broadcastToUser(merchant.userId, "settings:updated", { type: "settings:updated" });
  res.json({ merchant: toJson(merchant) });
});

router.post("/merchants/:userId/reject", async (req, res) => {
  const merchant = await prisma.userSettings.update({
    where: { userId: BigInt(req.params.userId) },
    data: { merchantStatus: "rejected", verificationNote: String(req.body.verificationNote ?? "") },
  });
  broadcastToUser(merchant.userId, "settings:updated", { type: "settings:updated" });
  res.json({ merchant: toJson(merchant) });
});

router.post("/merchants/:userId/approve", async (req, res) => {
  const userId = BigInt(req.params.userId);
  const merchant = await prisma.userSettings.findUnique({ where: { userId } });
  if (!merchant) {
    res.status(404).json({ message: "Merchant tidak ditemukan" });
    return;
  }
  const allValid = merchant.merchantNameValid && merchant.legalNameValid && merchant.ktpNumberValid && merchant.withdrawBankValid && merchant.withdrawAccountNumberValid && merchant.withdrawAccountNameValid;
  if (!allValid || !merchant.pakasirProject || !merchant.pakasirApiKey) {
    res.status(400).json({ message: "Tidak bisa approve. Lengkapi checklist dan integrasi Pakasir dulu." });
    return;
  }
  const updated = await prisma.userSettings.update({ where: { userId }, data: { merchantStatus: "verified", verifiedAt: new Date(), verifiedByAdminId: BigInt(req.auth!.userId) } });
  broadcastToUser(userId, "settings:updated", { type: "settings:updated" });
  res.json({ merchant: toJson(updated) });
});

router.post("/promos", async (req, res) => {
  const parsed = promoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data promo tidak valid" });
    return;
  }
  const promo = await prisma.promoCode.create({
    data: {
      ...parsed.data,
      code: parsed.data.code.trim().toUpperCase(),
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });
  res.status(201).json({ promo: toJson(promo) });
});

router.put("/promos/:id", async (req, res) => {
  const parsed = promoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data promo tidak valid" });
    return;
  }
  const promo = await prisma.promoCode.update({
    where: { id: BigInt(req.params.id) },
    data: {
      ...parsed.data,
      code: parsed.data.code.trim().toUpperCase(),
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });
  res.json({ promo: toJson(promo) });
});

router.get("/plan-orders", async (_req, res) => {
  const orders = await prisma.planOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true } }, plan: { select: { name: true, slug: true } }, promoCode: { select: { code: true, name: true } } },
  });
  res.json({ orders: toJson(orders) });
});

router.get("/withdrawals", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const status = String(req.query.status ?? "all");
  const search = String(req.query.search ?? "").trim();
  const where: Prisma.WithdrawalRequestWhereInput = {};
  if (withdrawalStatuses.includes(status as any)) where.status = status as WithdrawalStatus;
  if (search) {
    const amount = Number(search.replace(/\D/g, ""));
    where.OR = [
      { requestId: { contains: search } },
      { bankName: { contains: search } },
      { accountName: { contains: search } },
      { accountNumber: { contains: search } },
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
      ...(Number.isFinite(amount) && amount > 0 ? [{ amount }] : []),
    ];
  }
  const [total, data, pending, processing, paid] = await Promise.all([
    prisma.withdrawalRequest.count({ where }),
    prisma.withdrawalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true, settings: { select: { merchantName: true } } } } },
    }),
    prisma.withdrawalRequest.aggregate({ where: { ...where, status: "pending" }, _sum: { amount: true } }),
    prisma.withdrawalRequest.aggregate({ where: { ...where, status: "processing" }, _sum: { amount: true } }),
    prisma.withdrawalRequest.aggregate({ where: { ...where, status: "paid" }, _sum: { amount: true } }),
  ]);
  res.json(toJson({
    data,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    summary: { pending: pending._sum.amount ?? 0, processing: processing._sum.amount ?? 0, paid: paid._sum.amount ?? 0 },
  }));
});

router.get("/withdrawals/:requestId", async (req, res) => {
  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { requestId: req.params.requestId },
    include: { user: { select: { id: true, name: true, email: true, settings: true } } },
  });
  if (!withdrawal) {
    res.status(404).json({ message: "Request penarikan tidak ditemukan" });
    return;
  }
  const balance = await getWithdrawalSummary(withdrawal.userId);
  res.json({ withdrawal: toJson(withdrawal), balance: toJson(balance) });
});

async function updateWithdrawalStatus(req: any, res: any, status: WithdrawalStatus) {
  const parsed = withdrawalNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data penarikan tidak valid" });
    return;
  }
  if (status === "rejected" && !parsed.data.adminNote?.trim()) {
    res.status(422).json({ message: "Catatan admin wajib diisi saat menolak penarikan" });
    return;
  }
  const current = await prisma.withdrawalRequest.findUnique({ where: { requestId: req.params.requestId } });
  if (!current) {
    res.status(404).json({ message: "Request penarikan tidak ditemukan" });
    return;
  }
  if (["paid", "rejected", "cancelled"].includes(current.status)) {
    res.status(400).json({ message: "Status penarikan sudah final" });
    return;
  }
  const withdrawal = await prisma.withdrawalRequest.update({
    where: { id: current.id },
    data: withdrawalUpdateData(status, parsed.data.adminNote),
  });
  broadcastToUser(withdrawal.userId, "withdrawal:updated", { type: "withdrawal:updated", requestId: withdrawal.requestId, status: withdrawal.status });
  res.json({ withdrawal: toJson(withdrawal) });
}

router.post("/withdrawals/:requestId/approve", (req, res) => updateWithdrawalStatus(req, res, "approved"));
router.post("/withdrawals/:requestId/processing", (req, res) => updateWithdrawalStatus(req, res, "processing"));
router.post("/withdrawals/:requestId/paid", (req, res) => updateWithdrawalStatus(req, res, "paid"));
router.post("/withdrawals/:requestId/reject", (req, res) => updateWithdrawalStatus(req, res, "rejected"));
router.post("/withdrawals/:requestId/cancel", (req, res) => updateWithdrawalStatus(req, res, "cancelled"));

router.get("/users/:userId", async (req, res) => {
  const userId = BigInt(req.params.userId);
  const [user, summary, fees, pending] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        adminNote: true,
        planExpiresAt: true,
        createdAt: true,
        settings: { select: { merchantName: true, pakasirProject: true, sandbox: true } },
        plan: { select: { name: true, slug: true } },
      },
    }),
    prisma.transaction.aggregate({ where: { userId, status: "completed" }, _sum: { amount: true }, _count: true }),
    prisma.transaction.aggregate({ where: { userId, status: "completed" }, _sum: { fee: true } }),
    prisma.transaction.aggregate({ where: { userId, status: "pending" }, _sum: { amount: true }, _count: true }),
  ]);
  if (!user) {
    res.status(404).json({ message: "User tidak ditemukan" });
    return;
  }
  const transactions = await prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
  res.json(toJson({
    user,
    summary: {
      income: summary._sum.amount ?? 0,
      completedCount: summary._count,
      adminFee: fees._sum.fee ?? 0,
      pending: pending._sum.amount ?? 0,
      pendingCount: pending._count,
    },
    transactions,
  }));
});

router.patch("/users/:userId/status", async (req, res) => {
  const parsed = userStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data status user tidak valid" });
    return;
  }
  const user = await prisma.user.update({
    where: { id: BigInt(req.params.userId) },
    data: { isActive: parsed.data.isActive, adminNote: parsed.data.adminNote?.trim() || null },
    select: { id: true, name: true, email: true, role: true, isActive: true, adminNote: true },
  });
  res.json({ user: toJson(user) });
});

router.get("/transactions", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const search = String(req.query.search ?? "").trim();
  const status = String(req.query.status ?? "all");
  const where: Prisma.PlanOrderWhereInput = {};
  if (["pending", "paid", "failed", "expired", "cancelled"].includes(status)) where.status = status as any;
  if (search) {
    const amount = Number(search.replace(/\D/g, ""));
    where.OR = [
      { orderId: { contains: search } },
      { user: { name: { contains: search } } },
      { user: { email: { contains: search } } },
      ...(Number.isFinite(amount) && amount > 0 ? [{ amount }, { finalAmount: amount }] : []),
    ];
  }
  const [total, data, paid, pending, failed, expired] = await Promise.all([
    prisma.planOrder.count({ where }),
    prisma.planOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } }, plan: { select: { name: true, slug: true } }, promoCode: { select: { code: true, name: true } } },
    }),
    prisma.planOrder.aggregate({ where: { ...where, status: "paid" }, _sum: { finalAmount: true } }),
    prisma.planOrder.aggregate({ where: { ...where, status: "pending" }, _sum: { finalAmount: true } }),
    prisma.planOrder.count({ where: { ...where, status: "failed" } }),
    prisma.planOrder.count({ where: { ...where, status: "expired" } }),
  ]);
  res.json(toJson({
    data,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    summary: { income: paid._sum.finalAmount ?? 0, pending: pending._sum.finalAmount ?? 0, failed, expired },
  }));
});

export { router as adminRouter };
