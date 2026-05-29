import { prisma } from "../db";
import { syncTransactionStatus } from "./transactionSync";

// Only poll the provider for reasonably recent pending transactions, so we
// don't hammer the upstream API for ancient orders that will never complete.
const RECONCILE_MAX_AGE_MS = Number(process.env.RECONCILE_MAX_AGE_HOURS ?? 24) * 60 * 60 * 1000;
const RECONCILE_BATCH = Number(process.env.RECONCILE_BATCH ?? 100);
// Pending transactions whose expiry passed more than this ago are force-expired
// locally as a fallback (provider unreachable, missing creds, beyond age window).
const EXPIRE_GRACE_MS = Number(process.env.RECONCILE_EXPIRE_GRACE_MIN ?? 60) * 60 * 1000;

let running = false;

type ReconcileResult = { checked: number; updated: number; expired: number; errors: number };

/**
 * Reconciles pending transactions with the payment provider. Pakasir has no
 * webhook, so without this a payment completed after the user closed the page
 * would stay 'pending' in our DB forever and never settle. Safe to run on an
 * interval; skips overlapping runs.
 */
export async function reconcilePendingTransactions(): Promise<ReconcileResult> {
  const result: ReconcileResult = { checked: 0, updated: 0, expired: 0, errors: 0 };
  if (running) return result;
  running = true;
  try {
    const now = new Date();
    const minCreatedAt = new Date(now.getTime() - RECONCILE_MAX_AGE_MS);

    const pending = await prisma.transaction.findMany({
      where: { status: "pending", createdAt: { gte: minCreatedAt } },
      include: { user: { include: { settings: true } } },
      orderBy: { createdAt: "asc" },
      take: RECONCILE_BATCH,
    });

    for (const tx of pending) {
      const settings = tx.user.settings;
      if (settings?.merchantStatus !== "verified" || !settings.pakasirProject || !settings.pakasirApiKey) {
        continue;
      }
      result.checked += 1;
      try {
        const { statusChanged } = await syncTransactionStatus(tx, {
          project: settings.pakasirProject,
          apiKey: settings.pakasirApiKey,
        });
        if (statusChanged) result.updated += 1;
      } catch {
        result.errors += 1;
      }
    }

    // Fallback: force-expire long-stale pending transactions the provider check
    // couldn't resolve, so they stop being polled and stop showing as pending.
    const expireBefore = new Date(now.getTime() - EXPIRE_GRACE_MS);
    const expired = await prisma.transaction.updateMany({
      where: { status: "pending", expiredAt: { lt: expireBefore } },
      data: { status: "expired" },
    });
    result.expired = expired.count;

    return result;
  } finally {
    running = false;
  }
}

/**
 * Starts the periodic reconciliation loop. Returns a stop function.
 * Disabled when RECONCILE_ENABLED is explicitly "false".
 */
export function startReconciliationLoop() {
  if (process.env.RECONCILE_ENABLED === "false") {
    return () => {};
  }
  const intervalMs = Number(process.env.RECONCILE_INTERVAL_MS ?? 60_000);
  const timer = setInterval(() => {
    reconcilePendingTransactions().catch((err) => console.error("[reconcile] failed", err));
  }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
