import type { AppConfig, StoredTransaction } from "./storage";
import type { TransactionStatus } from "./pakasir";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "pasound:token";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "merchant";
  isActive: boolean;
  emailVerified: boolean;
  adminNote: string;
};
export type Plan = {
  id: string;
  name: string;
  slug: "free" | "pro" | string;
  description: string;
  price: number;
  billingPeriodDays: number | null;
  monthlyTransactionLimit: number | null;
  maxTransactionAmount: number | null;
  reportRetentionDays: number | null;
  canUseRealtime: boolean;
  canExportReports: boolean;
  canUseTts: boolean;
  canUsePublicPaymentPage: boolean;
  canSeeAdminFee: boolean;
  isActive: boolean;
  sortOrder: number;
};
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type TransactionSummary = {
  income: number;
  pending: number;
  adminFee: number;
  completedCount: number;
  pendingCount: number;
};

export type DashboardSummary = {
  totalIncome: number;
  weekIncome: number;
  todayIncome: number;
  pendingAmount: number;
  pendingCount: number;
  availableBalance: number;
  planName: string;
  planSlug: string;
  monthlyTransactionLimit: number | null;
  monthlyTransactionUsed: number;
};

export type WithdrawalStatus = "pending" | "approved" | "processing" | "paid" | "rejected" | "cancelled";
export type Withdrawal = {
  requestId: string;
  amount: number;
  status: WithdrawalStatus;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  userNote: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  processedAt: string | null;
  paidAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type WithdrawalSummary = {
  availableBalance: number;
  settledIncome: number;
  pendingSettlement: number;
  nextSettlementAt: string | null;
  completedIncome: number;
  reservedWithdrawal: number;
  paidWithdrawal: number;
  minimumWithdrawal: number;
  hasActiveRequest: boolean;
  merchantStatus: string;
  bank: { code: string; name: string; accountNumber: string; accountName: string };
  activeRequest?: Withdrawal | null;
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getApiBase() {
  return API_BASE;
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: { auth?: boolean } = {},
): Promise<T> {
  const token = getToken();
  const useAuth = options.auth !== false;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(useAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.message || `Request gagal (${res.status})`);
  }
  return data as T;
}

function mapTx(tx: any): StoredTransaction {
  return {
    orderId: tx.orderId,
    description: tx.description ?? undefined,
    amount: tx.amount,
    fee: tx.fee,
    totalPayment: tx.totalPayment,
    paymentNumber: tx.paymentNumber,
    paymentMethod: tx.paymentMethod,
    status: tx.status as TransactionStatus,
    createdAt: tx.createdAt,
    expiredAt: tx.expiredAt,
    completedAt: tx.completedAt,
  };
}

export type PublicTransaction = StoredTransaction & {
  merchantName: string;
};

function mapPublicTx(tx: any): PublicTransaction {
  return {
    ...mapTx(tx),
    merchantName: tx.merchantName ?? "Merchant",
  };
}

function mapConfig(settings: any): AppConfig {
  return {
    merchantName: settings.merchantName ?? "Merchant",
    merchantStatus: settings.merchantStatus ?? "draft",
    legalName: settings.legalName ?? "",
    ktpNumber: settings.ktpNumber ?? "",
    withdrawBankCode: settings.withdrawBankCode ?? "",
    withdrawBankName: settings.withdrawBankName ?? "",
    withdrawAccountNumber: settings.withdrawAccountNumber ?? "",
    withdrawAccountName: settings.withdrawAccountName ?? "",
    merchantNameValid: Boolean(settings.merchantNameValid),
    legalNameValid: Boolean(settings.legalNameValid),
    ktpNumberValid: Boolean(settings.ktpNumberValid),
    withdrawBankValid: Boolean(settings.withdrawBankValid),
    withdrawAccountNumberValid: Boolean(settings.withdrawAccountNumberValid),
    withdrawAccountNameValid: Boolean(settings.withdrawAccountNameValid),
    merchantNameNote: settings.merchantNameNote ?? "",
    legalNameNote: settings.legalNameNote ?? "",
    ktpNumberNote: settings.ktpNumberNote ?? "",
    withdrawBankNote: settings.withdrawBankNote ?? "",
    withdrawAccountNumberNote: settings.withdrawAccountNumberNote ?? "",
    withdrawAccountNameNote: settings.withdrawAccountNameNote ?? "",
    verificationNote: settings.verificationNote ?? "",
    submittedAt: settings.submittedAt ?? null,
    verifiedAt: settings.verifiedAt ?? null,
    project: settings.project ?? "",
    apiKey: settings.apiKey ?? "",
    sandbox: Boolean(settings.sandbox),
    ttsEnabled: Boolean(settings.ttsEnabled),
    ttsVoiceURI: settings.ttsVoiceURI ?? "",
    ttsRate: Number(settings.ttsRate ?? 1),
    ttsPitch: Number(settings.ttsPitch ?? 1),
    ttsVolume: Number(settings.ttsVolume ?? 1),
    quickAmounts: Array.isArray(settings.quickAmounts) ? settings.quickAmounts.map(Number).filter((n: number) => Number.isFinite(n)) : [],
  };
}

export const api = {
  async register(input: { name: string; email: string; password: string }) {
    const res = await request<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setToken(res.token);
    return res;
  },

  async login(input: { email: string; password: string }) {
    const res = await request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setToken(res.token);
    return res;
  },

  me() {
    return request<{ user: User }>("/auth/me");
  },

  async forgotPassword(email: string) {
    const res = await request<{ ok: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }, { auth: false });
    return res;
  },

  async resetPassword(token: string, password: string) {
    const res = await request<{ ok: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }, { auth: false });
    return res;
  },

  async verifyEmail(token: string) {
    const res = await request<{ ok: boolean; message: string }>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
      {},
      { auth: false },
    );
    return res;
  },

  async resendVerification() {
    const res = await request<{ ok: boolean }>("/auth/resend-verification", {
      method: "POST",
    });
    return res;
  },

  async getSettings() {
    const res = await request<{ settings: any }>("/settings");
    return mapConfig(res.settings);
  },

  async saveSettings(config: AppConfig) {
    const res = await request<{ settings: any }>("/settings", {
      method: "PUT",
      body: JSON.stringify({
        merchantName: config.merchantName,
        legalName: config.legalName,
        ktpNumber: config.ktpNumber,
        withdrawBankCode: config.withdrawBankCode,
        withdrawAccountNumber: config.withdrawAccountNumber,
        withdrawAccountName: config.withdrawAccountName,
        ttsEnabled: config.ttsEnabled,
        ttsVoiceURI: config.ttsVoiceURI,
        ttsRate: config.ttsRate,
        ttsPitch: config.ttsPitch,
        ttsVolume: config.ttsVolume,
        quickAmounts: config.quickAmounts,
      }),
    });
    return mapConfig(res.settings);
  },

  async submitMerchantVerification() {
    const res = await request<{ settings: any }>("/settings/submit-verification", { method: "POST" });
    return mapConfig(res.settings);
  },

  async listTransactions(params: {
    page?: number;
    limit?: number;
    period?: string;
    status?: string;
    search?: string;
  } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    const res = await request<{
      data: any[];
      pagination: Pagination;
      summary: TransactionSummary;
    }>(`/transactions?${qs}`);
    return { ...res, data: res.data.map(mapTx) };
  },

  getWithdrawalSummary() {
    return request<{ summary: WithdrawalSummary }>("/withdrawals/summary");
  },

  listWithdrawals() {
    return request<{ data: Withdrawal[] }>("/withdrawals");
  },

  createWithdrawal(input: { amount: number; userNote?: string }) {
    return request<{ withdrawal: Withdrawal }>("/withdrawals", { method: "POST", body: JSON.stringify(input) });
  },

  cancelWithdrawal(requestId: string) {
    return request<{ withdrawal: Withdrawal }>(`/withdrawals/${requestId}/cancel`, { method: "POST" });
  },

  async getDashboard() {
    const res = await request<{
      summary: DashboardSummary;
      recentTransactions: any[];
    }>("/dashboard");
    return {
      summary: res.summary,
      recentTransactions: res.recentTransactions.map(mapTx),
    };
  },

  async createTransaction(input: { amount: number; description?: string }) {
    const res = await request<{ transaction: any }>("/transactions", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return mapTx(res.transaction);
  },

  async getTransaction(orderId: string) {
    const res = await request<{ transaction: any }>(`/transactions/${orderId}`);
    return mapTx(res.transaction);
  },

  async getPublicTransaction(orderId: string) {
    const res = await request<{ transaction: any }>(
      `/public/transactions/${orderId}`,
      {},
      { auth: false },
    );
    return mapPublicTx(res.transaction);
  },

  async checkPublicTransaction(orderId: string) {
    const res = await request<{ transaction: any }>(
      `/public/transactions/${orderId}/check`,
      { method: "POST" },
      { auth: false },
    );
    return mapPublicTx(res.transaction);
  },

  async checkTransaction(orderId: string) {
    const res = await request<{ transaction: any }>(`/transactions/${orderId}/check`, {
      method: "POST",
    });
    return mapTx(res.transaction);
  },

  async cancelTransaction(orderId: string) {
    const res = await request<{ transaction: any }>(`/transactions/${orderId}/cancel`, {
      method: "POST",
    });
    return mapTx(res.transaction);
  },

  simulatePayment(orderId: string) {
    return request<{ ok: boolean }>(`/transactions/${orderId}/simulate`, {
      method: "POST",
    });
  },

  clearTransactions() {
    return request<{ ok: boolean }>("/transactions", { method: "DELETE" });
  },

  listPlans() {
    return request<{ plans: Plan[] }>("/plans");
  },

  currentPlan() {
    return request<{ plan: Plan | null; planExpiresAt: string | null }>("/plans/current");
  },

  choosePlan(slug: string) {
    return request<{ plan: Plan }>("/plans/current", {
      method: "PUT",
      body: JSON.stringify({ slug }),
    });
  },

  previewUpgrade(promoCode: string) {
    return request<{ plan: Plan; promo: any | null; amount: number; discountAmount: number; finalAmount: number }>("/plans/preview-upgrade", {
      method: "POST",
      body: JSON.stringify({ promoCode }),
    });
  },

  upgradePlan(promoCode: string) {
    return request<{ order: any; paymentUrl: string | null; activated: boolean }>("/plans/upgrade", {
      method: "POST",
      body: JSON.stringify({ promoCode }),
    });
  },

  pushPublicKey() {
    return request<{ publicKey: string; enabled: boolean }>("/push/public-key", {}, { auth: false });
  },

  pushSubscribe(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    return request<{ ok: true }>("/push/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
    });
  },

  pushUnsubscribe(endpoint: string) {
    return request<{ ok: true }>("/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint }),
    });
  },
};
