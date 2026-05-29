import { Router } from "express";
import { prisma } from "../db";
import { verifyDuitkuCallback } from "../utils/duitkuPop";
import { invalidatePlanCache, tryRedeemPromo } from "../utils/plans";

const router = Router();

router.post("/plan-callback", async (req, res) => {
  const merchantCode = String(req.body.merchantCode ?? "");
  const amount = String(req.body.amount ?? "");
  const merchantOrderId = String(req.body.merchantOrderId ?? "");
  const resultCode = String(req.body.resultCode ?? "");
  const reference = String(req.body.reference ?? "");
  const signature = String(req.body.signature ?? "");

  const settings = await prisma.platformSettings.findFirst({ orderBy: { id: "asc" } });
  if (!settings?.duitkuApiKey || !verifyDuitkuCallback({ merchantCode, amount, merchantOrderId, signature, apiKey: settings.duitkuApiKey })) {
    res.status(400).send("Bad Signature");
    return;
  }

  const order = await prisma.planOrder.findUnique({ where: { orderId: merchantOrderId }, include: { plan: true, promoCode: true } });
  if (!order) {
    res.status(404).send("Order not found");
    return;
  }
  if (order.status === "paid") {
    res.status(200).send("OK");
    return;
  }

  // Defense-in-depth: the signature already covers the amount, but reject any
  // callback whose amount doesn't match the order we created.
  if (Math.round(Number(amount)) !== order.finalAmount) {
    res.status(400).send("Amount mismatch");
    return;
  }

  if (resultCode === "00") {
    await prisma.$transaction(async (tx) => {
      await tx.planOrder.update({ where: { id: order.id }, data: { status: "paid", paidAt: new Date(), providerReference: reference || order.providerReference } });
      if (order.promoCodeId) await tryRedeemPromo(tx, order.promoCodeId, order.promoCode?.maxRedemptions ?? null);
      await tx.user.update({ where: { id: order.userId }, data: { planId: order.planId, planExpiresAt: order.expiresAt } });
    });
    invalidatePlanCache(order.userId.toString());
  } else if (resultCode === "01") {
    await prisma.planOrder.update({ where: { id: order.id }, data: { status: "failed", providerReference: reference || order.providerReference } });
  }

  res.status(200).send("OK");
});

export { router as duitkuRouter };
