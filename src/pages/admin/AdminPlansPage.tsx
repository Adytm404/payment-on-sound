import { useEffect, useState } from "react";
import { adminApi, type AdminPlan } from "@/lib/adminApi";
import { showToast } from "@/components/Toast";
import { Money } from "./AdminShared";

const emptyPlan: AdminPlan = {
  id: "",
  name: "",
  slug: "free",
  description: "",
  price: 0,
  billingPeriodDays: null,
  monthlyTransactionLimit: null,
  maxTransactionAmount: null,
  reportRetentionDays: null,
  canUseRealtime: false,
  canExportReports: false,
  canUseTts: true,
  canUsePublicPaymentPage: true,
  canSeeAdminFee: true,
  isActive: true,
  sortOrder: 1,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("free");
  const selected = plans.find((plan) => plan.slug === selectedSlug) ?? plans[0] ?? emptyPlan;

  const load = () => adminApi.plans().then((res) => { setPlans(res.plans); if (!res.plans.some((plan) => plan.slug === selectedSlug)) setSelectedSlug(res.plans[0]?.slug ?? "free"); });
  useEffect(() => { load(); }, []);

  const update = (patch: Partial<AdminPlan>) => setPlans((current) => current.map((plan) => plan.slug === selected.slug ? { ...plan, ...patch } : plan));
  const save = async () => {
    try {
      await adminApi.savePlan(selected.slug, {
        name: selected.name,
        description: selected.description,
        price: selected.price,
        billingPeriodDays: selected.billingPeriodDays,
        monthlyTransactionLimit: selected.monthlyTransactionLimit,
        maxTransactionAmount: selected.maxTransactionAmount,
        reportRetentionDays: selected.reportRetentionDays,
        canUseRealtime: selected.canUseRealtime,
        canExportReports: selected.canExportReports,
        canUseTts: selected.canUseTts,
        canUsePublicPaymentPage: selected.canUsePublicPaymentPage,
        canSeeAdminFee: selected.canSeeAdminFee,
        isActive: selected.isActive,
        sortOrder: selected.sortOrder,
      });
      await load();
      showToast("Plan tersimpan", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyimpan plan", "error");
    }
  };

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div><p className="text-xs uppercase tracking-[0.28em] text-red-300">Monetization</p><h2 className="text-3xl font-black">Manajemen Plan</h2><p className="mt-1 text-slate-400">Atur Free dan Pro tanpa menghapus data user lama.</p></div>
      <section className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-3">
          {plans.map((plan) => <button key={plan.slug} onClick={() => setSelectedSlug(plan.slug)} className={`w-full rounded-[1.5rem] border p-5 text-left transition ${selected.slug === plan.slug ? "border-red-400 bg-red-500/15" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}><div className="flex items-center justify-between"><p className="text-2xl font-black">{plan.name}</p><span className={plan.isActive ? "text-emerald-300" : "text-red-300"}>{plan.isActive ? "Aktif" : "Nonaktif"}</span></div><p className="mt-2 text-sm text-slate-400">{plan.description}</p><p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">{plan._count?.users ?? 0} user</p></button>)}
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">Nama<input className="input mt-2 bg-white text-ink" value={selected.name} onChange={(e) => update({ name: e.target.value })} /></label><label className="text-sm font-bold">Urutan<input type="number" className="input mt-2 bg-white text-ink" value={selected.sortOrder} onChange={(e) => update({ sortOrder: Number(e.target.value) })} /></label></div>
          <label className="mt-4 block text-sm font-bold">Deskripsi marketing<textarea className="input mt-2 min-h-24 bg-white text-ink" value={selected.description} onChange={(e) => update({ description: e.target.value })} /></label>
          <div className="mt-4 grid gap-4 md:grid-cols-2"><NumberField label="Harga plan" value={selected.price} onChange={(value) => update({ price: value ?? 0 })} money /><NumberField label="Masa aktif" value={selected.billingPeriodDays} onChange={(value) => update({ billingPeriodDays: value })} suffix="hari, kosong = permanen" /></div>
          <div className="mt-4 grid gap-4 md:grid-cols-3"><NumberField label="Kuota bulanan" value={selected.monthlyTransactionLimit} onChange={(value) => update({ monthlyTransactionLimit: value })} suffix="Kosong = tanpa batas" /><NumberField label="Maks nominal" value={selected.maxTransactionAmount} onChange={(value) => update({ maxTransactionAmount: value })} money /><NumberField label="Retensi laporan" value={selected.reportRetentionDays} onChange={(value) => update({ reportRetentionDays: value })} suffix="hari" /></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{[
            ["canUseRealtime", "Sinkronisasi multi-perangkat"],
            ["canExportReports", "Export laporan profesional"],
            ["canUseTts", "Notifikasi suara pembayaran"],
            ["canUsePublicPaymentPage", "Link pembayaran pelanggan"],
            ["canSeeAdminFee", "Rincian biaya admin"],
            ["isActive", "Plan aktif"],
          ].map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-black/25 px-4 py-3 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={Boolean(selected[key as keyof AdminPlan])} onChange={(e) => update({ [key]: e.target.checked } as Partial<AdminPlan>)} /></label>)}</div>
          <div className="mt-6 rounded-2xl bg-black/25 p-4 text-sm text-slate-300"><p className="font-black text-white">Preview benefit</p><p className="mt-2">{selected.monthlyTransactionLimit ? `${selected.monthlyTransactionLimit} transaksi per bulan` : "Transaksi tanpa batas"}</p><p>{selected.maxTransactionAmount ? <>Maksimal transaksi <Money value={selected.maxTransactionAmount} /></> : "Nominal transaksi tanpa batas"}</p><p>{selected.reportRetentionDays ? `Riwayat laporan ${selected.reportRetentionDays} hari` : "Riwayat laporan lengkap"}</p></div>
          <button onClick={save} className="mt-5 rounded-2xl bg-[#D71920] px-5 py-3 text-sm font-black text-white">Simpan Plan</button>
        </div>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange, suffix, money = false }: { label: string; value: number | null; onChange: (value: number | null) => void; suffix?: string; money?: boolean }) {
  return <label className="text-sm font-bold">{label}<input type="number" className="input mt-2 bg-white text-ink" value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} placeholder="Tanpa batas" />{suffix ? <span className="mt-1 block text-xs text-slate-500">{suffix}</span> : null}{money && value ? <span className="mt-1 block text-xs text-slate-500"><Money value={value} /></span> : null}</label>;
}
