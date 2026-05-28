import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { api, type Withdrawal, type WithdrawalSummary } from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import { useApp } from "@/store/AppContext";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function statusLabel(status: string) {
  if (status === "pending") return "Menunggu review admin";
  if (status === "approved") return "Disetujui";
  if (status === "processing") return "Diproses transfer";
  if (status === "paid") return "Sudah ditransfer";
  if (status === "rejected") return "Ditolak";
  return "Dibatalkan";
}

function settlementText(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default function WithdrawalPage() {
  const { refresh } = useApp();
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [userNote, setUserNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const [summaryRes, listRes] = await Promise.all([api.getWithdrawalSummary(), api.listWithdrawals()]);
    setSummary(summaryRes.summary);
    setRows(listRes.data);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat penarikan")).finally(() => setLoading(false));
    const onChanged = () => load().then(refresh).catch(() => undefined);
    window.addEventListener("pasound:withdrawals-changed", onChanged);
    return () => window.removeEventListener("pasound:withdrawals-changed", onChanged);
  }, [refresh]);

  async function submit() {
    const value = Number(amount.replace(/\D/g, ""));
    if (!summary) return;
    if (value < summary.minimumWithdrawal) {
      setError(`Minimal penarikan ${formatRupiah(summary.minimumWithdrawal)}`);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.createWithdrawal({ amount: value, userNote });
      setAmount("");
      setUserNote("");
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat request penarikan");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(requestId: string) {
    setSubmitting(true);
    setError("");
    try {
      await api.cancelWithdrawal(requestId);
      await load();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan request");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="screen">Memuat penarikan...</div>;
  if (!summary) return <div className="screen text-red-600">{error || "Gagal memuat penarikan"}</div>;

  const canSubmit = summary.merchantStatus === "verified" && !summary.hasActiveRequest && summary.availableBalance >= summary.minimumWithdrawal;
  const nextSettlement = settlementText(summary.nextSettlementAt);

  return (
    <div className="screen gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D71920]">Wallet</p>
          <h1 className="text-2xl font-black text-ink">Penarikan Dana</h1>
        </div>
        <Link to="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-soft">
          <Icon name="arrow-left" size={18} />
        </Link>
      </div>

      <section className="rounded-[1.75rem] bg-[#D71920] p-5 text-white shadow-card">
        <p className="text-sm font-semibold text-white/75">Saldo tersedia</p>
        <h2 className="mt-2 text-4xl font-black leading-tight tabular-nums">{formatRupiah(summary.availableBalance)}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl bg-white/15 p-3"><p className="text-white/70">Saldo tertunda</p><p className="font-extrabold">{formatRupiah(summary.pendingSettlement)}</p></div>
          <div className="rounded-2xl bg-white/15 p-3"><p className="text-white/70">Penarikan aktif/paid</p><p className="font-extrabold">{formatRupiah(summary.reservedWithdrawal)}</p></div>
          <div className="rounded-2xl bg-white/15 p-3"><p className="text-white/70">Dana settled</p><p className="font-extrabold">{formatRupiah(summary.settledIncome)}</p></div>
          <div className="rounded-2xl bg-white/15 p-3"><p className="text-white/70">Income sukses</p><p className="font-extrabold">{formatRupiah(summary.completedIncome)}</p></div>
        </div>
        {nextSettlement && <p className="mt-4 rounded-2xl bg-white/15 p-3 text-xs font-semibold text-white/85">Saldo tertunda berikutnya masuk saldo utama pada {nextSettlement} WIB.</p>}
      </section>

      {error && <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}

      <section className="soft-panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="landmark" size={18} />
          <h2 className="font-extrabold text-ink">Rekening Tujuan</h2>
        </div>
        <p className="text-sm font-black text-ink">{summary.bank.name || "Belum tersedia"}</p>
        <p className="mt-1 font-mono text-sm text-ink-muted">{summary.bank.accountNumber || "-"}</p>
        <p className="mt-1 text-sm font-bold text-ink">{summary.bank.accountName || "-"}</p>
        <p className="mt-3 text-xs text-ink-muted">Rekening mengikuti data merchant yang sudah diverifikasi admin.</p>
      </section>

      <section className="soft-panel overflow-hidden p-0">
        <div className="border-b border-slate-100 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D71920]">F.A.Q</p>
          <h2 className="mt-1 font-extrabold text-ink">Informasi Saldo</h2>
        </div>
        <details className="group border-b border-slate-100 p-4" open>
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-extrabold text-blue-600">
            <Icon name="chevron-right" size={15} className="transition group-open:rotate-90" />
            Kenapa saldo saya tertunda?
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Sistem settlement menggunakan aturan <strong className="text-ink">H+1, 12.00 siang</strong>. Artinya setiap transaksi akan masuk ke saldo tertunda terlebih dahulu. Lalu esok harinya <strong className="text-ink">pukul 12.00 WIB</strong>, saldo tersebut akan berpindah ke saldo utama.
            {summary.pendingSettlement > 0 ? <> Saldo tertunda kamu saat ini <strong className="text-ink">{formatRupiah(summary.pendingSettlement)}</strong>.</> : null}
          </p>
        </details>
        <details className="group p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-extrabold text-blue-600">
            <Icon name="chevron-right" size={15} className="transition group-open:rotate-90" />
            Berarti bukan 24 jam setelah transaksi?
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            <strong className="text-ink">Betul.</strong> Settlement mengikuti aturan <strong className="text-ink">H+1, 12.00 siang</strong>, menggantikan aturan sebelumnya yang berbasis 24 jam setelah transaksi.
          </p>
        </details>
      </section>

      <section className="soft-panel p-4">
        <h2 className="mb-3 font-extrabold text-ink">Request Penarikan</h2>
        {summary.merchantStatus !== "verified" ? (
          <p className="text-sm text-ink-muted">Data merchant harus diverifikasi admin sebelum bisa menarik dana.</p>
        ) : summary.hasActiveRequest ? (
          <p className="text-sm text-ink-muted">Masih ada request aktif. Tunggu admin memproses sebelum membuat request baru.</p>
        ) : summary.availableBalance < summary.minimumWithdrawal ? (
          <p className="text-sm text-ink-muted">Saldo tersedia belum mencapai minimal penarikan. Dana yang masih tertunda akan masuk saldo utama sesuai jadwal settlement.</p>
        ) : (
          <div className="space-y-3">
            <input className="input" inputMode="numeric" placeholder={`Minimal ${formatRupiah(summary.minimumWithdrawal)}`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
            <textarea className="input min-h-24 resize-none" placeholder="Catatan opsional" value={userNote} onChange={(e) => setUserNote(e.target.value)} />
            <button onClick={submit} disabled={!canSubmit || submitting} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">
              <Icon name="send" size={16} />
              Ajukan Penarikan
            </button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-extrabold text-ink">Riwayat Penarikan</h2>
        {rows.length === 0 ? (
          <div className="soft-panel p-5 text-center text-sm text-ink-muted">Belum ada request penarikan.</div>
        ) : rows.map((row) => (
          <div key={row.requestId} className="soft-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-ink-muted">{row.requestId}</p>
                <p className="mt-1 text-xl font-black text-ink">{formatRupiah(row.amount)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-black ${STATUS_STYLE[row.status] ?? STATUS_STYLE.cancelled}`}>{statusLabel(row.status)}</span>
            </div>
            <p className="mt-2 text-xs text-ink-muted">{new Date(row.createdAt).toLocaleString("id-ID")}</p>
            {row.adminNote && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-ink-muted">Catatan admin: {row.adminNote}</p>}
            {row.status === "pending" && <button disabled={submitting} onClick={() => cancel(row.requestId)} className="mt-3 text-xs font-extrabold text-red-600">Batalkan request</button>}
          </div>
        ))}
      </section>
    </div>
  );
}
