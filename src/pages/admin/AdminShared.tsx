import { formatRupiah } from "@/lib/format";
import { classNames, STATUS_COLOR, STATUS_LABEL } from "@/lib/status";
import type { ReactNode } from "react";

export function StatCard({ label, value, tone = "dark" }: { label: string; value: ReactNode; tone?: "dark" | "red" | "green" }) {
  return (
    <div className={classNames("rounded-[1.75rem] border p-5", tone === "red" ? "border-red-400/30 bg-red-500/15" : tone === "green" ? "border-emerald-400/30 bg-emerald-500/15" : "border-white/10 bg-white/[0.04]")}> 
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={classNames("rounded-full px-2.5 py-1 text-xs font-bold", STATUS_COLOR[status as keyof typeof STATUS_COLOR] ?? "bg-slate-100 text-slate-700")}>{STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status}</span>;
}

export function Money({ value }: { value: number }) {
  return <span className="tabular-nums">{formatRupiah(value)}</span>;
}
