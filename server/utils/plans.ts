import { prisma } from "../db";
import type { Plan } from "@prisma/client";

const planCache = new Map<string, { plan: Plan | null; expiresAt: number }>();
const PLAN_CACHE_TTL = 60_000;

export function invalidatePlanCache(userId: bigint | string) {
  planCache.delete(userId.toString());
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
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function retentionStart(days: number | null | undefined) {
  if (!days) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return start;
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
