import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_VOICE = process.env.EDGE_TTS_VOICE || "id-ID-GadisNeural";
const PYTHON_BIN = process.env.PYTHON_BIN || "py";
const CACHE_DIR = process.env.TTS_CACHE_DIR || path.resolve("storage", "tts");

export function spokenRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Math.round(amount),
  );
}

export async function getPaymentReceivedAudio(amount: number) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) {
    throw new Error("Nominal TTS tidak valid");
  }

  await mkdir(CACHE_DIR, { recursive: true });

  const safeAmount = Math.round(amount);
  const filePath = path.join(CACHE_DIR, `payment-received-${safeAmount}.mp3`);

  try {
    await stat(filePath);
    return { filePath, stream: createReadStream(filePath) };
  } catch {
    // generate below
  }

  const text = `Pembayaran ${spokenRupiah(safeAmount)} rupiah, diterima`;
  await execFileAsync(PYTHON_BIN, [
    "-m",
    "edge_tts",
    "--voice",
    DEFAULT_VOICE,
    "--text",
    text,
    "--write-media",
    filePath,
  ]);

  return { filePath, stream: createReadStream(filePath) };
}
