import { Icon } from "./Icon";

type Key =
  | "0" | "1" | "2" | "3" | "4"
  | "5" | "6" | "7" | "8" | "9"
  | "000"
  | "backspace";

type Props = {
  onPress: (key: Key) => void;
  className?: string;
};

const KEYS: Array<{ key: Key; label?: string; icon?: string }> = [
  { key: "1", label: "1" },
  { key: "2", label: "2" },
  { key: "3", label: "3" },
  { key: "4", label: "4" },
  { key: "5", label: "5" },
  { key: "6", label: "6" },
  { key: "7", label: "7" },
  { key: "8", label: "8" },
  { key: "9", label: "9" },
  { key: "000", label: "000" },
  { key: "0", label: "0" },
  { key: "backspace", icon: "delete" },
];

export function NumberPad({ onPress, className = "" }: Props) {
  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {KEYS.map(({ key, label, icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onPress(key)}
          className="flex h-16 items-center justify-center rounded-[1.35rem] border border-white/70 bg-white/85 text-xl font-bold text-ink shadow-soft backdrop-blur transition hover:bg-white active:scale-95 active:bg-surface-dim"
        >
          {icon ? <Icon name={icon} size={22} /> : label}
        </button>
      ))}
    </div>
  );
}

export type { Key as NumberPadKey };
