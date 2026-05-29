import { prisma } from "../db";
import type { Plan, Prisma } from "@prisma/client";
import { wibStartOfMonth, wibStartDaysAgo } from "./settlement";

const planCache = new Map<string, { plan: Plan | null; expiresAt: number }>();
const PLAN_CACHE_TTL = 60_000;

export function invalidatePlanCache(userId: bigint | string) {
  planCache.delete(userId.toString());
}

export function invalidateAllPlanCache() {
  planCache.clear();
}

/**
 * Atomically increments a promo's usedCount, respecting maxRedemptions.
 * Returns true if the redemption was counted, false if the cap was reached.
 * Uses a conditional updateMany so concurrent redemptions can't exceed the cap.
 */
export async function tryRedeemPromo(
  tx: Prisma.TransactionClient,
  promoId: bigint,
  maxRedemptions: number | null,
): Promise<boolean> {
  if (maxRedemptions == null) {
    await tx.promoCode.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
    return true;
  }
  const result = await tx.promoCode.updateMany({
    where: { id: promoId, usedCount: { lt: maxRedemptions } },
    data: { usedCount: { increment: 1 } },
  });
  return result.count > 0;
}

export async function getFreePlan() {
  return prisma.plan.findUnique({ where: { slug: "free" } });
}

export async function getUserPlan(userId: bigint) {
  const key = userId.toString();
  const cached = planCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.plan;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });
  if (!user) {
    planCache.set(key, { plan: null, expiresAt: Date.now() + PLAN_CACHE_TTL });
    return null;
  }

  let plan: Plan | null;
  if (user.plan?.isActive && user.plan.slug === "pro" && user.planExpiresAt && user.planExpiresAt.getTime() < Date.now()) {
    plan = await getFreePlan();
  } else if (user.plan?.isActive) {
    plan = user.plan;
  } else {
    plan = await getFreePlan();
  }

  planCache.set(key, { plan, expiresAt: Date.now() + PLAN_CACHE_TTL });
  return plan;
}

export function monthStart() {
  return wibStartOfMonth();
}

export function retentionStart(days: number | null | undefined) {
  if (!days) return null;
  return wibStartDaysAgo(Math.max(0, days - 1));
}

export function publicPlan(plan: Awaited<ReturnType<typeof getUserPlan>>) {
  if (!plan) return null;
  return {
    id: plan.id.toString(),
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    price: plan.price,
    billingPeriodDays: plan.billingPeriodDays,
    monthlyTransactionLimit: plan.monthlyTransactionLimit,
    maxTransactionAmount: plan.maxTransactionAmount,
    reportRetentionDays: plan.reportRetentionDays,
    canUseRealtime: plan.canUseRealtime,
    canExportReports: plan.canExportReports,
    canUseTts: plan.canUseTts,
    canUsePublicPaymentPage: plan.canUsePublicPaymentPage,
    canSeeAdminFee: plan.canSeeAdminFee,
    isActive: plan.isActive,
    sortOrder: plan.sortOrder,
  };
}
