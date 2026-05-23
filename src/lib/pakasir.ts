/**
 * Pakasir API client.
 * Docs: https://pakasir.com/p/docs
 *
 * NOTE on CORS: Pakasir's `app.pakasir.com` endpoints do not enable CORS for
 * browser origins, so we route every request through a same-origin path
 * (`/pakasir/*`) that is rewritten to `https://app.pakasir.com/*` by:
 *   - Vite dev/preview proxy (see `vite.config.ts`)
 *   - Your production reverse proxy (Vercel rewrites, Cloudflare Worker, Nginx)
 *
 * If you need to bypass the proxy (e.g. SSR or server-side calls), set
 * `VITE_PAKASIR_BASE_URL` to `https://app.pakasir.com` at build time.
 */

const BASE_URL =
  (import.meta.env.VITE_PAKASIR_BASE_URL as string | undefined) ?? "/pakasir";

/** Absolute Pakasir origin, used for hosted pay-page redirects. */
const PUBLIC_URL = "https://app.pakasir.com";

export type PakasirConfig = {
  project: string;
  apiKey: string;
  sandbox: boolean;
};

export type CreateTransactionParams = {
  config: PakasirConfig;
  orderId: string;
  amount: number;
};

export type CreateTransactionResponse = {
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

export type TransactionStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "expired"
  | "failed";

export type TransactionDetailResponse = {
  transaction: {
    amount: number;
    order_id: string;
    project: string;
    status: TransactionStatus;
    payment_method: string;
    completed_at: string | null;
  };
};

async function request<T>(
  url: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : (rest.body as BodyInit),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : null) ?? `Request gagal (${res.status})`;
    throw new PakasirError(message, res.status, data);
  }

  return data as T;
}

export class PakasirError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: unknown,
  ) {
    super(message);
    this.name = "PakasirError";
  }
}

export async function createQrisTransaction({
  config,
  orderId,
  amount,
}: CreateTransactionParams): Promise<CreateTransactionResponse> {
  return request<CreateTransactionResponse>(
    `${BASE_URL}/api/transactioncreate/qris`,
    {
      method: "POST",
      json: {
        project: config.project,
        order_id: orderId,
        amount,
        api_key: config.apiKey,
      },
    },
  );
}

export async function getTransactionDetail({
  config,
  orderId,
  amount,
}: CreateTransactionParams): Promise<TransactionDetailResponse> {
  const params = new URLSearchParams({
    project: config.project,
    amount: String(amount),
    order_id: orderId,
    api_key: config.apiKey,
  });
  return request<TransactionDetailResponse>(
    `${BASE_URL}/api/transactiondetail?${params.toString()}`,
    { method: "GET" },
  );
}

export async function cancelTransaction({
  config,
  orderId,
  amount,
}: CreateTransactionParams): Promise<void> {
  await request<unknown>(`${BASE_URL}/api/transactioncancel`, {
    method: "POST",
    json: {
      project: config.project,
      order_id: orderId,
      amount,
      api_key: config.apiKey,
    },
  });
}

export async function simulatePayment({
  config,
  orderId,
  amount,
}: CreateTransactionParams): Promise<void> {
  await request<unknown>(`${BASE_URL}/api/paymentsimulation`, {
    method: "POST",
    json: {
      project: config.project,
      order_id: orderId,
      amount,
      api_key: config.apiKey,
    },
  });
}

export function buildPayUrl({
  config,
  orderId,
  amount,
  qrisOnly = true,
  redirect,
}: CreateTransactionParams & { qrisOnly?: boolean; redirect?: string }) {
  const params = new URLSearchParams({ order_id: orderId });
  if (qrisOnly) params.set("qris_only", "1");
  if (redirect) params.set("redirect", redirect);
  return `${PUBLIC_URL}/pay/${config.project}/${amount}?${params.toString()}`;
}
