import { useState } from "react";
import { Icon } from "@/components/Icon";
import { formatRupiah } from "@/lib/format";

type Props = {
  value: number[];
  onChange: (next: number[]) => void;
};

const MAX_PRESETS = 8;
const MIN_AMOUNT = 1_000;
const MAX_AMOUNT = 10_000_000;

export function QuickAmountSettings({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const n = Number(draft.replace(/\D/g, ""));
    if (!Number.isFinite(n) || n < MIN_AMOUNT || n > MAX_AMOUNT) return;
    if (value.includes(n)) {
      setDraft("");
      return;
    }
    if (value.length >= MAX_PRESETS) return;
    onChange([...value, n].sort((a, b) => a - b));
    setDraft("");
  };

  const remove = (n: number) => onChange(value.filter((v) => v !== n));

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary">
          <Icon name="zap" size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Nominal Cepat</h2>
          <p className="text-[11px] text-ink-muted">
            Tombol nominal pintasan saat membuat pembayaran
          </p>
        </div>
      </div>

      {value.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((n) => (
            <span key={n} className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink">
              {formatRupiah(n)}
              <button type="button" onClick={() => remove(n)} aria-label={`Hapus ${n}`} className="text-ink-soft hover:text-rose-600">
                <Icon name="x" size={13} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-ink-muted">Belum ada nominal cepat. Default: 10rb, 25rb, 50rb, 100rb.</p>
      )}

      {value.length < MAX_PRESETS ? (
        <div className="flex gap-2">
          <input
            className="input"
            inputMode="numeric"
            placeholder="Mis. 15000"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <button type="button" onClick={add} className="rounded-[1.25rem] bg-ink px-4 text-xs font-extrabold text-white">
            Tambah
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-ink-soft">Maksimal {MAX_PRESETS} nominal cepat.</p>
      )}
    </section>
  );
}
