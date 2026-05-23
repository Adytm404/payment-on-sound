import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Icon } from "@/components/Icon";
import { useApp } from "@/store/AppContext";
import { showToast } from "@/components/Toast";
import { storage } from "@/lib/storage";
import { useSpeechVoices } from "@/hooks/useSpeechVoices";
import { speakText } from "@/lib/tts";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { config, saveConfig, refresh } = useApp();
  const { logout } = useAuth();

  const [project, setProject] = useState(config.project);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [merchantName, setMerchantName] = useState(config.merchantName);
  const [sandbox, setSandbox] = useState(config.sandbox);
  const [ttsEnabled, setTtsEnabled] = useState(config.ttsEnabled);
  const [ttsVoiceURI, setTtsVoiceURI] = useState(config.ttsVoiceURI);
  const [ttsRate, setTtsRate] = useState(config.ttsRate);
  const [ttsPitch, setTtsPitch] = useState(config.ttsPitch);
  const [ttsVolume, setTtsVolume] = useState(config.ttsVolume);
  const [showApiKey, setShowApiKey] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "transactions" | "all" | "logout">(
    null,
  );
  const { voices, supported: speechSupported } = useSpeechVoices();
  const indonesianVoices = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("id"),
  );
  const displayedVoices = indonesianVoices.length > 0 ? indonesianVoices : voices;

  const dirty =
    project !== config.project ||
    apiKey !== config.apiKey ||
    sandbox !== config.sandbox ||
    merchantName !== config.merchantName ||
    ttsEnabled !== config.ttsEnabled ||
    ttsVoiceURI !== config.ttsVoiceURI ||
    ttsRate !== config.ttsRate ||
    ttsPitch !== config.ttsPitch ||
    ttsVolume !== config.ttsVolume;

  const handleSave = () => {
    if (!project.trim()) {
      showToast("Slug proyek tidak boleh kosong", "error");
      return;
    }
    if (!apiKey.trim()) {
      showToast("API key tidak boleh kosong", "error");
      return;
    }
    saveConfig({
      project: project.trim(),
      apiKey: apiKey.trim(),
      merchantName: merchantName.trim() || "Merchant",
      sandbox,
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
    project,
    apiKey,
    merchantName: merchantName.trim() || "Merchant",
    sandbox,
    ttsEnabled,
    ttsVoiceURI: displayedVoices.some((voice) => voice.voiceURI === ttsVoiceURI)
      ? ttsVoiceURI
      : "",
    ttsRate,
    ttsPitch,
    ttsVolume,
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

      {/* Pakasir config */}
      <section className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary">
            <Icon name="key" size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Pakasir API</h2>
            <p className="text-[11px] text-ink-muted">
              Dapatkan dari halaman detail proyek di app.pakasir.com
            </p>
          </div>
        </div>

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
              className="input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              Project Slug
            </label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="contoh: depodomain"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="input font-mono text-xs"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="••••••••••••"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="input pr-12 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowApiKey((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-ink-muted"
                aria-label={showApiKey ? "Sembunyikan" : "Tampilkan"}
              >
                <Icon name={showApiKey ? "eye-off" : "eye"} size={16} />
              </button>
            </div>
          </div>

          <label className="mt-1 flex items-center justify-between gap-3 rounded-2xl bg-surface-alt px-4 py-3">
            <div>
              <p className="text-sm font-medium">Mode Sandbox</p>
              <p className="text-[11px] text-ink-muted">
                Aktifkan tombol simulasi pembayaran di halaman QR
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSandbox((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                sandbox ? "bg-primary" : "bg-zinc-300"
              }`}
              role="switch"
              aria-checked={sandbox}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  sandbox ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </label>
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
