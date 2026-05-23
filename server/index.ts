import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { settingsRouter } from "./routes/settings";
import { transactionsRouter } from "./routes/transactions";
import { dashboardRouter } from "./routes/dashboard";
import { realtimeRouter } from "./routes/realtime";
import { ttsRouter } from "./routes/tts";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/realtime", realtimeRouter);
app.use("/api/tts", ttsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
