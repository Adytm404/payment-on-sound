import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";
import { api, type Plan } from "@/lib/api";
import { formatRupiah } from "@/lib/format";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function daysLeft(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

export default function PlanManagementPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [preview, setPreview] = useState<null | { amount: number; discountAmount: number; finalAmount: number; promo: any | null }>(null);
  const [loading, setLoading] = useState(false);
  const [returnStatus, setReturnStatus] = useState<null | "checking" | "active" | "processing">(null);

  const load = async () => {
    const [plansRes, currentRes] = await Promise.all([api.listPlans(), api.currentPlan()]);
    setPlans(plansRes.plans);
    setCurrentPlan(currentRes.plan);
    setPlanExpiresAt(currentRes.planExpiresAt);
    return currentRes;
  };

  useEffect(() => {
    load().catch(() => showToast("Gagal memuat plan", "error"));
  }, []);

  // Handle return from the Duitku payment page. The plan is activated
  // asynchronously via callback, so poll currentPlan briefly for confirmation.
  useEffect(() => {
    if (searchParams.get("upgrade") !== "return") return;
    let cancelled = false;
    let attempts = 0;
    setReturnStatus("checking");

    const poll = async () => {
      attempts += 1;
      try {
        const res = await api.currentPlan();
        if (cancelled) return;
        setCurrentPlan(res.plan);
        setPlanExpiresAt(res.planExpiresAt);
        if (res.plan?.slug === "pro") {
          setReturnStatus("active");
          showToast("Plan Pro aktif", "success");
          return;
        }
      } catch {
        // keep polling
      }
      if (cancelled) return;
      if (attempts >= 8) {
        setReturnStatus("processing");
        return;
      }
      setTimeout(poll, 2500);
    };

    poll();
    // Clear the query param so a refresh doesn't re-trigger the flow.
    searchParams.delete("upgrade");
    setSearchParams(searchParams, { replace: true });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const proPlan = plans.find((plan) => plan.slug === "pro");
  const left = daysLeft(planExpiresAt);
  const isPro = currentPlan?.slug === "pro";

  const handlePreview = async () => {
    const res = await api.previewUpgrade(promoCode);
    setPreview({ amount: res.amount, discountAmount: res.discountAmount, finalAmount: res.finalAmount, promo: res.promo });
    showToast(res.promo ? `Promo ${res.promo.code} aktif` : "Promo tidak digunakan", "info");
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await api.upgradePlan(promoCode);
      if (res.activated) {
        await load();
        showToast("Plan Pro aktif", "success");
        return;
      }
      if (res.paymentUrl) window.location.href = `${res.paymentUrl}${res.paymentUrl.includes("?") ? "&" : "?"}lang=id`;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal upgrade plan", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    if (isPro && left !== null && left > 0) {
      showToast(`Plan akan berubah ke Free setelah ${formatDate(planExpiresAt)}`, "info");
      return;
    }
    setLoading(true);
    try {
      await api.choosePlan("free");
      await load();
      showToast("Plan Free aktif", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal downgrade plan", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen gap-5">
      <Header title="Plan Merchant" subtitle="Kelola paket, promo, dan perpanjangan Pro" />

      {returnStatus ? (
        <section
          className={`flex items-start gap-3 rounded-3xl border px-4 py-3 text-sm font-semibold ${
            returnStatus === "active"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          <Icon
            name={returnStatus === "active" ? "check-circle-2" : "loader-circle"}
            size={20}
            className={returnStatus === "active" ? "mt-0.5" : "mt-0.5 animate-spin"}
          />
          <div>
            {returnStatus === "active" ? (
              <>
                <p>Pembayaran berhasil, plan Pro sudah aktif.</p>
                <p className="mt-0.5 text-xs font-medium text-emerald-700">Selamat menikmati fitur Pro.</p>
              </>
            ) : returnStatus === "checking" ? (
              <>
                <p>Memproses pembayaran kamu…</p>
                <p className="mt-0.5 text-xs font-medium text-blue-700">Tunggu sebentar, kami sedang mengonfirmasi pembayaran.</p>
              </>
            ) : (
              <>
                <p>Pembayaran sedang diproses.</p>
                <p className="mt-0.5 text-xs font-medium text-blue-700">Plan Pro aktif otomatis setelah pembayaran dikonfirmasi. Halaman ini akan diperbarui sendiri.</p>
              </>
            )}
          </div>
        </section>
      ) : null}

      <section className="hero-card p-5">
        <div className="relative z-10">
          <button type="button" onClick={() => navigate("/pengaturan")} className="mb-5 inline-flex items-center gap-2 text-xs font-bold text-white/70">
            <Icon name="arrow-left" size={14} />
            Kembali ke pengaturan
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-primary-100">Plan saat ini</p>
          <h1 className="mt-2 text-4xl font-black text-white">{currentPlan?.name ?? "Free"}</h1>
          <p className="mt-2 text-sm text-white/70">{currentPlan?.description ?? "Cocok untuk mulai menerima pembayaran QRIS tanpa biaya."}</p>
          {isPro ? (
            <div className="mt-5 rounded-3xl bg-white/10 p-4 text-sm font-semibold text-white">
              <p>Aktif sampai {formatDate(planExpiresAt)}</p>
              {left !== null ? <p className={left <= 7 ? "mt-1 text-amber-200" : "mt-1 text-white/70"}>{left > 0 ? `Tersisa ${left} hari` : "Masa aktif Pro sudah berakhir"}</p> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-extrabold">Benefit aktif</h2>
        <div className="mt-4 grid gap-2 text-sm font-semibold text-ink-muted">
          <span>{currentPlan?.monthlyTransactionLimit ? `${currentPlan.monthlyTransactionLimit} transaksi per bulan` : "Transaksi tanpa batas"}</span>
          <span>{currentPlan?.maxTransactionAmount ? `Maksimal transaksi ${formatRupiah(currentPlan.maxTransactionAmount)}` : "Nominal transaksi tanpa batas"}</span>
          <span>{currentPlan?.reportRetentionDays ? `Riwayat laporan ${currentPlan.reportRetentionDays} hari` : "Riwayat laporan lengkap"}</span>
          {currentPlan?.canUseRealtime ? <span>Sinkronisasi multi-perangkat</span> : null}
          {currentPlan?.canExportReports ? <span>Export laporan profesional</span> : null}
          {currentPlan?.canUsePublicPaymentPage ? <span>Link pembayaran pelanggan</span> : null}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-extrabold">{isPro ? "Perpanjang Pro" : "Upgrade ke Pro"}</h2>
        <p className="mt-1 text-xs text-ink-muted">{proPlan ? `${formatRupiah(proPlan.price)} / ${proPlan.billingPeriodDays ?? 30} hari` : "Memuat harga Pro"}</p>
        <div className="mt-4 rounded-[1.5rem] bg-surface-alt p-4">
          <label className="mb-2 block text-xs font-bold text-ink-muted">Promo code</label>
          <div className="flex gap-2">
            <input className="input py-3 uppercase" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="TRIAL7" />
            <button type="button" onClick={handlePreview} className="rounded-[1.25rem] bg-ink px-4 text-xs font-extrabold text-white">Cek</button>
          </div>
          {preview ? (
            <div className="mt-3 text-xs font-semibold text-ink-muted">
              <p>Harga: {formatRupiah(preview.amount)}</p>
              <p>Diskon: {formatRupiah(preview.discountAmount)}</p>
              <p className="text-ink">Total bayar: {formatRupiah(preview.finalAmount)}</p>
            </div>
          ) : null}
        </div>
        <button type="button" disabled={loading} onClick={handleUpgrade} className="mt-4 w-full rounded-[1.4rem] bg-[#D71920] px-5 py-4 text-sm font-extrabold text-white shadow-card disabled:opacity-50">
          {isPro ? "Perpanjang Pro" : "Upgrade ke Pro"}
        </button>
        {isPro ? (
          <button type="button" disabled={loading} onClick={handleDowngrade} className="mt-3 w-full rounded-[1.4rem] bg-surface-alt px-5 py-4 text-sm font-extrabold text-ink disabled:opacity-50">
            {left !== null && left > 0 ? "Jangan perpanjang, kembali Free saat expired" : "Turun ke Free"}
          </button>
        ) : null}
        {isPro && left !== null && left > 0 ? <p className="mt-2 text-center text-xs font-semibold text-ink-muted">Kalau tidak diperpanjang, plan otomatis dianggap Free setelah {formatDate(planExpiresAt)}.</p> : null}
      </section>
    </div>
  );
}
