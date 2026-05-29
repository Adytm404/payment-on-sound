import type { Transaction } from "@prisma/client";
import { prisma } from "../db";
import { transactionDetail, type PakasirConfig } from "./pakasir";
import { getSettlementAt } from "./settlement";
import { broadcastToUser } from "../realtime";

export type SyncResult = {
  transaction: Transaction;
  statusChanged: boolean;
  justCompleted: boolean;
};

/**
 * Fetches the latest status from Pakasir and reconciles it into the DB:
 * updates status/completedAt/settledAt, broadcasts on change, and reports
 * whether the transaction just transitioned to completed (for notifications).
 *
 * Shared by the merchant check route, public check route, the reconciler,
 * and the Pakasir webhook so the update logic stays consistent.
 */
export async function syncTransactionStatus(tx: Transaction, config: PakasirConfig): Promise<SyncResult> {
  const detail = await transactionDetail({ config, orderId: tx.orderId, amount: tx.amount });
  const nextStatus = detail.transaction.status;
  const statusChanged = tx.status !== nextStatus;
  const completedAt = detail.transaction.completed_at ? new Date(detail.transaction.completed_at) : tx.completedAt;

  const updated = await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: nextStatus,
      completedAt,
      settledAt: nextStatus === "completed" && completedAt ? tx.settledAt ?? getSettlementAt(completedAt) : null,
    },
  });

  const justCompleted = statusChanged && nextStatus === "completed";

  if (statusChanged) {
    broadcastToUser(tx.userId, "transaction:updated", {
      type: "transaction:updated",
      orderId: updated.orderId,
      status: updated.status,
    });
  }

  return { transaction: updated, statusChanged, justCompleted };
}
