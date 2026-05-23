import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getPaymentReceivedAudio } from "../utils/edgeTts";

const router = Router();
router.use(requireAuth);

router.get("/payment-received", async (req, res) => {
  const amount = Number(req.query.amount ?? 0);
  try {
    const audio = await getPaymentReceivedAudio(amount);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    audio.stream.pipe(res);
  } catch (err) {
    res.status(400).json({
      message: err instanceof Error ? err.message : "Gagal membuat audio TTS",
    });
  }
});

export { router as ttsRouter };
