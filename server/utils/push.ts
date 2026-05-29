import webpush from "web-push";
import { prisma } from "../db";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@pasound.app";

let configured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
} else {
  console.warn("[push] VAPID keys not set; web push disabled.");
}

export function isPushConfigured() {
  return configured;
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}

export async function saveSubscription(userId: bigint, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: userAgent?.slice(0, 255) ?? null,
    },
    update: {
      userId,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  });
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Sends a web push notification to all of a user's subscriptions.
 * Subscriptions that return 404/410 (gone) are pruned automatically.
 */
export async function sendPushToUser(userId: bigint, payload: PushPayload) {
  if (!configured) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const stale: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) stale.push(sub.endpoint);
      }
    }),
  );

  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } });
  }
}
