import { useEffect } from "react";
import { getApiBase, getToken } from "@/lib/api";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";

const TRANSACTION_EVENTS = [
  "transaction:created",
  "transaction:updated",
  "transactions:cleared",
] as const;

export function useRealtime() {
  const { isAuthenticated } = useAuth();
  const { refresh, refreshSettings } = useApp();

  useEffect(() => {
    const token = getToken();
    if (!isAuthenticated || !token) return;

    const source = new EventSource(
      `${getApiBase()}/realtime?token=${encodeURIComponent(token)}`,
    );

    const onTransaction = () => {
      window.dispatchEvent(new CustomEvent("pasound:transactions-changed"));
      refresh();
    };

    const onSettings = () => {
      refreshSettings();
    };

    TRANSACTION_EVENTS.forEach((event) => {
      source.addEventListener(event, onTransaction);
    });
    source.addEventListener("settings:updated", onSettings);

    return () => {
      TRANSACTION_EVENTS.forEach((event) => {
        source.removeEventListener(event, onTransaction);
      });
      source.removeEventListener("settings:updated", onSettings);
      source.close();
    };
  }, [isAuthenticated, refresh, refreshSettings]);
}
