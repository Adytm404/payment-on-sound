import { Link } from "react-router-dom";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";
import { Icon } from "@/components/Icon";
import { TransactionItem } from "@/components/TransactionItem";
import { EmptyState } from "@/components/EmptyState";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { formatRupiah } from "@/lib/format";

export default function DashboardPage() {
  const { transactions, config, isConfigured, dashboardSummary } = useApp();
  const { user } = useAuth();

  const recent = transactions.slice(0, 20);
  const merchantReady = config.merchantStatus === "verified" && isConfigured;
  const emailVerified = Boolean(user?.emailVerified);
  const fullyOnboarded = emailVerified && merchantReady;

  const limit = dashboardSummary.monthlyTransactionLimit;
  const quota = limit
    ? {
        used: dashboardSummary.monthlyTransactionUsed,
        limit,
        ratio: limit > 0 ? dashboardSummary.monthlyTransactionUsed / limit : 0,
      }
    : null;

  return (
    <div className="screen gap-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-soft">
            <img src="/qris-logo.svg" alt="QRIS" className="w-full" />
          </div>
          <div>
            <p className="text-xs font-medium text-ink-muted">Selamat datang,</p>
            <p className="text-base font-bold text-ink">
              {config.merchantName || "Merchant"}
            </p>
          </div>
        </div>
        <Link
          to="/pengaturan"
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 shadow-soft active:scale-95"
          aria-label="Pengaturan"
        >
          <Icon name="settings" size={18} />
        </Link>
      </div>

      {!fullyOnboarded ? (
        <OnboardingProgress
          emailVerified={emailVerified}
          merchantStatus={config.merchantStatus}
          isConfigured={isConfigured}
        />
      ) : null}

      {/* Balance */}
      <section className="flex flex-col items-center gap-3 py-5 text-center">
        <span className="rounded-full bg-[#FFF1F1] px-3 py-1 text-[11px] font-extrabold text-[#D71920]">
          Siap menerima pembayaran QRIS
        </span>
        <div>
          <p className="text-xs font-semibold text-ink-muted">Total pemasukan</p>
          <h2 className="mt-1 text-[2.35rem] font-extrabold leading-tight tabular-nums text-ink">
              {formatRupiah(dashboardSummary.totalIncome)}
          </h2>
          <p className="mt-2 text-xs text-ink-muted">
            {dashboardSummary.pendingCount > 0
              ? `${dashboardSummary.pendingCount} transaksi menunggu pembayaran`
              : "Semua transaksi telah dibayar"}
          </p>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          to="/transaksi/baru"
          className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-4 text-base font-extrabold text-white shadow-card transition active:scale-[0.98]"
        >
          <Icon name="qr-code" size={18} />
          Terima Bayar
        </Link>
        <Link to="/laporan" className="btn-secondary py-4 text-base">
          <Icon name="chart-line" size={16} />
          Laporan
        </Link>
        <Link to="/penarikan" className="btn-secondary col-span-2 py-4 text-base">
          <Icon name="wallet" size={16} />
          Penarikan Dana
        </Link>
      </section>

      {/* Weekly status */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Ringkasan Minggu Ini</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="soft-panel p-4">
            <p className="text-xs text-ink-muted">Pemasukan</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-emerald-600">
              {formatRupiah(dashboardSummary.weekIncome)}
            </p>
            <p className="mt-1 text-[10px] text-ink-soft">Hari ini {formatRupiah(dashboardSummary.todayIncome)}</p>
          </div>
          <div className="soft-panel p-4">
            <p className="text-xs text-ink-muted">Menunggu</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-amber-600">
              {formatRupiah(dashboardSummary.pendingAmount)}
            </p>
            <p className="mt-1 text-[10px] text-ink-soft">{dashboardSummary.pendingCount} transaksi</p>
          </div>
        </div>
      </section>

      {/* Free quota nudge */}
      {fullyOnboarded && quota && quota.ratio >= 0.5 ? (
        <section className={`card p-4 ${quota.ratio >= 0.8 ? "border border-amber-200 bg-amber-50" : ""}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink">Kuota transaksi {dashboardSummary.planName}</p>
              <p className="text-[11px] text-ink-muted">
                {quota.used} dari {quota.limit} transaksi bulan ini
              </p>
            </div>
            <span className={`shrink-0 text-sm font-extrabold tabular-nums ${quota.ratio >= 0.8 ? "text-amber-700" : "text-ink"}`}>
              {quota.used}/{quota.limit}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
            <div
              className={`h-full rounded-full ${quota.ratio >= 0.8 ? "bg-amber-500" : "bg-[#D71920]"}`}
              style={{ width: `${Math.min(100, Math.round(quota.ratio * 100))}%` }}
            />
          </div>
          {quota.ratio >= 0.8 ? (
            <Link
              to="/pengaturan/plan"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#D71920]"
            >
              <Icon name="zap" size={14} />
              {quota.used >= quota.limit ? "Kuota habis, upgrade ke Pro" : "Hampir penuh, upgrade ke Pro"}
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* Recent transactions */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Transaksi Terbaru</h3>
          <Link to="/laporan" className="text-xs font-extrabold text-[#D71920]">
            Lihat semua
          </Link>
        </div>

        {recent.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="Belum ada transaksi"
            description={merchantReady ? "Mulai buat QRIS pertama Anda untuk menerima pembayaran." : "Transaksi akan muncul di sini setelah akun kamu aktif."}
            action={
              merchantReady ? (
                <Link to="/transaksi/baru" className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-3 text-sm font-extrabold text-white shadow-card transition active:scale-[0.98]">
                  <Icon name="plus" size={16} />
                  Buat QRIS
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((tx) => (
              <TransactionItem key={tx.orderId} tx={tx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
