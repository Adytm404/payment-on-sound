import { getApiBase, getToken, type Pagination, type Plan, type Withdrawal, type WithdrawalSummary } from "./api";

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

export type AdminWithdrawal = Withdrawal & {
  user: {
    id: string;
    name: string;
    email: string;
    settings?: { merchantName: string } | null;
  };
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

export type AdminMerchant = {
  userId: string;
  merchantName: string;
  merchantStatus: "draft" | "pending_review" | "needs_revision" | "verified" | "rejected";
  legalName: string | null;
  ktpNumber: string | null;
  withdrawBankCode: string | null;
  withdrawBankName: string | null;
  withdrawAccountNumber: string | null;
  withdrawAccountName: string | null;
  merchantNameValid: boolean;
  legalNameValid: boolean;
  ktpNumberValid: boolean;
  withdrawBankValid: boolean;
  withdrawAccountNumberValid: boolean;
  withdrawAccountNameValid: boolean;
  merchantNameNote: string | null;
  legalNameNote: string | null;
  ktpNumberNote: string | null;
  withdrawBankNote: string | null;
  withdrawAccountNumberNote: string | null;
  withdrawAccountNameNote: string | null;
  verificationNote: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  pakasirProject: string;
  pakasirApiKey: string;
  sandbox: boolean;
  user: { id: string; name: string; email: string; isActive: boolean };
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
        pendingWithdrawals: number;
        processingWithdrawals: number;
        paidWithdrawals: number;
        pendingVerifications: number;
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

  withdrawals(params: { page?: number; search?: string; status?: string } = {}) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    return request<{
      data: AdminWithdrawal[];
      pagination: Pagination;
      summary: { pending: number; processing: number; paid: number };
    }>(`/admin/withdrawals?${qs}`);
  },

  withdrawal(requestId: string) {
    return request<{ withdrawal: AdminWithdrawal; balance: WithdrawalSummary }>(`/admin/withdrawals/${requestId}`);
  },

  updateWithdrawal(requestId: string, action: "approve" | "processing" | "paid" | "reject" | "cancel", adminNote = "") {
    return request<{ withdrawal: AdminWithdrawal }>(`/admin/withdrawals/${requestId}/${action}`, {
      method: "POST",
      body: JSON.stringify({ adminNote }),
    });
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

  merchants(status = "all") {
    return request<{ data: AdminMerchant[] }>(`/admin/merchants?status=${encodeURIComponent(status)}`);
  },

  merchant(userId: string) {
    return request<{ merchant: AdminMerchant }>(`/admin/merchants/${userId}`);
  },

  saveMerchantReview(userId: string, input: any) {
    return request<{ merchant: AdminMerchant }>(`/admin/merchants/${userId}/review`, { method: "PUT", body: JSON.stringify(input) });
  },

  approveMerchant(userId: string) {
    return request<{ merchant: AdminMerchant }>(`/admin/merchants/${userId}/approve`, { method: "POST" });
  },

  requestMerchantRevision(userId: string, verificationNote: string) {
    return request<{ merchant: AdminMerchant }>(`/admin/merchants/${userId}/request-revision`, { method: "POST", body: JSON.stringify({ verificationNote }) });
  },

  rejectMerchant(userId: string, verificationNote: string) {
    return request<{ merchant: AdminMerchant }>(`/admin/merchants/${userId}/reject`, { method: "POST", body: JSON.stringify({ verificationNote }) });
  },
};
