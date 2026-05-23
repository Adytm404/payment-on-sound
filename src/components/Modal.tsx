import { useEffect } from "react";
import { Icon } from "./Icon";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  description?: string;
};

export function Modal({ open, onClose, title, description, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 animate-fade-in"
      />
      <div className="relative z-10 w-full max-w-[440px] animate-slide-up rounded-t-3xl bg-white p-6 pb-[max(env(safe-area-inset-bottom),24px)] shadow-card sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-ink-muted hover:bg-surface-dim"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
