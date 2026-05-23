import type { AppConfig, StoredTransaction } from "./storage";
import type { TransactionStatus } from "./pakasir";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "pasound:token";

export type User = { id: string; name: string; email: string };
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type TransactionSummary = {
  income: number;
  pending: number;
  completedCount: number;
  pendingCount: number;
};

export type DashboardSummary = {
  totalIncome: number;
  weekIncome: number;
  todayIncome: number;
  pendingAmount: number;
  pendingCount: number;
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
    project: settings.project ?? "",
    apiKey: settings.apiKey ?? "",
    sandbox: Boolean(settings.sandbox),
    ttsEnabled: Boolean(settings.ttsEnabled),
    ttsVoiceURI: settings.ttsVoiceURI ?? "",
    ttsRate: Number(settings.ttsRate ?? 1),
    ttsPitch: Number(settings.ttsPitch ?? 1),
    ttsVolume: Number(settings.ttsVolume ?? 1),
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

  async getSettings() {
    const res = await request<{ settings: any }>("/settings");
    return mapConfig(res.settings);
  },

  async saveSettings(config: AppConfig) {
    const res = await request<{ settings: any }>("/settings", {
      method: "PUT",
      body: JSON.stringify({
        merchantName: config.merchantName,
        project: config.project,
        apiKey: config.apiKey,
        sandbox: config.sandbox,
        ttsEnabled: config.ttsEnabled,
        ttsVoiceURI: config.ttsVoiceURI,
        ttsRate: config.ttsRate,
        ttsPitch: config.ttsPitch,
        ttsVolume: config.ttsVolume,
      }),
    });
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
};
