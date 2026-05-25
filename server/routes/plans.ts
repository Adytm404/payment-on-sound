import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireActiveUser } from "../middleware/admin";
import { getUserPlan, publicPlan } from "../utils/plans";
import { createDuitkuInvoice } from "../utils/duitkuPop";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  res.json({ plans: plans.map(publicPlan) });
});

router.get("/current", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: BigInt(req.auth!.userId) },
    select: { planExpiresAt: true },
  });
  const plan = await getUserPlan(BigInt(req.auth!.userId));
  res.json({ plan: publicPlan(plan), planExpiresAt: user?.planExpiresAt ?? null });
});

router.put("/current", requireActiveUser, async (req, res) => {
  const slug = String(req.body.slug ?? "");
  if (slug === "pro") {
    res.status(400).json({ message: "Upgrade Pro harus melalui pembayaran atau promo." });
    return;
  }
  const plan = await prisma.plan.findFirst({ where: { slug, isActive: true } });
  if (!plan) {
    res.status(404).json({ message: "Plan tidak tersedia" });
    return;
  }
  await prisma.user.update({ where: { id: BigInt(req.auth!.userId) }, data: { planId: plan.id, planExpiresAt: slug === "free" ? null : undefined } });
  res.json({ plan: publicPlan(plan) });
});

function addDays(days: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

async function getPromo(code: string) {
  if (!code.trim()) return null;
  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  const now = new Date();
  if (!promo?.isActive) return null;
  if (promo.startsAt && promo.startsAt > now) return null;
  if (promo.expiresAt && promo.expiresAt < now) return null;
  if (promo.maxRedemptions && promo.usedCount >= promo.maxRedemptions) return null;
  return promo;
}

function discountFor(planPrice: number, promo: Awaited<ReturnType<typeof getPromo>>) {
  if (!promo) return 0;
  if (promo.type === "free_trial") return planPrice;
  if (promo.type === "percentage_discount") return Math.min(planPrice, Math.floor(planPrice * ((promo.discountPercent ?? 0) / 100)));
  if (promo.type === "fixed_discount") return Math.min(planPrice, promo.discountAmount ?? 0);
  return 0;
}

router.post("/preview-upgrade", requireActiveUser, async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { slug: "pro" } });
  if (!plan?.isActive) {
    res.status(404).json({ message: "Plan Pro belum tersedia" });
    return;
  }
  const promo = await getPromo(String(req.body.promoCode ?? ""));
  const discountAmount = discountFor(plan.price, promo);
  res.json({
    plan: publicPlan(plan),
    promo: promo ? { code: promo.code, name: promo.name, type: promo.type, trialDays: promo.trialDays } : null,
    amount: plan.price,
    discountAmount,
    finalAmount: Math.max(0, plan.price - discountAmount),
  });
});

router.post("/upgrade", requireActiveUser, async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const [user, plan, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.plan.findUnique({ where: { slug: "pro" } }),
    prisma.platformSettings.findFirst({ orderBy: { id: "asc" } }),
  ]);
  if (!user || !plan?.isActive) {
    res.status(404).json({ message: "Plan Pro belum tersedia" });
    return;
  }
  const promo = await getPromo(String(req.body.promoCode ?? ""));
  const discountAmount = discountFor(plan.price, promo);
  const finalAmount = Math.max(0, plan.price - discountAmount);
  const orderId = `PLAN${Date.now()}${userId.toString()}`.slice(0, 50);
  const baseExpiry = user.planExpiresAt && user.planExpiresAt > new Date() ? user.planExpiresAt : new Date();
  const expiresAt = addDays(promo?.type === "free_trial" ? (promo.trialDays ?? plan.billingPeriodDays ?? 30) : (plan.billingPeriodDays ?? 30), baseExpiry);

  if (finalAmount <= 0) {
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.planOrder.create({
        data: { userId, planId: plan.id, promoCodeId: promo?.id, orderId, provider: "promo", amount: plan.price, discountAmount, finalAmount, status: "paid", paidAt: new Date(), expiresAt },
      });
      if (promo) await tx.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
      await tx.user.update({ where: { id: userId }, data: { planId: plan.id, planExpiresAt: expiresAt } });
      return created;
    });
    res.json({ order, paymentUrl: null, activated: true });
    return;
  }

  if (!settings?.duitkuMerchantCode || !settings.duitkuApiKey) {
    res.status(400).json({ message: "Duitku admin belum dikonfigurasi" });
    return;
  }
  const appUrl = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  const apiUrl = process.env.PUBLIC_API_BASE_URL ?? appUrl;
  let invoice;
  try {
    invoice = await createDuitkuInvoice({
      config: { merchantCode: settings.duitkuMerchantCode, apiKey: settings.duitkuApiKey, sandbox: settings.duitkuSandbox },
      amount: finalAmount,
      orderId,
      productDetails: `Upgrade Pasound Pro ${plan.billingPeriodDays ?? 30} Hari`,
      customerName: user.name,
      email: user.email,
      callbackUrl: `${apiUrl}/api/duitku/plan-callback`,
      returnUrl: `${appUrl}/pengaturan?upgrade=return`,
    });
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : "Gagal membuat invoice Duitku" });
    return;
  }
  const order = await prisma.planOrder.create({
    data: { userId, planId: plan.id, promoCodeId: promo?.id, orderId, provider: "duitku_pop", providerReference: invoice.reference, amount: plan.price, discountAmount, finalAmount, status: "pending", paymentUrl: invoice.paymentUrl, expiresAt },
  });
  res.json({ order, paymentUrl: invoice.paymentUrl, activated: false });
});

export { router as plansRouter };
