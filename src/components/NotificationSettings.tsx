import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { showToast } from "@/components/Toast";
import { enablePush, disablePush, isPushSupported, isPushSubscribed, notificationPermission } from "@/lib/push";

export function NotificationSettings() {
  const supported = isPushSupported();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!supported) return;
    setDenied(notificationPermission() === "denied");
    isPushSubscribed().then(setSubscribed).catch(() => undefined);
  }, [supported]);

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
        showToast("Notifikasi dimatikan", "info");
      } else {
        await enablePush();
        setSubscribed(true);
        showToast("Notifikasi pembayaran diaktifkan", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengubah notifikasi", "error");
      setDenied(notificationPermission() === "denied");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary">
          <Icon name="bell" size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Notifikasi Pembayaran</h2>
          <p className="text-[11px] text-ink-muted">
            Dapatkan notifikasi saat uang masuk, walau aplikasi ditutup
          </p>
        </div>
      </div>

      {!supported ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Browser ini belum mendukung notifikasi push. Pasang aplikasi (Add to Home Screen) untuk pengalaman terbaik.
        </div>
      ) : denied ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Izin notifikasi diblokir di browser. Aktifkan lewat pengaturan situs untuk menerima notifikasi.
        </div>
      ) : (
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface-alt px-4 py-3">
          <div>
            <p className="text-sm font-medium">Aktifkan notifikasi</p>
            <p className="text-[11px] text-ink-muted">
              Notifikasi "Pembayaran diterima" dikirim ke perangkat ini
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={busy}
            className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${
              subscribed ? "bg-primary" : "bg-zinc-300"
            }`}
            role="switch"
            aria-checked={subscribed}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                subscribed ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </label>
      )}
    </section>
  );
}
