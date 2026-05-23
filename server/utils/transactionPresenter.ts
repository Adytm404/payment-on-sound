import { toJson } from "./json";

type TransactionLike = {
  orderId: string;
  description: string | null;
  amount: number;
  fee: number;
  totalPayment: number;
  paymentNumber: string;
  paymentMethod: string;
  status: string;
  createdAt: Date;
  expiredAt: Date;
  completedAt: Date | null;
  user?: {
    settings?: {
      merchantName: string;
    } | null;
  };
};

export function publicTransaction(tx: TransactionLike) {
  return toJson({
    orderId: tx.orderId,
    description: tx.description,
    amount: tx.amount,
    fee: tx.fee,
    totalPayment: tx.totalPayment,
    paymentNumber: tx.paymentNumber,
    paymentMethod: tx.paymentMethod,
    status: tx.status,
    createdAt: tx.createdAt,
    expiredAt: tx.expiredAt,
    completedAt: tx.completedAt,
    merchantName: tx.user?.settings?.merchantName ?? "Merchant",
  });
}
