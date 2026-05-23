const BASE_URL = "https://app.pakasir.com";

export type PakasirConfig = {
  project: string;
  apiKey: string;
};

export type CreateQrisResponse = {
  payment: {
    project: string;
    order_id: string;
    amount: number;
    fee: number;
    total_payment: number;
    payment_method: string;
    payment_number: string;
    expired_at: string;
  };
};

export type DetailResponse = {
  transaction: {
    amount: number;
    order_id: string;
    project: string;
    status: "pending" | "completed" | "cancelled" | "expired" | "failed";
    payment_method: string;
    completed_at: string | null;
  };
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : `Pakasir request gagal (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function createQris(params: {
  config: PakasirConfig;
  orderId: string;
  amount: number;
}) {
  return request<CreateQrisResponse>(`${BASE_URL}/api/transactioncreate/qris`, {
    method: "POST",
    body: JSON.stringify({
      project: params.config.project,
      order_id: params.orderId,
      amount: params.amount,
      api_key: params.config.apiKey,
    }),
  });
}

export function transactionDetail(params: {
  config: PakasirConfig;
  orderId: string;
  amount: number;
}) {
  const qs = new URLSearchParams({
    project: params.config.project,
    amount: String(params.amount),
    order_id: params.orderId,
    api_key: params.config.apiKey,
  });
  return request<DetailResponse>(`${BASE_URL}/api/transactiondetail?${qs}`);
}

export function cancelTransaction(params: {
  config: PakasirConfig;
  orderId: string;
  amount: number;
}) {
  return request<unknown>(`${BASE_URL}/api/transactioncancel`, {
    method: "POST",
    body: JSON.stringify({
      project: params.config.project,
      order_id: params.orderId,
      amount: params.amount,
      api_key: params.config.apiKey,
    }),
  });
}

export function simulatePayment(params: {
  config: PakasirConfig;
  orderId: string;
  amount: number;
}) {
  return request<unknown>(`${BASE_URL}/api/paymentsimulation`, {
    method: "POST",
    body: JSON.stringify({
      project: params.config.project,
      order_id: params.orderId,
      amount: params.amount,
      api_key: params.config.apiKey,
    }),
  });
}
