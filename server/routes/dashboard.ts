import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { toJson } from "../utils/json";
import { getUserPlan, retentionStart } from "../utils/plans";
import { getWithdrawalSummary } from "../utils/withdrawals";

const router = Router();
router.use(requireAuth);

type DashboardRow = {
  total_income: bigint | null;
  week_income: bigint | null;
  today_income: bigint | null;
  pending_amount: bigint | null;
  pending_count: bigint | null;
};

router.get("/", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const now = new Date();
  const plan = await getUserPlan(userId);
  const retention = retentionStart(plan?.reportRetentionDays);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const week = new Date(today);
  week.setDate(week.getDate() - 6);

  // Only retention bounds the dataset. For Pro (retention = null) total income and
  // pending are all-time; week/today are narrowed via the CASE expressions below.
  const [dashboardRows, recentTransactions, withdrawalSummary] = await Promise.all([
    prisma.$queryRaw<DashboardRow[]>`
      SELECT
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN status = 'completed' AND created_at >= ${week} THEN amount ELSE 0 END) as week_income,
        SUM(CASE WHEN status = 'completed' AND created_at >= ${today} THEN amount ELSE 0 END) as today_income,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM transactions
      WHERE user_id = ${userId} AND (${retention} IS NULL OR created_at >= ${retention})
    `,
    prisma.transaction.findMany({
      where: { userId, ...(retention ? { createdAt: { gte: retention } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getWithdrawalSummary(userId),
  ]);

  const row = dashboardRows[0];

  res.json({
    summary: {
      totalIncome: Number(row?.total_income ?? 0),
      weekIncome: Number(row?.week_income ?? 0),
      todayIncome: Number(row?.today_income ?? 0),
      pendingAmount: Number(row?.pending_amount ?? 0),
      pendingCount: Number(row?.pending_count ?? 0),
      availableBalance: withdrawalSummary.availableBalance,
    },
    recentTransactions: toJson(recentTransactions),
  });
});

export { router as dashboardRouter };
