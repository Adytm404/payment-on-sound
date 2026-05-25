import { getApiBase, getToken, type Pagination, type Plan } from "./api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || `Request gagal (${res.status})`);
  return data as T;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "merchant";
  isActive: boolean;
  adminNote: string | null;
  planExpiresAt?: string | null;
  createdAt?: string;
  settings?: { merchantName: string; pakasirProject: string; sandbox?: boolean } | null;
  plan?: { name: string; slug: string } | null;
  _count?: { transactions: number };
};

export type AdminTransaction = {
  orderId: string;
  description?: string | null;
  amount: number;
  fee: number;
  totalPayment: number;
  status: string;
  createdAt: string;
  completedAt?: string | null;
  user: { id: string; name: string; email: string };
};

export type AdminPlanOrder = {
  orderId: string;
  provider: string;
  providerReference: string | null;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled" | string;
  paymentUrl: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  plan: { name: string; slug: string };
  promoCode: { code: string; name: string } | null;
};

export type AdminPlan = Plan & { _count?: { users: number } };
export type PlatformSettings = { duitkuMerchantCode: string; duitkuApiKey: string; duitkuSandbox: boolean };
export type PromoCode = {
  id: string;
  code: string;
  name: string;
  type: "free_trial" | "percentage_discount" | "fixed_discount";
  discountPercent: number | null;
  discountAmount: number | null;
  trialDays: number | null;
  maxRedemptions: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
};

export const adminApi = {
  dashboard() {
    return request<{
      summary: {
        users: number;
        proUsers: number;
        transactions: number;
        completed: number;
        pending: number;
        income: number;
        fees: number;
        todayIncome: number;
        planRevenue: number;
        pendingPlanOrders: number;
        failedPlanOrders: number;
        expiredPlanOrders: number;
      };
    }>("/admin/dashboard");
  },

  users(params: { page?: number; search?: string; role?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    return request<{ data: AdminUser[]; pagination: Pagination }>(`/admin/users?${qs}`);
  },

  user(userId: string) {
    return request<{
      user: AdminUser;
      summary: { income: number; completedCount: number; adminFee: number; pending: number; pendingCount: number };
      transactions: AdminTransaction[];
    }>(`/admin/users/${userId}`);
  },

  updateUserStatus(userId: string, input: { isActive: boolean; adminNote: string }) {
    return request<{ user: AdminUser }>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  transactions(params: { page?: number; search?: string; status?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    return request<{
      data: AdminPlanOrder[];
      pagination: Pagination;
      summary: { income: number; pending: number; failed: number; expired: number };
    }>(`/admin/transactions?${qs}`);
  },

  plans() {
    return request<{ plans: AdminPlan[] }>("/admin/plans");
  },

  savePlan(slug: string, input: Omit<AdminPlan, "id" | "slug" | "_count">) {
    return request<{ plan: AdminPlan }>(`/admin/plans/${slug}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  platformSettings() {
    return request<{ settings: PlatformSettings }>("/admin/platform-settings");
  },

  savePlatformSettings(input: PlatformSettings) {
    return request<{ settings: PlatformSettings }>("/admin/platform-settings", { method: "PUT", body: JSON.stringify(input) });
  },

  promos() {
    return request<{ promos: PromoCode[] }>("/admin/promos");
  },

  createPromo(input: Omit<PromoCode, "id" | "usedCount">) {
    return request<{ promo: PromoCode }>("/admin/promos", { method: "POST", body: JSON.stringify(input) });
  },

  savePromo(id: string, input: Omit<PromoCode, "id" | "usedCount">) {
    return request<{ promo: PromoCode }>(`/admin/promos/${id}`, { method: "PUT", body: JSON.stringify(input) });
  },

  planOrders() {
    return request<{ orders: any[] }>("/admin/plan-orders");
  },
};
