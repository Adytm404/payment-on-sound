import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { useApp } from "@/store/AppContext";
import { showToast } from "@/components/Toast";
import { storage } from "@/lib/storage";
import { useSpeechVoices } from "@/hooks/useSpeechVoices";
import { speakText } from "@/lib/tts";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api, type Plan } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { formatRupiah } from "@/lib/format";
import { INDONESIAN_BANKS } from "@/lib/banks";

function formatPlanNumber(value: number) {
  return formatRupiah(value);
}

function formatPlanDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { config, saveConfig, refresh } = useApp();
  const { logout } = useAuth();

  const [merchantName, setMerchantName] = useState(config.merchantName);
  const [legalName, setLegalName] = useState(config.legalName);
  const [ktpNumber, setKtpNumber] = useState(config.ktpNumber);
  const [withdrawBankCode, setWithdrawBankCode] = useState(config.withdrawBankCode);
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState(config.withdrawAccountNumber);
  const [withdrawAccountName, setWithdrawAccountName] = useState(config.withdrawAccountName);
  const [ttsEnabled, setTtsEnabled] = useState(config.ttsEnabled);
  const [ttsVoiceURI, setTtsVoiceURI] = useState(config.ttsVoiceURI);
  const [ttsRate, setTtsRate] = useState(config.ttsRate);
  const [ttsPitch, setTtsPitch] = useState(config.ttsPitch);
  const [ttsVolume, setTtsVolume] = useState(config.ttsVolume);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "transactions" | "all" | "logout">(
    null,
  );
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const { voices, supported: speechSupported } = useSpeechVoices();
  const indonesianVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("id"),
  );
  const displayedVoices = indonesianVoices.length > 0 ? indonesianVoices : voices;
  const canEditMerchant = config.merchantStatus === "draft" || config.merchantStatus === "needs_revision";
  const merchantFieldsComplete = Boolean(
    merchantName.trim() &&
      legalName.trim() &&
      ktpNumber.trim() &&
      withdrawBankCode &&
      withdrawAccountNumber.trim() &&
      withdrawAccountName.trim(),
  );
  const showChecklist = config.merchantStatus === "pending_review" || config.merchantStatus === "needs_revision";
  const checklist = [
    ["Nama merchant", config.merchantNameValid, config.merchantNameNote],
    ["Nama KTP", config.legalNameValid, config.legalNameNote],
    ["Nomor KTP", config.ktpNumberValid, config.ktpNumberNote],
    ["Bank penarikan", config.withdrawBankValid, config.withdrawBankNote],
    ["Nomor rekening", config.withdrawAccountNumberValid, config.withdrawAccountNumberNote],
    ["Nama rekening", config.withdrawAccountNameValid, config.withdrawAccountNameNote],
  ] as const;

  useEffect(() => {
    api.currentPlan()
      .then((planRes) => {
        setCurrentPlan(planRes.plan);
        setPlanExpiresAt(planRes.planExpiresAt);
      })
      .catch(() => undefined);
  }, []);

  const dirty =
    merchantName !== config.merchantName ||
    legalName !== config.legalName ||
    ktpNumber !== config.ktpNumber ||
    withdrawBankCode !== config.withdrawBankCode ||
    withdrawAccountNumber !== config.withdrawAccountNumber ||
    withdrawAccountName !== config.withdrawAccountName ||
    ttsEnabled !== config.ttsEnabled ||
    ttsVoiceURI !== config.ttsVoiceURI ||
    ttsRate !== config.ttsRate ||
    ttsPitch !== config.ttsPitch ||
    ttsVolume !== config.ttsVolume;

  const handleSave = () => {
    saveConfig({
      ...config,
      merchantName: merchantName.trim() || "Merchant",
      legalName: legalName.trim(),
      ktpNumber: ktpNumber.trim(),
      withdrawBankCode,
      withdrawBankName: INDONESIAN_BANKS.find((bank) => bank.code === withdrawBankCode)?.name ?? "",
      withdrawAccountNumber: withdrawAccountNumber.trim(),
      withdrawAccountName: withdrawAccountName.trim(),
      ttsEnabled,
      ttsVoiceURI: displayedVoices.some((voice) => voice.voiceURI === ttsVoiceURI)
        ? ttsVoiceURI
        : "",
      ttsRate,
      ttsPitch,
      ttsVolume,
    });
    showToast("Pengaturan tersimpan", "success");
  };

  const currentConfig = {
    ...config,
    merchantName: merchantName.trim() || "Merchant",
    ttsEnabled,
    ttsVoiceURI: displayedVoices.some((voice) => voice.voiceURI === ttsVoiceURI)
      ? ttsVoiceURI
      : "",
    ttsRate,
    ttsPitch,
    ttsVolume,
  };

  const handleSubmitVerification = async () => {
    await saveConfig({
      ...config,
      merchantName: merchantName.trim() || "Merchant",
      legalName: legalName.trim(),
      ktpNumber: ktpNumber.trim(),
      withdrawBankCode,
      withdrawBankName: INDONESIAN_BANKS.find((bank) => bank.code === withdrawBankCode)?.name ?? "",
      withdrawAccountNumber: withdrawAccountNumber.trim(),
      withdrawAccountName: withdrawAccountName.trim(),
      ttsEnabled,
      ttsVoiceURI: displayedVoices.some((voice) => voice.voiceURI === ttsVoiceURI) ? ttsVoiceURI : "",
      ttsRate,
      ttsPitch,
      ttsVolume,
    });
    const next = await api.submitMerchantVerification();
    showToast("Data merchant dikirim untuk verifikasi", "success");
    setMerchantName(next.merchantName);
  };

  const handlePreviewVoice = () => {
    if (!speechSupported) {
      showToast("Text to voice tidak didukung browser ini", "error");
      return;
    }
    speakText("Pembayaran 5.000 rupiah, diterima", currentConfig);
  };

  const handleResetTransactions = async () => {
    setConfirmAction(null);
    await api.clearTransactions();
    await refresh();
    showToast("Riwayat transaksi dihapus", "info");
  };

  const handleResetAll = () => {
    setConfirmAction(null);
    storage.clearAll();
    logout();
    navigate("/login", { replace: true });
  };

  const handleLogout = () => {
    setConfirmAction(null);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="screen gap-5">
      <Header title="Pengaturan" subtitle="Konfigurasi Pakasir & data lokal" />

      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary">
            <Icon name="badge-dollar-sign" size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Plan Merchant</h2>
            <p className="text-[11px] text-ink-muted">Pilih paket fitur yang cocok untuk operasional toko</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate("/pengaturan/plan")} className="w-full rounded-[1.5rem] border border-white/70 bg-surface-alt p-4 text-left transition hover:bg-white active:scale-[0.99]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-extrabold text-ink">{currentPlan?.name ?? "Free"}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {currentPlan?.slug === "pro" ? `Aktif sampai ${formatPlanDate(planExpiresAt)}` : "Upgrade ke Pro untuk transaksi tanpa batas dan laporan lengkap."}
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="text-ink-muted" />
          </div>
          <div className="mt-3 grid gap-1 text-xs font-semibold text-ink-muted">
            <span>{currentPlan?.monthlyTransactionLimit ? `${currentPlan.monthlyTransactionLimit} transaksi per bulan` : "Transaksi tanpa batas"}</span>
            <span>{currentPlan?.maxTransactionAmount ? `Maksimal transaksi ${formatPlanNumber(currentPlan.maxTransactionAmount)}` : "Nominal transaksi tanpa batas"}</span>
          </div>
        </button>
      </section>

      {/* Merchant verification */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary">
            <Icon name="badge-check" size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Pendaftaran Merchant</h2>
            <p className="text-[11px] text-ink-muted">Admin akan verifikasi data dan mengaktifkan integrasi pembayaran</p>
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-surface-alt px-4 py-3 text-xs font-semibold text-ink-muted">
          Status: <span className="text-ink">{config.merchantStatus === "pending_review" ? "Menunggu verifikasi" : config.merchantStatus === "needs_revision" ? "Perlu perbaikan" : config.merchantStatus === "verified" ? "Terverifikasi" : config.merchantStatus === "rejected" ? "Ditolak" : "Draft"}</span>
          {config.verificationNote ? <p className="mt-1 text-rose-600">Catatan admin: {config.verificationNote}</p> : null}
        </div>

        {config.merchantStatus === "verified" ? (
          <div className="mb-4 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 text-sm">
            <div className="flex items-start gap-3">
              <Icon name="check-circle-2" size={20} className="mt-0.5 text-emerald-600" />
              <div>
                <p className="font-extrabold text-emerald-800">Pendaftaran merchant berhasil</p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Merchant kamu sudah terverifikasi dan siap menerima pembayaran QRIS.
                </p>
                <p className="mt-2 text-xs text-emerald-700">
                  Integrasi pembayaran: {config.project && config.apiKey ? "Aktif" : "Sedang dikonfigurasi admin"}
                </p>
              </div>
            </div>
          </div>
        ) : showChecklist ? (
          <div className="mb-4 rounded-[1.5rem] border border-white/70 bg-white/70 p-4">
            <p className="text-sm font-extrabold text-ink">Checklist verifikasi</p>
            <div className="mt-3 grid gap-2">
              {checklist.map(([label, valid, note]) => (
                <div key={label} className="flex items-start gap-2 rounded-2xl bg-surface-alt px-3 py-2 text-xs font-semibold">
                  <Icon name={valid ? "check-circle-2" : "circle"} size={15} className={valid ? "mt-0.5 text-emerald-600" : "mt-0.5 text-ink-soft"} />
                  <div>
                    <p className={valid ? "text-emerald-700" : "text-ink-muted"}>{label}</p>
                    {note ? <p className="mt-0.5 text-rose-600">{note}</p> : null}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Data hanya bisa diubah jika admin meminta perbaikan/submission ulang.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Nama Merchant
            </label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Toko Saya"
              disabled={!canEditMerchant}
              className="input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Nama Sesuai KTP
            </label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="Nama lengkap sesuai KTP"
              disabled={!canEditMerchant}
              className="input"
            />
            {config.legalNameNote ? <p className="mt-1 text-xs text-rose-600">{config.legalNameNote}</p> : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Nomor KTP
            </label>
            <input type="text" inputMode="numeric" value={ktpNumber} onChange={(e) => setKtpNumber(e.target.value)} placeholder="16 digit nomor KTP" disabled={!canEditMerchant} className="input" />
            {config.ktpNumberNote ? <p className="mt-1 text-xs text-rose-600">{config.ktpNumberNote}</p> : null}
          </div>

          <div><label className="mb-1.5 block text-xs font-medium text-ink-muted">Bank Penarikan</label><select className="input" value={withdrawBankCode} onChange={(e) => setWithdrawBankCode(e.target.value)} disabled={!canEditMerchant}><option value="">Pilih bank</option>{INDONESIAN_BANKS.map((bank) => <option key={`${bank.code}-${bank.name}`} value={bank.code}>{bank.name} ({bank.code})</option>)}</select>{config.withdrawBankNote ? <p className="mt-1 text-xs text-rose-600">{config.withdrawBankNote}</p> : null}</div>
          <div><label className="mb-1.5 block text-xs font-medium text-ink-muted">Nomor Rekening Penarikan</label><input className="input" inputMode="numeric" value={withdrawAccountNumber} onChange={(e) => setWithdrawAccountNumber(e.target.value)} placeholder="Nomor rekening" disabled={!canEditMerchant} /><p className="mt-1 text-[11px] font-semibold text-ink-muted">Pastikan nama pemilik rekening sesuai dengan nama pada KTP.</p>{config.withdrawAccountNumberNote ? <p className="mt-1 text-xs text-rose-600">{config.withdrawAccountNumberNote}</p> : null}</div>
          <div><label className="mb-1.5 block text-xs font-medium text-ink-muted">Nama Rekening Penarikan</label><input className="input" value={withdrawAccountName} onChange={(e) => setWithdrawAccountName(e.target.value)} placeholder="Nama pemilik rekening" disabled={!canEditMerchant} />{config.withdrawAccountNameNote ? <p className="mt-1 text-xs text-rose-600">{config.withdrawAccountNameNote}</p> : null}</div>
          {canEditMerchant ? <button type="button" onClick={handleSubmitVerification} disabled={!merchantFieldsComplete} className="btn-primary w-full disabled:opacity-50">Kirim Untuk Verifikasi</button> : null}
        </div>
      </section>

      {/* Voice config */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary">
            <Icon name="volume-2" size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Suara Otomatis</h2>
            <p className="text-[11px] text-ink-muted">
              Dibacakan saat pembayaran berhasil diterima
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {!speechSupported ? (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
              Browser ini belum mendukung Web Speech API.
            </div>
          ) : null}

          <label className="flex items-center justify-between gap-3 rounded-2xl bg-surface-alt px-4 py-3">
            <div>
              <p className="text-sm font-medium">Aktifkan pengumuman</p>
              <p className="text-[11px] text-ink-muted">
                Contoh: "Pembayaran 5.000 rupiah, diterima"
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTtsEnabled((v) => !v)}
              disabled={!speechSupported}
              className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40 ${
                ttsEnabled ? "bg-primary" : "bg-zinc-300"
              }`}
              role="switch"
              aria-checked={ttsEnabled}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  ttsEnabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </label>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Gaya Suara
            </label>
            <select
              value={ttsVoiceURI}
              onChange={(e) => setTtsVoiceURI(e.target.value)}
              disabled={!speechSupported || displayedVoices.length === 0}
              className="input disabled:opacity-60"
            >
              <option value="">
                {indonesianVoices.length > 0
                  ? "Otomatis Bahasa Indonesia"
                  : "Otomatis (fallback browser)"}
              </option>
              {displayedVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} — {voice.lang}
                </option>
              ))}
            </select>
            {speechSupported && indonesianVoices.length === 0 ? (
              <p className="mt-1.5 text-[11px] text-amber-700">
                Suara Bahasa Indonesia belum tersedia. Pilih suara lain sebagai fallback,
                atau gunakan otomatis browser.
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-muted">
              <span>Kecepatan</span>
              <span>{ttsRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.5"
              step="0.1"
              value={ttsRate}
              onChange={(e) => setTtsRate(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-muted">
              <span>Nada</span>
              <span>{ttsPitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.4"
              step="0.1"
              value={ttsPitch}
              onChange={(e) => setTtsPitch(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-muted">
              <span>Volume</span>
              <span>{Math.round(ttsVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={ttsVolume}
              onChange={(e) => setTtsVolume(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <button
            type="button"
            onClick={handlePreviewVoice}
            disabled={!speechSupported || !ttsEnabled}
            className="btn-secondary w-full disabled:opacity-50"
          >
            <Icon name="play" size={16} />
            Preview Suara
          </button>
        </div>
      </section>

      <div className="sticky bottom-24 z-10 -mx-1 rounded-[1.5rem] bg-white/60 p-1.5 shadow-soft backdrop-blur-xl">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="btn-primary w-full py-4 text-base disabled:opacity-50"
        >
          <Icon name="save" size={18} />
          Simpan Semua Pengaturan
        </button>
      </div>

      {/* Danger zone */}
      <section className="card p-5">
        <button
          type="button"
          onClick={() => setDangerOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={dangerOpen}
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Icon name="triangle-alert" size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Zona Berbahaya</h2>
              <p className="text-[11px] text-ink-muted">
                Reset dan hapus data lokal
              </p>
            </div>
          </div>
          <Icon
            name="chevron-down"
            size={18}
            className={`text-ink-muted transition ${dangerOpen ? "rotate-180" : ""}`}
          />
        </button>

        {dangerOpen ? (
          <div className="mt-4 flex flex-col gap-2 animate-slide-up">
            <button
              type="button"
              onClick={() => setConfirmAction("transactions")}
              className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <Icon name="trash-2" size={16} />
                Hapus Riwayat Transaksi
              </span>
              <Icon name="chevron-right" size={16} className="text-rose-300" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmAction("all")}
              className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <Icon name="rotate-ccw" size={16} />
                Reset Semua Data
              </span>
              <Icon name="chevron-right" size={16} className="text-rose-300" />
            </button>
          </div>
        ) : null}
      </section>

      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-alt text-ink-muted">
            <Icon name="user" size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Akun</h2>
            <p className="text-[11px] text-ink-muted">
              Keluar dari akun di perangkat ini
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmAction("logout")}
          className="flex w-full items-center justify-between rounded-2xl bg-surface-alt px-4 py-3 text-sm font-semibold text-ink active:scale-[0.98]"
        >
          <span className="flex items-center gap-2">
            <Icon name="log-out" size={16} />
            Logout
          </span>
          <Icon name="chevron-right" size={16} className="text-ink-soft" />
        </button>
      </section>

      <ConfirmDialog
        open={confirmAction === "transactions"}
        title="Hapus riwayat transaksi?"
        description="Semua transaksi lokal akan dihapus dari browser ini. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus riwayat"
        tone="danger"
        onConfirm={handleResetTransactions}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === "all"}
        title="Reset semua data?"
        description="Konfigurasi Pakasir, setting suara, dan semua transaksi lokal akan dihapus."
        confirmLabel="Reset semua"
        tone="danger"
        onConfirm={handleResetAll}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmDialog
        open={confirmAction === "logout"}
        title="Logout dari akun?"
        description="Anda akan keluar dari akun di perangkat ini. Data tetap aman di database."
        confirmLabel="Logout"
        onConfirm={handleLogout}
        onCancel={() => setConfirmAction(null)}
      />

      {/* About */}
      <section className="card p-5 text-center">
        <p className="text-xs font-semibold text-primary">Pasound v0.1</p>
        <p className="mt-0.5 text-[11px] text-ink-muted">
          QRIS Generator & Laporan Keuangan
        </p>
        <p className="mt-2 text-[11px] text-ink-soft">
          Powered by{" "}
          <a
            href="https://pakasir.com"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-primary"
          >
            Pakasir
          </a>
        </p>
      </section>
    </div>
  );
}
