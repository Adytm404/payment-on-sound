import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import { formatRupiah, formatRelative } from "@/lib/format";
import {
  STATUS_COLOR,
  STATUS_DOT,
  STATUS_LABEL,
  classNames,
} from "@/lib/status";
import type { StoredTransaction } from "@/lib/storage";

type Props = {
  tx: StoredTransaction;
  to?: string;
  compact?: boolean;
  showFee?: boolean;
};

export function TransactionItem({ tx, to, compact = false, showFee = false }: Props) {
  const target = to ?? `/transaksi/${tx.orderId}`;
  const isIncome = tx.status === "completed";

  return (
    <Link
      to={target}
      className="flex items-center gap-3 rounded-[1.35rem] border border-white/70 bg-white/80 px-3.5 py-3 shadow-soft backdrop-blur transition hover:bg-white active:scale-[0.98]"
    >
      <div
        className={classNames(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          isIncome ? "bg-emerald-100 text-emerald-700" : "bg-primary-100 text-primary-700",
        )}
      >
        <Icon name={isIncome ? "arrow-down-left" : "qr-code"} size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">
            {tx.description || `QRIS ${tx.orderId.slice(-5)}`}
          </p>
          <span
            className={classNames(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              STATUS_COLOR[tx.status],
            )}
          >
            <span className={classNames("h-1.5 w-1.5 rounded-full", STATUS_DOT[tx.status])} />
            {STATUS_LABEL[tx.status]}
          </span>
        </div>
        {!compact ? (
          <p className="truncate text-xs text-ink-muted">
            {formatRelative(tx.createdAt)} • {tx.orderId}
          </p>
        ) : null}
        {showFee ? (
          <p className="mt-0.5 truncate text-[11px] font-semibold text-rose-500">
            Biaya admin {formatRupiah(tx.fee)}
          </p>
        ) : null}
      </div>

      <div
        className={classNames(
          "shrink-0 text-right text-sm font-semibold tabular-nums",
          isIncome ? "text-emerald-600" : "text-ink",
        )}
      >
        {isIncome ? "+" : ""}
        {formatRupiah(tx.amount)}
      </div>
    </Link>
  );
}
