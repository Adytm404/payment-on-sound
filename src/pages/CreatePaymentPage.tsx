import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { NumberPad, type NumberPadKey } from "@/components/NumberPad";
import { useApp } from "@/store/AppContext";
import { showToast } from "@/components/Toast";
import { formatRupiah } from "@/lib/format";

const MIN_AMOUNT = 1_000;
const MAX_AMOUNT = 10_000_000;

export default function CreatePaymentPage() {
  const navigate = useNavigate();
  const { config, isConfigured, createTransaction } = useApp();

  const [amountStr, setAmountStr] = useState("0");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeAmount, setShakeAmount] = useState(false);

  const amount = Number(amountStr) || 0;
  const tooLow = amount < MIN_AMOUNT;
  const tooHigh = amount > MAX_AMOUNT;
  const notVerified = config.merchantStatus !== "verified";
  const integrationPending = !notVerified && !isConfigured;
  const blocked = notVerified || integrationPending;

  const handleKey = (key: NumberPadKey) => {
    setAmountStr((prev) => {
      if (key === "backspace") {
        const next = prev.slice(0, -1);
        return next || "0";
      }

      if ((Number(prev) || 0) > MAX_AMOUNT) {
        setShakeAmount(false);
        requestAnimationFrame(() => setShakeAmount(true));
        return prev;
      }

      const candidate = (prev === "0" ? "" : prev) + key;
      const value = Number(candidate);
      if (!Number.isFinite(value)) return prev;
      return candidate;
    });
  };

  const handleQuick = (n: number) => {
    setAmountStr(String(n));
  };

  const handleGenerate = async () => {
    if (tooLow) {
      showToast(`Minimal ${formatRupiah(MIN_AMOUNT)}`, "error");
      return;
    }
    if (amount > MAX_AMOUNT) {
      showToast(`Maksimal transaksi ${formatRupiah(MAX_AMOUNT)}`, "error");
      return;
    }

    setLoading(true);

    try {
      const tx = await createTransaction({
        amount,
        description: description.trim() || undefined,
      });
      navigate(`/transaksi/${tx.orderId}`, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat transaksi";
      showToast(msg, "error");
      setLoading(false);
    }
  };

  return (
    <div className="payment-screen">
      <Header back title="Terima Pembayaran" subtitle="Buat QRIS sesuai nominal" />
      {blocked ? (
        <section className="card my-auto p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary">
            <Icon name={integrationPending ? "loader-circle" : "badge-check"} size={24} className={integrationPending ? "animate-spin" : ""} />
          </div>
          {integrationPending ? (
            <>
              <h2 className="text-xl font-extrabold">Integrasi pembayaran disiapkan</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Data merchant kamu sudah terverifikasi. Admin sedang mengaktifkan integrasi pembayaran. Kamu bisa langsung membuat QRIS setelah aktif.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-extrabold">Merchant belum terverifikasi</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Lengkapi data merchant dan tunggu verifikasi admin sebelum membuat QRIS.
              </p>
              <button type="button" onClick={() => navigate("/pengaturan")} className="btn-primary mt-5 w-full">
                Lengkapi Data Merchant
              </button>
            </>
          )}
        </section>
      ) : (
        <>

      {/* Amount display */}
      <section className="payment-amount-block">
        <img
          src="/qris-logo.svg"
          alt="QRIS"
          className="payment-qris-logo"
        />
        <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-semibold text-ink-muted">Nominal pembayaran</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-semibold text-ink-muted">Rp</span>
          <span
            className={`payment-amount-text ${
              tooHigh ? "text-rose-600" : tooLow ? "text-ink-soft" : "text-ink"
            } ${shakeAmount ? "animate-shake" : ""}`}
            onAnimationEnd={() => setShakeAmount(false)}
          >
            {amount.toLocaleString("id-ID")}
          </span>
        </div>
        {tooLow ? (
          <p className="text-xs font-semibold text-rose-500">
            Minimal {formatRupiah(MIN_AMOUNT)}
          </p>
        ) : tooHigh ? (
          <p className="text-xs font-semibold text-rose-500">
            Maksimal {formatRupiah(MAX_AMOUNT)}
          </p>
        ) : (
          <p className="text-xs text-ink-soft">
            Maksimal {formatRupiah(MAX_AMOUNT)} per transaksi
          </p>
        )}

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {[10_000, 25_000, 50_000, 100_000].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleQuick(n)}
              className="rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-ink-muted shadow-soft hover:bg-white"
            >
              {formatRupiah(n)}
            </button>
          ))}
        </div>
        </div>
      </section>

      {/* Description */}
      <section>
        <label className="mb-1.5 block text-xs font-bold text-ink-muted">
          Keterangan (opsional)
        </label>
        <input
          type="text"
          maxLength={60}
          placeholder="Contoh: Pembelian kopi latte"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </section>

      {/* NumberPad */}
      <section className="payment-numberpad-section">
        <NumberPad onPress={handleKey} />
      </section>

      {/* Payment button */}
      <div className="sticky bottom-4 mt-auto pb-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || tooLow || tooHigh}
          className="payment-submit inline-flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-4 text-base font-extrabold text-white shadow-card transition active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Icon name="loader-circle" size={18} className="animate-spin" />
              Membuat QRIS...
            </>
          ) : (
            <>
              <Icon name="qr-code" size={18} />
              Buat Pembayaran
            </>
          )}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
