import { Router } from "express";
import { prisma } from "../db";
import { syncTransactionStatus } from "../utils/transactionSync";

const router = Router();

/**
 * Pakasir payment webhook. Pakasir POSTs here when a payment completes, with
 * body { amount, order_id, project, status, payment_method, completed_at }.
 *
 * The webhook is NOT signed, and Pakasir's own docs recommend treating it only
 * as a trigger and re-verifying via the transactiondetail API. So we look up
 * the transaction, sanity-check amount + project against our record, then
 * re-verify the real status with the merchant's own credentials before
 * applying any change. We never trust the status in the body.
 */
router.post("/webhook", async (req, res) => {
  const orderId = String(req.body.order_id ?? "");
  const amount = Number(req.body.amount ?? NaN);
  const project = String(req.body.project ?? "");

  if (!orderId) {
    res.status(400).json({ message: "order_id wajib" });
    return;
  }

  const tx = await prisma.transaction.findFirst({
    where: { orderId },
    include: { user: { include: { settings: true } } },
  });

  // Always ack unknown orders with 200 so Pakasir doesn't retry forever.
  if (!tx) {
    res.status(200).json({ ok: true, ignored: "unknown_order" });
    return;
  }

  const settings = tx.user.settings;
  if (!settings?.pakasirProject || !settings.pakasirApiKey) {
    res.status(200).json({ ok: true, ignored: "merchant_not_configured" });
    return;
  }

  // Reject mismatched payloads (possible spoof or wrong project routing).
  if (Number.isFinite(amount) && Math.round(amount) !== tx.amount) {
    res.status(400).json({ message: "Amount mismatch" });
    return;
  }
  if (project && project !== settings.pakasirProject) {
    res.status(400).json({ message: "Project mismatch" });
    return;
  }

  // Already in a terminal state we won't change; ack and move on.
  if (tx.status !== "pending") {
    res.status(200).json({ ok: true, ignored: "already_final" });
    return;
  }

  try {
    await syncTransactionStatus(tx, {
      project: settings.pakasirProject,
      apiKey: settings.pakasirApiKey,
    });
    res.status(200).json({ ok: true });
  } catch {
    // Let Pakasir retry on transient verification failures.
    res.status(502).json({ message: "Gagal verifikasi transaksi" });
  }
});

export { router as pakasirRouter };
