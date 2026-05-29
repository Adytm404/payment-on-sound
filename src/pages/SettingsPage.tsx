import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { useApp } from "@/store/AppContext";
import { showToast } from "@/components/Toast";
import { useSpeechVoices } from "@/hooks/useSpeechVoices";
import { speakText } from "@/lib/tts";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { VoiceSettings } from "@/components/VoiceSettings";
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
  const { config, saveConfig, refresh, refreshSettings } = useApp();
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
  const [confirmAction, setConfirmAction] = useState<null | "transactions" | "logout">(
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

  useEffect(() => {
    setMerchantName(config.merchantName);
    setLegalName(config.legalName);
    setKtpNumber(config.ktpNumber);
    setWithdrawBankCode(config.withdrawBankCode);
    setWithdrawAccountNumber(config.withdrawAccountNumber);
    setWithdrawAccountName(config.withdrawAccountName);
  }, [
    config.merchantName,
    config.legalName,
    config.ktpNumber,
    config.withdrawBankCode,
    config.withdrawAccountNumber,
    config.withdrawAccountName,
  ]);

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
    await refreshSettings();
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

  const handleLogout = () => {
    setConfirmAction(null);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="screen gap-5">
      <Header title="Pengaturan" subtitle="Kelola data merchant, suara, dan akun" />

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

        {config.merchantStatus === "pending_review" ? (
          <div className="mb-4 rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 text-sm">
            <div className="flex items-start gap-3">
              <Icon name="clock" size={20} className="mt-0.5 text-blue-600" />
              <div>
                <p className="font-extrabold text-blue-800">Data sedang ditinjau admin</p>
                <p className="mt-1 text-xs font-semibold text-blue-700">
                  Verifikasi biasanya selesai dalam 1×24 jam kerja. Kamu akan dapat email saat statusnya berubah, jadi tidak perlu menunggu di halaman ini.
                </p>
              </div>
            </div>
          </div>
        ) : null}

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

        {config.merchantStatus !== "verified" ? <div className="flex flex-col gap-3">
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
        </div> : null}
      </section>

      {/* Voice config */}
      <VoiceSettings
        speechSupported={speechSupported}
        indonesianVoices={indonesianVoices}
        displayedVoices={displayedVoices}
        ttsEnabled={ttsEnabled}
        ttsVoiceURI={ttsVoiceURI}
        ttsRate={ttsRate}
        ttsPitch={ttsPitch}
        ttsVolume={ttsVolume}
        onToggleEnabled={() => setTtsEnabled((v) => !v)}
        onVoiceChange={setTtsVoiceURI}
        onRateChange={setTtsRate}
        onPitchChange={setTtsPitch}
        onVolumeChange={setTtsVolume}
        onPreview={handlePreviewVoice}
      />

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
        description="Semua riwayat transaksi akan dihapus permanen dari akun kamu. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus riwayat"
        tone="danger"
        onConfirm={handleResetTransactions}
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
      </section>
    </div>
  );
}
