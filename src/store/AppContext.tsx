import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { DashboardSummary } from "@/lib/api";
import type { AppConfig, StoredTransaction } from "@/lib/storage";
import { useAuth } from "./AuthContext";

const DEFAULT_CONFIG: AppConfig = {
  project: "",
  apiKey: "",
  sandbox: true,
  merchantName: "Merchant",
  merchantStatus: "draft",
  legalName: "",
  ktpNumber: "",
  withdrawBankCode: "",
  withdrawBankName: "",
  withdrawAccountNumber: "",
  withdrawAccountName: "",
  merchantNameValid: false,
  legalNameValid: false,
  ktpNumberValid: false,
  withdrawBankValid: false,
  withdrawAccountNumberValid: false,
  withdrawAccountNameValid: false,
  merchantNameNote: "",
  legalNameNote: "",
  ktpNumberNote: "",
  withdrawBankNote: "",
  withdrawAccountNumberNote: "",
  withdrawAccountNameNote: "",
  verificationNote: "",
  submittedAt: null,
  verifiedAt: null,
  ttsEnabled: true,
  ttsVoiceURI: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsVolume: 1,
};

const DEFAULT_DASHBOARD_SUMMARY: DashboardSummary = {
  totalIncome: 0,
  weekIncome: 0,
  todayIncome: 0,
  pendingAmount: 0,
  pendingCount: 0,
};

type AppContextValue = {
  config: AppConfig;
  saveConfig: (next: AppConfig) => Promise<void>;
  isConfigured: boolean;
  loading: boolean;
  transactions: StoredTransaction[];
  dashboardSummary: DashboardSummary;
  createTransaction: (input: { amount: number; description?: string }) => Promise<StoredTransaction>;
  refresh: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  setTransaction: (tx: StoredTransaction) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [transactions, setTransactions] = useState<StoredTransaction[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(DEFAULT_DASHBOARD_SUMMARY);
  const [loading, setLoading] = useState(false);

  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    const next = await api.getSettings();
    setConfig(next);
  }, [isAuthenticated]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    const res = await api.getDashboard();
    setTransactions(res.recentTransactions);
    setDashboardSummary(res.summary);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setConfig(DEFAULT_CONFIG);
      setTransactions([]);
      setDashboardSummary(DEFAULT_DASHBOARD_SUMMARY);
      return;
    }
    setLoading(true);
    Promise.all([refreshSettings(), refresh()]).finally(() => setLoading(false));
  }, [isAuthenticated, refreshSettings, refresh]);

  const saveConfig = useCallback(async (next: AppConfig) => {
    const saved = await api.saveSettings(next);
    setConfig(saved);
  }, []);

  const createTransaction = useCallback(async (input: { amount: number; description?: string }) => {
    const tx = await api.createTransaction(input);
    setTransactions((cur) => [tx, ...cur].slice(0, 20));
    await refresh();
    return tx;
  }, [refresh]);

  const setTransaction = useCallback((tx: StoredTransaction) => {
    setTransactions((cur) => {
      const idx = cur.findIndex((item) => item.orderId === tx.orderId);
      if (idx === -1) return [tx, ...cur].slice(0, 20);
      const next = [...cur];
      next[idx] = tx;
      return next;
    });
  }, []);

  const isConfigured = Boolean(config.project && config.apiKey);

  const value = useMemo<AppContextValue>(
    () => ({
      config,
      saveConfig,
      isConfigured,
      loading,
      transactions,
      dashboardSummary,
      createTransaction,
      refresh,
      refreshSettings,
      setTransaction,
    }),
    [
      config,
      saveConfig,
      isConfigured,
      loading,
      transactions,
      dashboardSummary,
      createTransaction,
      refresh,
      refreshSettings,
      setTransaction,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
