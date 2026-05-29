import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { toJson } from "../utils/json";
import { getUserPlan, retentionStart, monthStart } from "../utils/plans";
import { getWithdrawalSummary } from "../utils/withdrawals";
import { wibStartOfToday, wibStartDaysAgo } from "../utils/settlement";

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
  const plan = await getUserPlan(userId);
  const retention = retentionStart(plan?.reportRetentionDays);

  const today = wibStartOfToday();
  const week = wibStartDaysAgo(6);

  const monthlyLimit = plan?.monthlyTransactionLimit ?? null;

  // Only retention bounds the dataset. For Pro (retention = null) total income and
  // pending are all-time; week/today are narrowed via the CASE expressions below.
  const [dashboardRows, recentTransactions, withdrawalSummary, monthlyUsed] = await Promise.all([
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
    monthlyLimit ? prisma.transaction.count({ where: { userId, createdAt: { gte: monthStart() } } }) : Promise.resolve(0),
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
      planName: plan?.name ?? "Free",
      planSlug: plan?.slug ?? "free",
      monthlyTransactionLimit: monthlyLimit,
      monthlyTransactionUsed: monthlyLimit ? monthlyUsed : 0,
    },
    recentTransactions: toJson(recentTransactions),
  });
});

type DailyRow = { day: string; total: bigint | null; count: bigint | null };
type HourRow = { hour: number; total: bigint | null; count: bigint | null };

router.get("/analytics", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const rangeDays = req.query.range === "30d" ? 30 : 7;
  const plan = await getUserPlan(userId);
  const retention = retentionStart(plan?.reportRetentionDays);

  // Respect plan retention: never look back further than allowed.
  const requestedStart = wibStartDaysAgo(rangeDays - 1);
  const start = retention && retention > requestedStart ? retention : requestedStart;

  // created_at is stored UTC; shift +7h to bucket by WIB calendar day/hour.
  const [daily, hourly] = await Promise.all([
    prisma.$queryRaw<DailyRow[]>`
      SELECT DATE(DATE_ADD(created_at, INTERVAL 7 HOUR)) as day,
             SUM(amount) as total,
             COUNT(*) as count
      FROM transactions
      WHERE user_id = ${userId} AND status = 'completed' AND created_at >= ${start}
      GROUP BY day
      ORDER BY day ASC
    `,
    prisma.$queryRaw<HourRow[]>`
      SELECT HOUR(DATE_ADD(created_at, INTERVAL 7 HOUR)) as hour,
             SUM(amount) as total,
             COUNT(*) as count
      FROM transactions
      WHERE user_id = ${userId} AND status = 'completed' AND created_at >= ${start}
      GROUP BY hour
      ORDER BY hour ASC
    `,
  ]);

  res.json({
    rangeDays,
    daily: daily.map((d) => ({
      day: typeof d.day === "string" ? d.day : new Date(d.day as unknown as string).toISOString().slice(0, 10),
      total: Number(d.total ?? 0),
      count: Number(d.count ?? 0),
    })),
    hourly: hourly.map((h) => ({ hour: Number(h.hour), total: Number(h.total ?? 0), count: Number(h.count ?? 0) })),
  });
});

export { router as dashboardRouter };
