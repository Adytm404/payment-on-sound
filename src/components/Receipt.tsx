import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";
import { formatRupiah, formatDateTime } from "@/lib/format";
import type { StoredTransaction } from "@/lib/storage";

type Props = {
  open: boolean;
  onClose: () => void;
  tx: StoredTransaction;
  merchantName: string;
};

const WIDTH = 720;

function paymentMethodLabel(method: string) {
  if (method === "qris") return "QRIS";
  return method.replace(/_/g, " ").toUpperCase();
}

function drawReceipt(canvas: HTMLCanvasElement, tx: StoredTransaction, merchantName: string) {
  const lines: Array<{ label: string; value: string }> = [
    { label: "Order ID", value: tx.orderId },
    { label: "Tanggal", value: formatDateTime(tx.completedAt ?? tx.createdAt) },
    { label: "Metode", value: paymentMethodLabel(tx.paymentMethod) },
  ];
  if (tx.description) lines.push({ label: "Keterangan", value: tx.description });

  const showFee = tx.fee > 0;
  // Compute height dynamically so content never clips.
  const baseHeight = 560;
  const height = baseHeight + lines.length * 56 + (showFee ? 56 : 0);

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = WIDTH * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);

  // Top accent bar
  ctx.fillStyle = "#D71920";
  ctx.fillRect(0, 0, WIDTH, 12);

  const cx = WIDTH / 2;
  let y = 70;

  // Merchant name
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "center";
  ctx.font = "800 38px 'Baloo 2', Nunito, sans-serif";
  ctx.fillText(merchantName || "Merchant", cx, y);
  y += 34;

  ctx.fillStyle = "#7a7a7a";
  ctx.font = "600 20px Nunito, sans-serif";
  ctx.fillText("Bukti Pembayaran QRIS", cx, y);
  y += 56;

  // Success check circle
  ctx.beginPath();
  ctx.arc(cx, y + 18, 34, 0, Math.PI * 2);
  ctx.fillStyle = "#dcfce7";
  ctx.fill();
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx - 15, y + 18);
  ctx.lineTo(cx - 4, y + 29);
  ctx.lineTo(cx + 16, y + 6);
  ctx.stroke();
  y += 90;

  ctx.fillStyle = "#16a34a";
  ctx.font = "800 26px Nunito, sans-serif";
  ctx.fillText("Pembayaran Berhasil", cx, y);
  y += 56;

  // Amount
  ctx.fillStyle = "#7a7a7a";
  ctx.font = "600 18px Nunito, sans-serif";
  ctx.fillText("Total Pembayaran", cx, y);
  y += 50;
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "900 56px 'Baloo 2', Nunito, sans-serif";
  ctx.fillText(formatRupiah(tx.totalPayment), cx, y);
  y += 48;

  // Divider (dashed)
  ctx.strokeStyle = "#e5e5e5";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(60, y);
  ctx.lineTo(WIDTH - 60, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 44;

  // Detail rows
  const allLines = [...lines];
  if (showFee) {
    allLines.splice(0, 0, { label: "Nominal", value: formatRupiah(tx.amount) });
    allLines.splice(1, 0, { label: "Biaya admin", value: formatRupiah(tx.fee) });
  }

  ctx.font = "600 20px Nunito, sans-serif";
  for (const line of allLines) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#7a7a7a";
    ctx.fillText(line.label, 60, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#1a1a1a";
    // Truncate very long values to fit.
    let value = line.value;
    const maxWidth = WIDTH - 60 - 260;
    while (ctx.measureText(value).width > maxWidth && value.length > 4) {
      value = value.slice(0, -2);
    }
    if (value !== line.value) value = value + "…";
    ctx.fillText(value, WIDTH - 60, y);
    y += 56;
  }

  y += 16;
  ctx.textAlign = "center";
  ctx.fillStyle = "#b0b0b0";
  ctx.font = "600 16px Nunito, sans-serif";
  ctx.fillText("Dibuat oleh Pasound", cx, y);
}

export function Receipt({ open, onClose, tx, merchantName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    drawReceipt(canvasRef.current, tx, merchantName);
  }, [open, tx, merchantName]);

  const toBlob = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((b) => resolve(b), "image/png");
    });

  const fileName = `struk-${tx.orderId}.png`;

  const handleDownload = async () => {
    const blob = await toBlob();
    if (!blob) {
      showToast("Gagal membuat struk", "error");
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await toBlob();
      if (!blob) {
        showToast("Gagal membuat struk", "error");
        return;
      }
      const file = new File([blob], fileName, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "Bukti Pembayaran",
          text: `Bukti pembayaran ${formatRupiah(tx.totalPayment)}`,
        });
      } else {
        // Fallback: download the image, then open WhatsApp for manual attach.
        await handleDownload();
        const text = `Bukti pembayaran ${formatRupiah(tx.totalPayment)} — ${merchantName || "Merchant"}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }
    } catch {
      // user cancelled share or it failed; no toast needed for cancel
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Struk Pembayaran" description="Simpan atau bagikan bukti pembayaran">
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-2xl border border-surface-dim">
          <canvas ref={canvasRef} className="h-auto w-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={handleDownload} className="btn-secondary w-full">
            <Icon name="download" size={16} />
            Simpan
          </button>
          <button type="button" onClick={handleShare} disabled={busy} className="btn-primary w-full disabled:opacity-50">
            <Icon name="send" size={16} />
            Bagikan
          </button>
        </div>
        <p className="text-center text-[11px] text-ink-soft">
          Tips: untuk print struk thermal, gunakan tombol Simpan lalu cetak gambar.
        </p>
      </div>
    </Modal>
  );
}
