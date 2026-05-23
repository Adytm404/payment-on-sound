import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { QRDisplay } from "@/components/QRDisplay";
import { showToast } from "@/components/Toast";
import { useCountdown } from "@/hooks/useCountdown";
import { api, type PublicTransaction } from "@/lib/api";
import { formatCountdown, formatDateTime, formatRupiah } from "@/lib/format";
import { STATUS_COLOR, STATUS_LABEL, classNames } from "@/lib/status";

export default function PublicPaymentPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [tx, setTx] = useState<PublicTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const remaining = useCountdown(tx?.expiredAt);

  const publicUrl = `${window.location.origin}/p/${orderId}`;
  const isPending = tx?.status === "pending";

  useEffect(() => {
    setLoading(true);
    api
      .getPublicTransaction(orderId)
      .then((next) => {
        setTx(next);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Transaksi tidak ditemukan");
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    if (!isPending) return;
    let cancelled = false;
    const id = setInterval(() => {
      api
        .checkPublicTransaction(orderId)
        .then((next) => {
          if (!cancelled) setTx(next);
        })
        .catch(() => undefined);
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isPending, orderId]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast("Link pembayaran disalin", "success");
    } catch {
      showToast("Gagal menyalin link", "error");
    }
  };

  const shareWhatsapp = () => {
    const text = tx
      ? `Silakan scan QRIS untuk pembayaran ${formatRupiah(tx.totalPayment)}:\n${publicUrl}`
      : publicUrl;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-5 text-sm text-ink-muted">
        Memuat pembayaran...
      </div>
    );
  }

  if (error || !tx) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Icon name="circle-alert" size={28} />
        </div>
        <h1 className="mt-4 text-xl font-extrabold">Pembayaran tidak ditemukan</h1>
        <p className="mt-1 text-sm text-ink-muted">{error}</p>
        <Link to="/login" className="btn-secondary mt-5">
          Ke Halaman Login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col gap-4 px-5 py-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <img src="/qris-logo.svg" alt="QRIS" className="h-12 w-auto" />
        <div>
          <h1 className="text-lg font-extrabold text-ink">{tx.merchantName}</h1>
          <p className="text-xs text-ink-muted">Pembayaran #{tx.orderId.slice(-8)}</p>
        </div>
      </header>

      <div className="soft-panel flex items-center justify-between p-3">
        <span
          className={classNames(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            STATUS_COLOR[tx.status],
          )}
        >
          {tx.status === "pending" ? (
            <Icon name="loader-circle" size={12} className="animate-spin" />
          ) : tx.status === "completed" ? (
            <Icon name="check" size={12} />
          ) : (
            <Icon name="circle-x" size={12} />
          )}
          {STATUS_LABEL[tx.status]}
        </span>
        {tx.status === "pending" ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-ink">
            <Icon name="timer" size={14} className="text-ink-muted" />
            {formatCountdown(remaining)}
          </div>
        ) : tx.completedAt ? (
          <span className="text-xs text-ink-muted">{formatDateTime(tx.completedAt)}</span>
        ) : null}
      </div>

      <section className="flex flex-col items-center gap-4">
        <div className="relative">
          <QRDisplay value={tx.paymentNumber} />
          {tx.status !== "pending" ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-white/85 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-center">
                <div
                  className={classNames(
                    "flex h-14 w-14 items-center justify-center rounded-full",
                    tx.status === "completed"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-zinc-100 text-zinc-500",
                  )}
                >
                  <Icon name={tx.status === "completed" ? "check" : "x"} size={28} />
                </div>
                <p className="text-sm font-semibold">{STATUS_LABEL[tx.status]}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full text-center">
          <p className="text-xs font-semibold text-ink-muted">Total pembayaran</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums text-ink">
            {formatRupiah(tx.totalPayment)}
          </p>
          {tx.fee > 0 ? (
            <p className="mt-1 text-[11px] text-ink-soft">
              Termasuk biaya {formatRupiah(tx.fee)}
            </p>
          ) : null}
        </div>

        {tx.description ? (
          <p className="max-w-[320px] text-center text-xs text-ink-muted">
            {tx.description}
          </p>
        ) : null}
      </section>

      <div className="mt-auto grid grid-cols-2 gap-3 pb-2">
        <button type="button" onClick={copyUrl} className="btn-secondary py-3.5">
          <Icon name="copy" size={16} />
          Salin Link
        </button>
        <button
          type="button"
          onClick={shareWhatsapp}
          className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#25D366] px-5 py-3.5 text-sm font-extrabold text-white shadow-card transition active:scale-[0.98]"
        >
          <Icon name="send" size={16} />
          WhatsApp
        </button>
      </div>
    </div>
  );
}
