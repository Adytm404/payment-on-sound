import { useEffect, useRef, useState } from "react";
import {
  getTransactionDetail,
  type PakasirConfig,
  type TransactionStatus,
} from "@/lib/pakasir";

type Options = {
  config: PakasirConfig;
  orderId: string;
  amount: number;
  enabled: boolean;
  intervalMs?: number;
  onComplete?: (completedAt: string) => void;
  onStatusChange?: (status: TransactionStatus, completedAt?: string | null) => void;
};

type State = {
  status: TransactionStatus | "unknown";
  completedAt: string | null;
  lastCheckedAt: number | null;
  error: string | null;
  isPolling: boolean;
};

/**
 * Polls the Pakasir transaction detail endpoint until the transaction reaches a
 * terminal status (completed/cancelled/expired/failed) or polling is disabled.
 */
export function usePaymentPolling({
  config,
  orderId,
  amount,
  enabled,
  intervalMs = 3000,
  onComplete,
  onStatusChange,
}: Options) {
  const [state, setState] = useState<State>({
    status: "unknown",
    completedAt: null,
    lastCheckedAt: null,
    error: null,
    isPolling: false,
  });

  const onCompleteRef = useRef(onComplete);
  const onStatusChangeRef = useRef(onStatusChange);
  onCompleteRef.current = onComplete;
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, isPolling: false }));
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    setState((s) => ({ ...s, isPolling: true, error: null }));

    async function tick() {
      if (cancelled) return;
      try {
        const res = await getTransactionDetail({ config, orderId, amount });
        if (cancelled) return;
        const status = res.transaction.status;
        const completedAt = res.transaction.completed_at ?? null;

        setState((prev) => {
          if (prev.status !== status) {
            onStatusChangeRef.current?.(status, completedAt);
          }
          return {
            status,
            completedAt,
            lastCheckedAt: Date.now(),
            error: null,
            isPolling: status === "pending",
          };
        });

        if (status === "completed") {
          onCompleteRef.current?.(completedAt ?? new Date().toISOString());
          return;
        }

        if (status !== "pending") return;

        timer = setTimeout(tick, intervalMs);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Gagal cek status";
        setState((s) => ({ ...s, error: message, lastCheckedAt: Date.now() }));
        timer = setTimeout(tick, intervalMs);
      }
    }

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [config, orderId, amount, enabled, intervalMs]);

  return state;
}
