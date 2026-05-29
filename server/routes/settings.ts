import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireActiveUser, requireVerifiedEmail } from "../middleware/admin";
import { broadcastToUser } from "../realtime";
import { bankNameByCode } from "../utils/banks";

const router = Router();
router.use(requireAuth);

const schema = z.object({
  merchantName: z.string().min(1).max(100),
  legalName: z.string().max(100).optional().nullable(),
  ktpNumber: z.string().max(32).optional().nullable(),
  withdrawBankCode: z.string().max(50).optional().nullable(),
  withdrawAccountNumber: z.string().max(64).optional().nullable(),
  withdrawAccountName: z.string().max(100).optional().nullable(),
  ttsEnabled: z.boolean(),
  ttsVoiceURI: z.string().max(255),
  ttsRate: z.number().min(0.1).max(2),
  ttsPitch: z.number().min(0).max(2),
  ttsVolume: z.number().min(0).max(1),
  quickAmounts: z.array(z.number().int().min(1000).max(10_000_000)).max(8).optional(),
});

function parseQuickAmounts(raw: string): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);
}

function serializeQuickAmounts(values: number[]): string {
  return Array.from(new Set(values.filter((v) => Number.isFinite(v) && v >= 1000 && v <= 10_000_000)))
    .slice(0, 8)
    .join(",");
}

function shape(settings: Awaited<ReturnType<typeof prisma.userSettings.findUnique>>) {
  if (!settings) return null;
  return {
    merchantName: settings.merchantName,
    merchantStatus: settings.merchantStatus,
    legalName: settings.legalName ?? "",
    ktpNumber: settings.ktpNumber ?? "",
    withdrawBankCode: settings.withdrawBankCode ?? "",
    withdrawBankName: settings.withdrawBankName ?? "",
    withdrawAccountNumber: settings.withdrawAccountNumber ?? "",
    withdrawAccountName: settings.withdrawAccountName ?? "",
    merchantNameValid: settings.merchantNameValid,
    legalNameValid: settings.legalNameValid,
    ktpNumberValid: settings.ktpNumberValid,
    withdrawBankValid: settings.withdrawBankValid,
    withdrawAccountNumberValid: settings.withdrawAccountNumberValid,
    withdrawAccountNameValid: settings.withdrawAccountNameValid,
    merchantNameNote: settings.merchantNameNote ?? "",
    legalNameNote: settings.legalNameNote ?? "",
    ktpNumberNote: settings.ktpNumberNote ?? "",
    withdrawBankNote: settings.withdrawBankNote ?? "",
    withdrawAccountNumberNote: settings.withdrawAccountNumberNote ?? "",
    withdrawAccountNameNote: settings.withdrawAccountNameNote ?? "",
    verificationNote: settings.verificationNote ?? "",
    submittedAt: settings.submittedAt,
    verifiedAt: settings.verifiedAt,
    project: settings.pakasirProject ? "configured" : "",
    apiKey: settings.pakasirApiKey ? "configured" : "",
    hasApiKey: Boolean(settings.pakasirApiKey),
    sandbox: settings.sandbox,
    ttsEnabled: settings.ttsEnabled,
    ttsVoiceURI: settings.ttsVoiceURI,
    ttsRate: Number(settings.ttsRate),
    ttsPitch: Number(settings.ttsPitch),
    ttsVolume: Number(settings.ttsVolume),
    quickAmounts: parseQuickAmounts(settings.quickAmounts),
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

router.put("/", requireActiveUser, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ message: "Data pengaturan tidak valid" });
    return;
  }

  const userId = BigInt(req.auth!.userId);
  const current = await prisma.userSettings.findUnique({ where: { userId } });
  const canEditMerchant = !current || current.merchantStatus === "draft" || current.merchantStatus === "needs_revision";
  const bankCode = parsed.data.withdrawBankCode?.trim() || null;
  const bankName = bankCode ? bankNameByCode(bankCode) : "";
  const nextStatus = current?.merchantStatus === "verified" ? "verified" : current?.merchantStatus === "pending_review" ? "pending_review" : "draft";
  const quickAmounts = parsed.data.quickAmounts ? serializeQuickAmounts(parsed.data.quickAmounts) : undefined;

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      merchantName: parsed.data.merchantName,
      merchantStatus: nextStatus,
      legalName: parsed.data.legalName?.trim() || null,
      ktpNumber: parsed.data.ktpNumber?.trim() || null,
      withdrawBankCode: bankCode,
      withdrawBankName: bankName,
      withdrawAccountNumber: parsed.data.withdrawAccountNumber?.trim() || null,
      withdrawAccountName: parsed.data.withdrawAccountName?.trim() || null,
      pakasirProject: "",
      pakasirApiKey: "",
      ttsEnabled: parsed.data.ttsEnabled,
      ttsVoiceURI: parsed.data.ttsVoiceURI,
      ttsRate: parsed.data.ttsRate,
      ttsPitch: parsed.data.ttsPitch,
      ttsVolume: parsed.data.ttsVolume,
      ...(quickAmounts !== undefined ? { quickAmounts } : {}),
    },
    update: {
      ...(canEditMerchant ? {
        merchantName: parsed.data.merchantName,
        merchantStatus: nextStatus,
        legalName: parsed.data.legalName?.trim() || null,
        ktpNumber: parsed.data.ktpNumber?.trim() || null,
        withdrawBankCode: bankCode,
        withdrawBankName: bankName,
        withdrawAccountNumber: parsed.data.withdrawAccountNumber?.trim() || null,
        withdrawAccountName: parsed.data.withdrawAccountName?.trim() || null,
      } : {}),
      ttsEnabled: parsed.data.ttsEnabled,
      ttsVoiceURI: parsed.data.ttsVoiceURI,
      ttsRate: parsed.data.ttsRate,
      ttsPitch: parsed.data.ttsPitch,
      ttsVolume: parsed.data.ttsVolume,
      ...(quickAmounts !== undefined ? { quickAmounts } : {}),
    },
  });

  broadcastToUser(userId, "settings:updated", { type: "settings:updated" });
  res.json({ settings: shape(settings) });
});

router.post("/submit-verification", requireVerifiedEmail, async (req, res) => {
  const userId = BigInt(req.auth!.userId);
  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  if (!settings) {
    res.status(400).json({ message: "Data merchant belum lengkap" });
    return;
  }
  if (!settings.merchantName || !settings.legalName || !settings.ktpNumber || !settings.withdrawBankCode || !settings.withdrawAccountNumber || !settings.withdrawAccountName) {
    res.status(422).json({ message: "Lengkapi semua data merchant sebelum submit verifikasi" });
    return;
  }
  if (settings.merchantStatus !== "draft" && settings.merchantStatus !== "needs_revision") {
    res.status(400).json({ message: "Data merchant sedang diproses admin dan belum bisa disubmit ulang" });
    return;
  }
  const updated = await prisma.userSettings.update({
    where: { userId },
    data: { merchantStatus: "pending_review", submittedAt: new Date() },
  });
  broadcastToUser(userId, "settings:updated", { type: "settings:updated" });
  res.json({ settings: shape(updated) });
});

export { router as settingsRouter };
