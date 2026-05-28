import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { toJson } from "../utils/json";
import { getUserPlan, retentionStart } from "../utils/plans";
import { getWithdrawalSummary } from "../utils/withdrawals";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const now = new Date();
  const plan = await getUserPlan(userId);
  const retention = retentionStart(plan?.reportRetentionDays);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const week = new Date(today);
  week.setDate(week.getDate() - 6);

  const [
    totalIncome,
    weekIncome,
    todayIncome,
    pendingAggregate,
    pendingCount,
    recentTransactions,
    withdrawalSummary,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, status: "completed", ...(retention ? { createdAt: { gte: retention } } : {}) },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, status: "completed", createdAt: { gte: week } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, status: "completed", createdAt: { gte: today } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, status: "pending" },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { userId, status: "pending" } }),
    prisma.transaction.findMany({
      where: { userId, ...(retention ? { createdAt: { gte: retention } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getWithdrawalSummary(userId),
  ]);

  res.json({
    summary: {
      totalIncome: totalIncome._sum.amount ?? 0,
      weekIncome: weekIncome._sum.amount ?? 0,
      todayIncome: todayIncome._sum.amount ?? 0,
      pendingAmount: pendingAggregate._sum.amount ?? 0,
      pendingCount,
      availableBalance: withdrawalSummary.availableBalance,
    },
    recentTransactions: toJson(recentTransactions),
  });
});

export { router as dashboardRouter };
