import { Router } from "express";
import { subscribe } from "../realtime";
import { verifyToken } from "../utils/token";

const router = Router();

router.get("/", async (req, res) => {
  const token = String(req.query.token ?? "");
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const payload = verifyToken(token);
    subscribe(payload.userId, res);
  } catch (err) {
    res.status(401).json({ message: err instanceof Error ? err.message : "Token tidak valid" });
  }
});

export { router as realtimeRouter };
