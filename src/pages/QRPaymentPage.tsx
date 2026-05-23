import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { QRDisplay } from "@/components/QRDisplay";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useApp } from "@/store/AppContext";
import { showToast } from "@/components/Toast";
import { type TransactionStatus } from "@/lib/pakasir";
import { useCountdown } from "@/hooks/useCountdown";
import {
  formatCountdown,
  formatRupiah,
  formatDateTime,
} from "@/lib/format";
import { STATUS_COLOR, STATUS_LABEL, classNames } from "@/lib/status";
import { api } from "@/lib/api";
import type { StoredTransaction } from "@/lib/storage";
import { playBackendPaymentReceived, speakPaymentReceived } from "@/lib/tts";

export default function QRPaymentPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { config, transactions, setTransaction } = useApp();

  const contextTx = useMemo(
    () => transactions.find((t) => t.orderId === orderId),
    [transactions, orderId],
  );
  const [tx, setTx] = useState<StoredTransaction | undefined>(contextTx);
  const announcedRef = useRef(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState<null | "cancel" | "sim">(
    null,
  );
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const expiryRemaining = useCountdown(tx?.expiredAt);
  const isTerminal =
    tx?.status === "completed" ||
    tx?.status === "cancelled" ||
    tx?.status === "expired" ||
    tx?.status === "failed";

  useEffect(() => {
    if (contextTx) setTx(contextTx);
  }, [contextTx]);

  useEffect(() => {
    if (tx || !orderId) return;
    api.getTransaction(orderId).then(setTx).catch(() => undefined);
  }, [tx, orderId]);

  useEffect(() => {
    if (!tx || isTerminal) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      try {
        const next = await api.checkTransaction(tx.orderId);
        if (cancelled) return;
        setTx(next);
        setTransaction(next);
        if (next.status === "completed") {
          if (!announcedRef.current) {
            announcedRef.current = true;
            const spoken = speakPaymentReceived(next.amount, config);
            if (!spoken) void playBackendPaymentReceived(next.amount);
          }
          setShowSuccess(true);
          return;
        }
        if (next.status === "pending") timer = setTimeout(tick, 3000);
      } catch {
        if (!cancelled) timer = setTimeout(tick, 3000);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tx, isTerminal, setTransaction]);

  // Auto-mark expired
  useEffect(() => {
    if (!tx) return;
    if (tx.status === "pending" && expiryRemaining === 0 && tx.expiredAt) {
      const next = { ...tx, status: "expired" as TransactionStatus };
      setTx(next);
      setTransaction(next);
    }
  }, [tx, expiryRemaining, setTransaction]);

  if (!tx) {
    return (
      <div className="screen gap-4">
        <Header back title="Transaksi" />
        <div className="card p-6 text-center">
          <p className="text-sm">Transaksi tidak ditemukan.</p>
          <Link to="/" className="btn-primary mt-4 inline-flex">
            Ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const status: TransactionStatus = tx.status;
  const publicUrl = `${window.location.origin}/p/${tx.orderId}`;

  const handleCopy = async (text: string, label = "QRIS") => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} disalin`, "success");
    } catch {
      showToast("Gagal menyalin", "error");
    }
  };

  const handleShareWhatsapp = () => {
    const text = `Silakan scan QRIS untuk pembayaran ${formatRupiah(tx.totalPayment)}:\n${publicUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleCancel = async () => {
    setCancelConfirmOpen(false);
    setActionLoading("cancel");
    try {
      const next = await api.cancelTransaction(orderId);
      setTx(next);
      setTransaction(next);
      showToast("Transaksi dibatalkan", "info");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membatalkan";
      showToast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSimulate = async () => {
    setActionLoading("sim");
    try {
      await api.simulatePayment(orderId);
      showToast("Simulasi pembayaran terkirim", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal simulasi";
      showToast(msg, "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-6">
      <Header
        back
        title="Pembayaran QRIS"
        subtitle={`#${tx.orderId.slice(-8)}`}
      />

      {/* Status pill + countdown */}
      <div className="soft-panel flex items-center justify-between p-3">
        <span
          className={classNames(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            STATUS_COLOR[status],
          )}
        >
          {status === "pending" ? (
            <Icon name="loader-circle" size={12} className="animate-spin" />
          ) : status === "completed" ? (
            <Icon name="check" size={12} />
          ) : (
            <Icon name="circle-x" size={12} />
          )}
          {STATUS_LABEL[status]}
        </span>
        {status === "pending" ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums text-ink">
            <Icon name="timer" size={14} className="text-ink-muted" />
            {formatCountdown(expiryRemaining)}
          </div>
        ) : tx.completedAt ? (
          <span className="text-xs text-ink-muted">
            {formatDateTime(tx.completedAt)}
          </span>
        ) : null}
      </div>

      {/* QR */}
      <section className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center justify-center py-2">
          <img
            src="/qris-logo.svg"
            alt="QRIS"
            className="h-12 w-auto"
          />
        </div>

        <div className="relative">
          <QRDisplay value={tx.paymentNumber} />
          {status !== "pending" ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/85 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-1.5 text-center">
                <div
                  className={classNames(
                    "flex h-14 w-14 items-center justify-center rounded-full",
                    status === "completed"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-zinc-100 text-zinc-500",
                  )}
                >
                  <Icon
                    name={status === "completed" ? "check" : "x"}
                    size={28}
                  />
                </div>
                <p className="text-sm font-semibold">{STATUS_LABEL[status]}</p>
              </div>
            </div>
          ) : null}
        </div>

        <p className="max-w-[300px] text-center text-xs leading-relaxed text-ink-muted">
          Pindai QR ini di aplikasi e-wallet (GoPay/OVO/DANA/ShopeePay) atau mobile banking yang mendukung QRIS.
        </p>

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
      </section>

      {/* Description */}
      {tx.description ? (
        <div className="soft-panel p-3 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Keterangan
          </p>
          <p className="mt-0.5 text-sm">{tx.description}</p>
        </div>
      ) : null}

      {/* Detail row */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => handleCopy(publicUrl, "Link pembayaran")}
          className="flex items-center gap-2 rounded-[1.35rem] border border-white/70 bg-white/80 px-3 py-3 text-left text-xs shadow-soft backdrop-blur active:scale-[0.98]"
        >
          <Icon name="link" size={16} className="text-ink-muted" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-ink-muted">
              Link Publik
            </p>
            <p className="truncate font-semibold">Salin URL</p>
          </div>
          <Icon name="copy" size={14} className="text-ink-muted" />
        </button>
        <button
          type="button"
          onClick={handleShareWhatsapp}
          className="flex items-center gap-2 rounded-[1.35rem] border border-white/70 bg-white/80 px-3 py-3 text-left text-xs shadow-soft backdrop-blur active:scale-[0.98]"
        >
          <Icon name="send" size={16} className="text-ink-muted" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wide text-ink-muted">
              WhatsApp
            </p>
            <p className="truncate font-semibold">Bagikan link</p>
          </div>
          <Icon name="copy" size={14} className="text-ink-muted" />
        </button>
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-col gap-2 pb-2">
        {status === "pending" ? (
          <>
            {config.sandbox ? (
              <button
                type="button"
                onClick={handleSimulate}
                disabled={actionLoading !== null}
                className="btn-secondary w-full"
              >
                {actionLoading === "sim" ? (
                  <Icon name="loader-circle" size={16} className="animate-spin" />
                ) : (
                  <Icon name="zap" size={16} />
                )}
                Simulasi Bayar (Sandbox)
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setCancelConfirmOpen(true)}
              disabled={actionLoading !== null}
              className="btn-ghost w-full text-rose-600"
            >
              {actionLoading === "cancel" ? (
                <Icon name="loader-circle" size={16} className="animate-spin" />
              ) : (
                <Icon name="x" size={16} />
              )}
              Batalkan Transaksi
            </button>
          </>
        ) : (
            <Link to="/" className="inline-flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-3 text-sm font-extrabold text-white shadow-card transition active:scale-[0.98]">
            <Icon name="house" size={16} />
            Kembali ke Beranda
          </Link>
        )}
      </div>

      {/* Success modal */}
      <Modal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          navigate("/");
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Icon name="check" size={32} />
          </div>
          <h3 className="text-lg font-bold">Pembayaran Berhasil</h3>
          <p className="text-sm text-ink-muted">
            {formatRupiah(tx.totalPayment)} telah masuk ke akun Anda.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSuccess(false);
              navigate("/laporan");
            }}
            className="btn-primary mt-2 w-full"
          >
            Lihat Laporan
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelConfirmOpen}
        title="Batalkan transaksi?"
        description="QRIS ini tidak akan dilanjutkan dan status lokal akan berubah menjadi dibatalkan."
        confirmLabel="Ya, batalkan"
        tone="danger"
        loading={actionLoading === "cancel"}
        onConfirm={handleCancel}
        onCancel={() => setCancelConfirmOpen(false)}
      />
    </div>
  );
}
