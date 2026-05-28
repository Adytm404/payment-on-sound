import { Link } from "react-router-dom";
import { useApp } from "@/store/AppContext";
import { Icon } from "@/components/Icon";
import { TransactionItem } from "@/components/TransactionItem";
import { EmptyState } from "@/components/EmptyState";
import { formatRupiah } from "@/lib/format";

export default function DashboardPage() {
  const { transactions, config, isConfigured, dashboardSummary } = useApp();

  const recent = transactions.slice(0, 20);
  const merchantReady = config.merchantStatus === "verified" && isConfigured;
  const merchantVerified = config.merchantStatus === "verified";

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

      {/* Recent transactions */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink">Transaksi Terbaru</h3>
          <Link to="/laporan" className="text-xs font-extrabold text-[#D71920]">
            Lihat semua
          </Link>
        </div>

        {!merchantReady ? (
          <EmptyState
            icon={merchantVerified ? "loader-circle" : "badge-check"}
            title={merchantVerified ? "Integrasi pembayaran diproses" : "Lengkapi data merchant"}
            description={merchantVerified ? "Admin sedang mengaktifkan integrasi pembayaran merchant kamu." : "Kirim data merchant dan tunggu verifikasi admin sebelum menerima pembayaran QRIS."}
            action={
              <Link to="/pengaturan" className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-3 text-sm font-extrabold text-white shadow-card transition active:scale-[0.98]">
                <Icon name="arrow-right" size={16} />
                Buka Pengaturan
              </Link>
            }
          />
        ) : recent.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="Belum ada transaksi"
            description="Mulai buat QRIS pertama Anda untuk menerima pembayaran."
            action={
              <Link to="/transaksi/baru" className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-[#D71920] px-5 py-3 text-sm font-extrabold text-white shadow-card transition active:scale-[0.98]">
                <Icon name="plus" size={16} />
                Buat QRIS
              </Link>
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
