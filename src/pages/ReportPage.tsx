import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { TransactionItem } from "@/components/TransactionItem";
import { EmptyState } from "@/components/EmptyState";
import { useApp } from "@/store/AppContext";
import { formatRupiah, formatDate } from "@/lib/format";
import { showToast } from "@/components/Toast";
import { classNames } from "@/lib/status";
import type { TransactionStatus } from "@/lib/pakasir";
import { api, type Pagination, type TransactionSummary } from "@/lib/api";
import type { StoredTransaction } from "@/lib/storage";

type Period = "today" | "week" | "month" | "all";
type StatusFilter = "all" | TransactionStatus;
const PAGE_SIZE = 100;

const PERIOD_OPTIONS: Array<{ key: Period; label: string }> = [
  { key: "today", label: "Hari ini" },
  { key: "week", label: "7 hari" },
  { key: "month", label: "30 hari" },
  { key: "all", label: "Semua" },
];

const STATUS_OPTIONS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "Semua" },
  { key: "completed", label: "Berhasil" },
  { key: "pending", label: "Menunggu" },
  { key: "cancelled", label: "Batal" },
  { key: "expired", label: "Kedaluwarsa" },
];

export default function ReportPage() {
  useApp();
  const [period, setPeriod] = useState<Period>("week");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<StoredTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState<TransactionSummary>({
    income: 0,
    pending: 0,
    adminFee: 0,
    completedCount: 0,
    pendingCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [realtimeTick, setRealtimeTick] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [period, statusFilter, search]);

  useEffect(() => {
    const onChange = () => setRealtimeTick((tick) => tick + 1);
    window.addEventListener("pasound:transactions-changed", onChange);
    return () => window.removeEventListener("pasound:transactions-changed", onChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .listTransactions({
          page,
          limit: PAGE_SIZE,
          period,
          status: statusFilter,
          search,
        })
        .then((res) => {
          setTransactions(res.data);
          setPagination(res.pagination);
          setSummary(res.summary);
        })
        .catch((err) => showToast(err instanceof Error ? err.message : "Gagal memuat laporan", "error"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [page, period, statusFilter, search, realtimeTick]);

  // group by day
  const grouped = useMemo(() => {
    const byDay = new Map<string, typeof transactions>();
    transactions.forEach((tx) => {
      const key = new Date(tx.createdAt).toDateString();
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(tx);
    });
    return Array.from(byDay.entries()).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime(),
    );
  }, [transactions]);

  const handleExport = () => {
    if (transactions.length === 0) {
      showToast("Tidak ada data untuk diekspor", "info");
      return;
    }
    const headers = [
      "order_id",
      "description",
      "amount",
      "fee",
      "total_payment",
      "status",
      "created_at",
      "completed_at",
    ];
    const rows = transactions.map((tx) =>
      [
        tx.orderId,
        (tx.description ?? "").replace(/[",\n]/g, " "),
        tx.amount,
        tx.fee,
        tx.totalPayment,
        tx.status,
        tx.createdAt,
        tx.completedAt ?? "",
      ]
        .map((v) => `"${String(v)}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pasound-laporan-${period}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Laporan diunduh", "success");
  };

  return (
    <div className="screen gap-5">
      <Header
        title="Laporan Keuangan"
        subtitle="Ringkasan transaksi QRIS Anda"
        right={
          <button
            type="button"
            onClick={handleExport}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-soft active:scale-95"
            aria-label="Ekspor CSV"
          >
            <Icon name="download" size={18} />
          </button>
        }
      />

      {/* Period filter */}
      <div className="-mx-5 overflow-x-auto px-5 scrollbar-hidden">
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setPeriod(opt.key)}
              className={classNames(
                "shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition",
                period === opt.key
                  ? "bg-ink text-white shadow-card"
                  : "bg-white text-ink-muted shadow-soft",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Pemasukan</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-emerald-600">
            {formatRupiah(summary.income)}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">
            {summary.completedCount} transaksi selesai
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-muted">Menunggu</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-amber-600">
            {formatRupiah(summary.pending)}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">
            {summary.pendingCount} transaksi menunggu
          </p>
        </div>
        <div className="card col-span-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-ink-muted">Biaya Admin</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-rose-600">
                {formatRupiah(summary.adminFee)}
              </p>
              <p className="mt-1 text-[11px] text-ink-soft">
                Total fee dari transaksi berhasil
              </p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Icon name="receipt-text" size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* Status filter chips */}
      <div className="-mx-5 overflow-x-auto px-5 scrollbar-hidden">
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStatusFilter(opt.key)}
              className={classNames(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition",
                statusFilter === opt.key
                  ? "bg-primary text-white"
                  : "bg-white text-ink-muted shadow-soft",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-muted">
          <Icon name="search" size={17} />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari order ID, keterangan, nominal..."
          className="input pl-11 pr-10"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute inset-y-0 right-3 flex items-center text-ink-muted"
            aria-label="Hapus pencarian"
          >
            <Icon name="x" size={16} />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
        <span>{pagination.total} transaksi ditemukan</span>
        {loading ? <span>Memuat...</span> : null}
        {pagination.total > PAGE_SIZE ? (
          <span>
            Halaman {pagination.page} / {pagination.totalPages}
          </span>
        ) : null}
      </div>

      {/* List */}
      <section className="flex flex-col gap-4">
        {grouped.length === 0 ? (
          <EmptyState
            icon="search"
            title="Belum ada transaksi"
            description="Coba ubah filter periode atau buat transaksi baru."
          />
        ) : (
          grouped.map(([day, items]) => (
            <div key={day}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {formatDate(new Date(day))}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((tx) => (
                  <TransactionItem key={tx.orderId} tx={tx} compact showFee />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {pagination.total > PAGE_SIZE ? (
        <div className="grid grid-cols-3 items-center gap-3 rounded-[1.5rem] bg-white/70 p-2 shadow-soft backdrop-blur">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={pagination.page === 1}
            className="btn-secondary px-3 py-2 text-xs disabled:opacity-40"
          >
            <Icon name="chevron-left" size={15} />
            Prev
          </button>
          <p className="text-center text-xs font-extrabold text-ink">
            {pagination.page} / {pagination.totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={pagination.page === pagination.totalPages}
            className="btn-secondary px-3 py-2 text-xs disabled:opacity-40"
          >
            Next
            <Icon name="chevron-right" size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
