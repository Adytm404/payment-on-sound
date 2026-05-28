import { useEffect, useRef } from "react";
import { getApiBase, getToken } from "@/lib/api";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";

const TRANSACTION_EVENTS = [
  "transaction:created",
  "transaction:updated",
  "transactions:cleared",
  "withdrawal:created",
  "withdrawal:updated",
] as const;

const SSE_RETRY_DELAY = 3000;
const POLL_INTERVAL = 15000;

export function useRealtime() {
  const { isAuthenticated } = useAuth();
  const { refresh, refreshSettings } = useApp();
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!isAuthenticated || !token) return;

    let disposed = false;
    const sseToken = token;

    function cleanupSource() {
      if (sourceRef.current) {
        sourceRef.current.close();
        sourceRef.current = null;
      }
    }

    function stopPolling() {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        window.dispatchEvent(new CustomEvent("pasound:transactions-changed"));
        window.dispatchEvent(new CustomEvent("pasound:withdrawals-changed"));
        refresh();
      }, POLL_INTERVAL);
    }

    function connect() {
      if (disposed) return;
      cleanupSource();

      const source = new EventSource(
        `${getApiBase()}/realtime?token=${encodeURIComponent(sseToken)}`,
      );
      sourceRef.current = source;

      const onTransaction = () => {
        window.dispatchEvent(new CustomEvent("pasound:transactions-changed"));
        window.dispatchEvent(new CustomEvent("pasound:withdrawals-changed"));
        refresh();
      };

      const onSettings = () => {
        refreshSettings();
      };

      source.onopen = () => {
        stopPolling();
      };

      TRANSACTION_EVENTS.forEach((event) => {
        source.addEventListener(event, onTransaction);
      });
      source.addEventListener("settings:updated", onSettings);

      source.onerror = () => {
        source.close();
        TRANSACTION_EVENTS.forEach((event) => {
          source.removeEventListener(event, onTransaction);
        });
        source.removeEventListener("settings:updated", onSettings);

        if (!disposed) {
          startPolling();
          retryRef.current = setTimeout(connect, SSE_RETRY_DELAY);
        }
      };
    }

    connect();

    return () => {
      disposed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      stopPolling();
      cleanupSource();
    };
  }, [isAuthenticated, refresh, refreshSettings]);
}
