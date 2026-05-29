import type { TransactionStatus } from "./pakasir";

export type StoredTransaction = {
  orderId: string;
  description?: string;
  amount: number;
  fee: number;
  totalPayment: number;
  paymentNumber: string;
  paymentMethod: string;
  status: TransactionStatus;
  createdAt: string;
  expiredAt: string;
  completedAt?: string | null;
};

export type AppConfig = {
  project: string;
  apiKey: string;
  sandbox: boolean;
  merchantName: string;
  merchantStatus: "draft" | "pending_review" | "needs_revision" | "verified" | "rejected";
  legalName: string;
  ktpNumber: string;
  withdrawBankCode: string;
  withdrawBankName: string;
  withdrawAccountNumber: string;
  withdrawAccountName: string;
  merchantNameValid: boolean;
  legalNameValid: boolean;
  ktpNumberValid: boolean;
  withdrawBankValid: boolean;
  withdrawAccountNumberValid: boolean;
  withdrawAccountNameValid: boolean;
  merchantNameNote: string;
  legalNameNote: string;
  ktpNumberNote: string;
  withdrawBankNote: string;
  withdrawAccountNumberNote: string;
  withdrawAccountNameNote: string;
  verificationNote: string;
  submittedAt?: string | null;
  verifiedAt?: string | null;
  ttsEnabled: boolean;
  ttsVoiceURI: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  quickAmounts: number[];
};

const KEYS = {
  transactions: "pos:transactions",
  config: "pos:config",
} as const;

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
  quickAmounts: [],
};

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  // Transactions
  listTransactions(): StoredTransaction[] {
    if (typeof localStorage === "undefined") return [];
    return safeParse<StoredTransaction[]>(
      localStorage.getItem(KEYS.transactions),
      [],
    );
  },

  getTransaction(orderId: string): StoredTransaction | undefined {
    return storage.listTransactions().find((t) => t.orderId === orderId);
  },

  upsertTransaction(tx: StoredTransaction) {
    const all = storage.listTransactions();
    const idx = all.findIndex((t) => t.orderId === tx.orderId);
    if (idx === -1) all.unshift(tx);
    else all[idx] = { ...all[idx], ...tx };
    localStorage.setItem(KEYS.transactions, JSON.stringify(all));
  },

  updateTransaction(
    orderId: string,
    patch: Partial<StoredTransaction>,
  ): StoredTransaction | undefined {
    const all = storage.listTransactions();
    const idx = all.findIndex((t) => t.orderId === orderId);
    if (idx === -1) return undefined;
    all[idx] = { ...all[idx], ...patch };
    localStorage.setItem(KEYS.transactions, JSON.stringify(all));
    return all[idx];
  },

  removeTransaction(orderId: string) {
    const all = storage.listTransactions().filter((t) => t.orderId !== orderId);
    localStorage.setItem(KEYS.transactions, JSON.stringify(all));
  },

  clearTransactions() {
    localStorage.removeItem(KEYS.transactions);
  },

  // Config
  getConfig(): AppConfig {
    if (typeof localStorage === "undefined") return DEFAULT_CONFIG;
    return {
      ...DEFAULT_CONFIG,
      ...safeParse<Partial<AppConfig>>(localStorage.getItem(KEYS.config), {}),
    };
  },

  saveConfig(config: AppConfig) {
    localStorage.setItem(KEYS.config, JSON.stringify(config));
  },

  clearAll() {
    localStorage.removeItem(KEYS.transactions);
    localStorage.removeItem(KEYS.config);
  },
};
