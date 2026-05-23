import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

type Props = {
  title?: string;
  subtitle?: string;
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  align?: "left" | "center";
};

export function Header({
  title,
  subtitle,
  back,
  onBack,
  right,
  align = "left",
}: Props) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center gap-3 pb-2">
      {back ? (
        <button
          type="button"
          onClick={onBack ?? (() => navigate(-1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/85 shadow-soft backdrop-blur active:scale-95"
          aria-label="Kembali"
        >
          <Icon name="arrow-left" size={18} />
        </button>
      ) : null}

      <div className={align === "center" ? "flex-1 text-center" : "flex-1"}>
        {title ? (
          <h1 className="text-lg font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>
        ) : null}
        {subtitle ? (
          <p className="text-xs text-ink-muted">{subtitle}</p>
        ) : null}
      </div>

      {right ?? <div className="w-10" />}
    </header>
  );
}
