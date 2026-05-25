import crypto from "node:crypto";

type DuitkuConfig = {
  merchantCode: string;
  apiKey: string;
  sandbox: boolean;
};

type CreateInvoiceInput = {
  config: DuitkuConfig;
  amount: number;
  orderId: string;
  productDetails: string;
  customerName: string;
  email: string;
  callbackUrl: string;
  returnUrl: string;
  expiryPeriod?: number;
};

function hmacSha256(value: string, key: string) {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function baseUrl(sandbox: boolean) {
  return sandbox ? "https://api-sandbox.duitku.com" : "https://api-prod.duitku.com";
}

export function verifyDuitkuCallback(input: { merchantCode: string; amount: string; merchantOrderId: string; signature: string; apiKey: string }) {
  const expected = hmacSha256(`${input.merchantCode}${input.amount}${input.merchantOrderId}`, input.apiKey);
  return expected === input.signature;
}

export async function createDuitkuInvoice(input: CreateInvoiceInput) {
  const timestamp = Date.now().toString();
  const signature = hmacSha256(`${input.config.merchantCode}${timestamp}`, input.config.apiKey);
  const res = await fetch(`${baseUrl(input.config.sandbox)}/api/merchant/createInvoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-duitku-timestamp": timestamp,
      "x-duitku-signature": signature,
      "x-duitku-merchantcode": input.config.merchantCode,
    },
    body: JSON.stringify({
      paymentAmount: input.amount,
      merchantOrderId: input.orderId,
      productDetails: input.productDetails,
      additionalParam: "",
      merchantUserInfo: input.email,
      paymentMethod: "",
      customerVaName: input.customerName.slice(0, 20) || "Customer",
      email: input.email,
      callbackUrl: input.callbackUrl,
      returnUrl: input.returnUrl,
      expiryPeriod: input.expiryPeriod ?? 60,
    }),
  });
  const raw = await res.text();
  const data = raw ? (() => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })() : null;
  if (!res.ok || data?.statusCode !== "00") {
    throw new Error(data?.statusMessage || data?.Message || data?.message || raw || `Duitku gagal (${res.status})`);
  }
  return data as { merchantCode: string; reference: string; paymentUrl: string; statusCode: string; statusMessage: string };
}
