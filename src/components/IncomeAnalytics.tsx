import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";

type Daily = { day: string; total: number; count: number };
type Hourly = { hour: number; total: number; count: number };

function dayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00+07:00");
  return new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(d);
}

export function IncomeAnalytics() {
  const [range, setRange] = useState<"7d" | "30d">("7d");
  const [daily, setDaily] = useState<Daily[]>([]);
  const [hourly, setHourly] = useState<Hourly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getAnalytics(range)
      .then((res) => {
        if (cancelled) return;
        setDaily(res.daily);
        setHourly(res.hourly);
      })
      .catch(() => {
        if (!cancelled) showToast("Gagal memuat analitik", "error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const totalRange = daily.reduce((sum, d) => sum + d.total, 0);
  const countRange = daily.reduce((sum, d) => sum + d.count, 0);
  const maxDaily = Math.max(1, ...daily.map((d) => d.total));
  const busiest = hourly.reduce<Hourly | null>((best, h) => (!best || h.total > best.total ? h : best), null);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Analitik Pemasukan</h3>
          <p className="text-[11px] text-ink-muted">Tren pemasukan dari transaksi berhasil</p>
        </div>
        <div className="flex rounded-full bg-surface-alt p-0.5 text-[11px] font-bold">
          {(["7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 transition ${range === r ? "bg-white text-ink shadow-soft" : "text-ink-muted"}`}
            >
              {r === "7d" ? "7 hari" : "30 hari"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="soft-panel p-3">
          <p className="text-[11px] text-ink-muted">Total {range === "7d" ? "7 hari" : "30 hari"}</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-emerald-600">{formatRupiah(totalRange)}</p>
        </div>
        <div className="soft-panel p-3">
          <p className="text-[11px] text-ink-muted">Transaksi berhasil</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-ink">{countRange}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-8 text-ink-muted">
          <Icon name="loader-circle" size={20} className="animate-spin" />
        </div>
      ) : daily.length === 0 ? (
        <p className="mt-4 py-6 text-center text-xs text-ink-muted">Belum ada pemasukan pada periode ini.</p>
      ) : (
        <>
          <div className="mt-5">
            <p className="mb-2 text-[11px] font-semibold text-ink-muted">Pemasukan harian</p>
            <div className="flex items-end justify-between gap-1" style={{ height: 120 }}>
              {daily.map((d) => {
                const h = Math.max(4, Math.round((d.total / maxDaily) * 100));
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${formatRupiah(d.total)}`}>
                    <div className="flex w-full items-end justify-center" style={{ height: 100 }}>
                      <div className="w-full max-w-[22px] rounded-t-md bg-[#D71920]" style={{ height: `${h}%` }} />
                    </div>
                    {range === "7d" ? (
                      <span className="text-[9px] text-ink-soft">{dayLabel(d.day)}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {busiest && busiest.total > 0 ? (
            <div className="mt-4 rounded-2xl bg-surface-alt px-4 py-3">
              <p className="text-[11px] text-ink-muted">Jam paling ramai</p>
              <p className="mt-0.5 text-sm font-bold text-ink">
                {String(busiest.hour).padStart(2, "0")}:00 – {String((busiest.hour + 1) % 24).padStart(2, "0")}:00 WIB
                <span className="ml-2 font-semibold text-ink-muted">{formatRupiahCompact(busiest.total)}</span>
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
