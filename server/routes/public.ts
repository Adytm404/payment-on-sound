import { Router } from "express";
import { prisma } from "../db";
import { transactionDetail } from "../utils/pakasir";
import { publicTransaction } from "../utils/transactionPresenter";
import { broadcastToUser } from "../realtime";
import { getUserPlan } from "../utils/plans";

const router = Router();

async function findPublicTransaction(orderId: string) {
  return prisma.transaction.findFirst({
    where: { orderId },
    include: {
      user: {
        include: { settings: true },
      },
    },
  });
}

router.get("/transactions/:orderId", async (req, res) => {
  const tx = await findPublicTransaction(req.params.orderId);
  if (!tx) {
    res.status(404).json({ message: "Transaksi tidak ditemukan" });
    return;
  }
  const plan = await getUserPlan(tx.userId);
  if (!plan?.canUsePublicPaymentPage) {
    res.status(403).json({ message: "Link pembayaran pelanggan tersedia di plan Pro." });
    return;
  }
  res.json({ transaction: publicTransaction(tx) });
});

router.post("/transactions/:orderId/check", async (req, res) => {
  const tx = await findPublicTransaction(req.params.orderId);
  if (!tx) {
    res.status(404).json({ message: "Transaksi tidak ditemukan" });
    return;
  }
  const plan = await getUserPlan(tx.userId);
  if (!plan?.canUsePublicPaymentPage) {
    res.status(403).json({ message: "Link pembayaran pelanggan tersedia di plan Pro." });
    return;
  }

  const settings = tx.user.settings;
  if (!settings?.pakasirProject || !settings?.pakasirApiKey) {
    res.status(400).json({ message: "Pengaturan Pakasir belum lengkap" });
    return;
  }

  try {
    const detail = await transactionDetail({
      config: {
        project: settings.pakasirProject,
        apiKey: settings.pakasirApiKey,
      },
      orderId: tx.orderId,
      amount: tx.amount,
    });

    const statusChanged = tx.status !== detail.transaction.status;
    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: detail.transaction.status,
        completedAt: detail.transaction.completed_at
          ? new Date(detail.transaction.completed_at)
          : tx.completedAt,
      },
      include: {
        user: {
          include: { settings: true },
        },
      },
    });

    if (statusChanged) {
      broadcastToUser(tx.userId, "transaction:updated", {
        type: "transaction:updated",
        orderId: updated.orderId,
        status: updated.status,
      });
    }

    res.json({ transaction: publicTransaction(updated) });
  } catch (err) {
    res.status(400).json({
      message: err instanceof Error ? err.message : "Gagal cek transaksi",
    });
  }
});

export { router as publicRouter };
