import { useEffect, useState } from "react";
import { adminApi, type PlatformSettings } from "@/lib/adminApi";
import { showToast } from "@/components/Toast";

export default function AdminPlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>({ duitkuMerchantCode: "", duitkuApiKey: "", duitkuSandbox: true });
  useEffect(() => { adminApi.platformSettings().then((res) => setSettings(res.settings)); }, []);
  const save = async () => {
    const res = await adminApi.savePlatformSettings(settings);
    setSettings(res.settings);
    showToast("Setting Duitku tersimpan", "success");
  };
  return <div className="space-y-6 p-5 lg:p-8"><div><p className="text-xs uppercase tracking-[0.28em] text-red-300">Platform</p><h2 className="text-3xl font-black">Setting Pembayaran Pro</h2><p className="mt-1 text-slate-400">Credential Duitku platform untuk pembayaran upgrade Free ke Pro.</p></div><section className="max-w-2xl rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><div className="grid gap-4"><label className="text-sm font-bold">Duitku Merchant Code<input className="input mt-2 bg-white text-ink" value={settings.duitkuMerchantCode} onChange={(e) => setSettings({ ...settings, duitkuMerchantCode: e.target.value })} /></label><label className="text-sm font-bold">Duitku API Key<input className="input mt-2 bg-white text-ink" value={settings.duitkuApiKey} onChange={(e) => setSettings({ ...settings, duitkuApiKey: e.target.value })} /></label><label className="flex items-center justify-between gap-3 rounded-2xl bg-black/25 px-4 py-3 text-sm font-bold"><span>Sandbox Mode</span><input type="checkbox" checked={settings.duitkuSandbox} onChange={(e) => setSettings({ ...settings, duitkuSandbox: e.target.checked })} /></label></div><button onClick={save} className="mt-5 rounded-2xl bg-[#D71920] px-5 py-3 text-sm font-black text-white">Simpan Setting</button></section></div>;
}
