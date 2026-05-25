import "dotenv/config";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name, fallback = "") {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function sign(value, key) {
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

async function main() {
  const settings = await prisma.platformSettings.findFirst({ orderBy: { id: "asc" } });
  if (!settings?.duitkuMerchantCode || !settings.duitkuApiKey) {
    throw new Error("Duitku admin belum dikonfigurasi di /admin/settings");
  }

  const amount = Number(arg("amount", "10000"));
  const orderId = arg("order", `TEST${Date.now()}`);
  const email = arg("email", "test@example.com");
  const customerName = arg("name", "Pasound Test");
  const appUrl = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  const apiUrl = process.env.PUBLIC_API_BASE_URL ?? appUrl;
  const timestamp = Date.now().toString();
  const signature = sign(`${settings.duitkuMerchantCode}${timestamp}`, settings.duitkuApiKey);
  const baseUrl = settings.duitkuSandbox ? "https://api-sandbox.duitku.com" : "https://api-prod.duitku.com";
  const body = {
    paymentAmount: amount,
    merchantOrderId: orderId,
    productDetails: `Pasound Duitku Test ${amount}`,
    additionalParam: "",
    merchantUserInfo: email,
    paymentMethod: "",
    customerVaName: customerName.slice(0, 20),
    email,
    callbackUrl: `${apiUrl}/api/duitku/plan-callback`,
    returnUrl: `${appUrl}/pengaturan?upgrade=test`,
    expiryPeriod: 60,
  };

  console.log("Duitku POP test request");
  console.log({ endpoint: `${baseUrl}/api/merchant/createInvoice`, merchantCode: settings.duitkuMerchantCode, sandbox: settings.duitkuSandbox, orderId, amount, callbackUrl: body.callbackUrl, returnUrl: body.returnUrl });

  const res = await fetch(`${baseUrl}/api/merchant/createInvoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-duitku-timestamp": timestamp,
      "x-duitku-signature": signature,
      "x-duitku-merchantcode": settings.duitkuMerchantCode,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log("HTTP", res.status);
  console.log(text);
  if (!res.ok) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
