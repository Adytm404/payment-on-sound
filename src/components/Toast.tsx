import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type ToastType = "success" | "error" | "info";
type Toast = { id: number; message: string; type: ToastType };

let counter = 0;
const listeners = new Set<(t: Toast) => void>();

export function showToast(message: string, type: ToastType = "info") {
  const toast: Toast = { id: ++counter, message, type };
  listeners.forEach((fn) => fn(toast));
}

const ICONS: Record<ToastType, string> = {
  success: "circle-check",
  error: "circle-alert",
  info: "info",
};

const COLORS: Record<ToastType, string> = {
  success: "bg-emerald-600",
  error: "bg-rose-600",
  info: "bg-ink",
};

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (t: Toast) => {
      setToasts((cur) => [...cur, t]);
      setTimeout(() => {
        setToasts((cur) => cur.filter((x) => x.id !== t.id));
      }, 3200);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex w-full max-w-[400px] items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-card animate-slide-up ${COLORS[t.type]}`}
        >
          <Icon name={ICONS[t.type]} size={18} />
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
