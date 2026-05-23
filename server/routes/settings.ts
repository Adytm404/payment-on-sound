import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { broadcastToUser } from "../realtime";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  merchantName: z.string().min(1).max(100),
  project: z.string().max(100),
  apiKey: z.string().max(5000),
  sandbox: z.boolean(),
  ttsEnabled: z.boolean(),
  ttsVoiceURI: z.string().max(255),
  ttsRate: z.number().min(0.1).max(2),
  ttsPitch: z.number().min(0).max(2),
  ttsVolume: z.number().min(0).max(1),
});

function shape(settings: Awaited<ReturnType<typeof prisma.userSettings.findUnique>>) {
  if (!settings) return null;
  return {
    merchantName: settings.merchantName,
    project: settings.pakasirProject,
    apiKey: settings.pakasirApiKey ? `••••••••${settings.pakasirApiKey.slice(-4)}` : "",
    hasApiKey: Boolean(settings.pakasirApiKey),
    sandbox: settings.sandbox,
    ttsEnabled: settings.ttsEnabled,
    ttsVoiceURI: settings.ttsVoiceURI,
    ttsRate: Number(settings.ttsRate),
    ttsPitch: Number(settings.ttsPitch),
    ttsVolume: Number(settings.ttsVolume),
  };
}

router.get("/", async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  let settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId, pakasirProject: "", pakasirApiKey: "" },
    });
  }
  res.json({ settings: shape(settings) });
});

router.put("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data pengaturan tidak valid" });
    return;
  }

  const userId = BigInt(req.auth!.userId);
  const current = await prisma.userSettings.findUnique({ where: { userId } });
  const apiKey = parsed.data.apiKey.startsWith("••••")
    ? current?.pakasirApiKey ?? ""
    : parsed.data.apiKey;

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      merchantName: parsed.data.merchantName,
      pakasirProject: parsed.data.project,
      pakasirApiKey: apiKey,
      sandbox: parsed.data.sandbox,
      ttsEnabled: parsed.data.ttsEnabled,
      ttsVoiceURI: parsed.data.ttsVoiceURI,
      ttsRate: parsed.data.ttsRate,
      ttsPitch: parsed.data.ttsPitch,
      ttsVolume: parsed.data.ttsVolume,
    },
    update: {
      merchantName: parsed.data.merchantName,
      pakasirProject: parsed.data.project,
      pakasirApiKey: apiKey,
      sandbox: parsed.data.sandbox,
      ttsEnabled: parsed.data.ttsEnabled,
      ttsVoiceURI: parsed.data.ttsVoiceURI,
      ttsRate: parsed.data.ttsRate,
      ttsPitch: parsed.data.ttsPitch,
      ttsVolume: parsed.data.ttsVolume,
    },
  });

  broadcastToUser(userId, "settings:updated", { type: "settings:updated" });
  res.json({ settings: shape(settings) });
});

export { router as settingsRouter };
