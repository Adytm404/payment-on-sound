import type { TransactionStatus } from "./pakasir";

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: "Menunggu",
  completed: "Berhasil",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
  failed: "Gagal",
};

export const STATUS_COLOR: Record<TransactionStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-zinc-100 text-zinc-600",
  expired: "bg-zinc-100 text-zinc-600",
  failed: "bg-rose-100 text-rose-700",
};

export const STATUS_DOT: Record<TransactionStatus, string> = {
  pending: "bg-amber-500",
  completed: "bg-emerald-500",
  cancelled: "bg-zinc-400",
  expired: "bg-zinc-400",
  failed: "bg-rose-500",
};

export function classNames(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}
