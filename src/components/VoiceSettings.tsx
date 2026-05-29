import { Icon } from "@/components/Icon";

type Props = {
  speechSupported: boolean;
  indonesianVoices: SpeechSynthesisVoice[];
  displayedVoices: SpeechSynthesisVoice[];
  ttsEnabled: boolean;
  ttsVoiceURI: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  onToggleEnabled: () => void;
  onVoiceChange: (uri: string) => void;
  onRateChange: (value: number) => void;
  onPitchChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onPreview: () => void;
};

export function VoiceSettings({
  speechSupported,
  indonesianVoices,
  displayedVoices,
  ttsEnabled,
  ttsVoiceURI,
  ttsRate,
  ttsPitch,
  ttsVolume,
  onToggleEnabled,
  onVoiceChange,
  onRateChange,
  onPitchChange,
  onVolumeChange,
  onPreview,
}: Props) {
  return (
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
            onClick={onToggleEnabled}
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
            onChange={(e) => onVoiceChange(e.target.value)}
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
            onChange={(e) => onRateChange(Number(e.target.value))}
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
            onChange={(e) => onPitchChange(Number(e.target.value))}
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
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <button
          type="button"
          onClick={onPreview}
          disabled={!speechSupported || !ttsEnabled}
          className="btn-secondary w-full disabled:opacity-50"
        >
          <Icon name="play" size={16} />
          Preview Suara
        </button>
      </div>
    </section>
  );
}
