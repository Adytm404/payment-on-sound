import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getVapidPublicKey, isPushConfigured, saveSubscription, removeSubscription } from "../utils/push";

const router = Router();

const subscribeSchema = z.object({
  endpoint: z.string().url().max(500),
  keys: z.object({
    p256dh: z.string().max(255),
    auth: z.string().max(255),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(500),
});

// Public key needed by the browser to create a subscription.
router.get("/public-key", (_req, res) => {
  res.json({ publicKey: getVapidPublicKey(), enabled: isPushConfigured() });
});

router.use(requireAuth);

router.post("/subscribe", async (req, res) => {
  if (!isPushConfigured()) {
    res.status(503).json({ message: "Push notification belum dikonfigurasi server" });
    return;
  }
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data subscription tidak valid" });
    return;
  }
  await saveSubscription(BigInt(req.auth!.userId), parsed.data, req.headers["user-agent"]);
  res.status(201).json({ ok: true });
});

router.post("/unsubscribe", async (req, res) => {
  const parsed = unsubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data subscription tidak valid" });
    return;
  }
  await removeSubscription(parsed.data.endpoint);
  res.json({ ok: true });
});

export { router as pushRouter };
