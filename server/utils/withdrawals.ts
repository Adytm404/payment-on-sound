import type { Prisma, WithdrawalStatus } from "@prisma/client";
import { prisma } from "../db";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export const MINIMUM_WITHDRAWAL = 10_000;
export const WITHDRAWAL_RESERVED_STATUSES: WithdrawalStatus[] = ["pending", "approved", "processing", "paid"];
export const WITHDRAWAL_ACTIVE_STATUSES: WithdrawalStatus[] = ["pending", "approved", "processing"];

type TxRow = {
  total_completed: bigint | null;
  total_settled: bigint | null;
  total_pending_settlement: bigint | null;
  next_settlement_at: Date | null;
};

type WdRow = {
  total_reserved: bigint | null;
  total_paid: bigint | null;
  has_active: bigint | null;
};

export async function getWithdrawalSummary(userId: bigint, client: PrismaClientLike = prisma) {
  const now = new Date();

  const [settings, txRows, wdRows, activeRequest] = await Promise.all([
    client.userSettings.findUnique({ where: { userId } }),
    client.$queryRaw<TxRow[]>`
      SELECT
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_completed,
        SUM(CASE WHEN status = 'completed' AND settled_at <= ${now} THEN amount ELSE 0 END) as total_settled,
        SUM(CASE WHEN status = 'completed' AND (settled_at IS NULL OR settled_at > ${now}) THEN amount ELSE 0 END) as total_pending_settlement,
        MIN(CASE WHEN status = 'completed' AND settled_at > ${now} THEN settled_at END) as next_settlement_at
      FROM transactions
      WHERE user_id = ${userId}
    `,
    client.$queryRaw<WdRow[]>`
      SELECT
        SUM(CASE WHEN status IN ('pending', 'approved', 'processing', 'paid') THEN amount ELSE 0 END) as total_reserved,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        COUNT(CASE WHEN status IN ('pending', 'approved', 'processing') THEN 1 END) as has_active
      FROM withdrawal_requests
      WHERE user_id = ${userId}
    `,
    client.withdrawalRequest.findFirst({
      where: { userId, status: { in: WITHDRAWAL_ACTIVE_STATUSES } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const tx = txRows[0];
  const wd = wdRows[0];
  const completedIncome = Number(tx?.total_completed ?? 0);
  const settledIncome = Number(tx?.total_settled ?? 0);
  const reservedWithdrawal = Number(wd?.total_reserved ?? 0);

  return {
    availableBalance: Math.max(0, settledIncome - reservedWithdrawal),
    settledIncome,
    pendingSettlement: Number(tx?.total_pending_settlement ?? 0),
    nextSettlementAt: tx?.next_settlement_at ?? null,
    completedIncome,
    reservedWithdrawal,
    paidWithdrawal: Number(wd?.total_paid ?? 0),
    minimumWithdrawal: MINIMUM_WITHDRAWAL,
    hasActiveRequest: Number(wd?.has_active ?? 0) > 0,
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
