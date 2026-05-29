import { Router } from "express";
import { prisma } from "../db";
import { publicTransaction } from "../utils/transactionPresenter";
import { getUserPlan } from "../utils/plans";
import { syncTransactionStatus } from "../utils/transactionSync";

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
  const tx = await findPublicTransaction(String(req.params.orderId));
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
  const tx = await findPublicTransaction(String(req.params.orderId));
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
    const { transaction } = await syncTransactionStatus(tx, {
      project: settings.pakasirProject,
      apiKey: settings.pakasirApiKey,
    });
    res.json({ transaction: publicTransaction({ ...transaction, user: tx.user }) });
  } catch (err) {
    res.status(400).json({
      message: err instanceof Error ? err.message : "Gagal cek transaksi",
    });
  }
});

export { router as publicRouter };
