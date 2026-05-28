import type { WithdrawalStatus } from "@prisma/client";
import { prisma } from "../db";

export const MINIMUM_WITHDRAWAL = 10_000;
export const WITHDRAWAL_RESERVED_STATUSES: WithdrawalStatus[] = ["pending", "approved", "processing", "paid"];
export const WITHDRAWAL_ACTIVE_STATUSES: WithdrawalStatus[] = ["pending", "approved", "processing"];

export async function getWithdrawalSummary(userId: bigint) {
  const now = new Date();
  const [settings, completed, settled, pendingSettlement, nextSettlement, reserved, paid, activeRequest] = await Promise.all([
    prisma.userSettings.findUnique({ where: { userId } }),
    prisma.transaction.aggregate({ where: { userId, status: "completed" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, status: "completed", settledAt: { lte: now } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({
      where: { userId, status: "completed", OR: [{ settledAt: null }, { settledAt: { gt: now } }] },
      _sum: { amount: true },
    }),
    prisma.transaction.findFirst({
      where: { userId, status: "completed", settledAt: { gt: now } },
      orderBy: { settledAt: "asc" },
      select: { settledAt: true },
    }),
    prisma.withdrawalRequest.aggregate({
      where: { userId, status: { in: WITHDRAWAL_RESERVED_STATUSES } },
      _sum: { amount: true },
    }),
    prisma.withdrawalRequest.aggregate({ where: { userId, status: "paid" }, _sum: { amount: true } }),
    prisma.withdrawalRequest.findFirst({
      where: { userId, status: { in: WITHDRAWAL_ACTIVE_STATUSES } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const completedIncome = completed._sum.amount ?? 0;
  const settledIncome = settled._sum.amount ?? 0;
  const reservedWithdrawal = reserved._sum.amount ?? 0;
  return {
    availableBalance: Math.max(0, settledIncome - reservedWithdrawal),
    settledIncome,
    pendingSettlement: pendingSettlement._sum.amount ?? 0,
    nextSettlementAt: nextSettlement?.settledAt ?? null,
    completedIncome,
    reservedWithdrawal,
    paidWithdrawal: paid._sum.amount ?? 0,
    minimumWithdrawal: MINIMUM_WITHDRAWAL,
    hasActiveRequest: Boolean(activeRequest),
    activeRequest,
    merchantStatus: settings?.merchantStatus ?? "draft",
    bank: {
      code: settings?.withdrawBankCode ?? "",
      name: settings?.withdrawBankName ?? "",
      accountNumber: settings?.withdrawAccountNumber ?? "",
      accountName: settings?.withdrawAccountName ?? "",
    },
  };
}
