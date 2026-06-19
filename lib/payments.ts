import type { Payment, PaymentMethod } from "./types";

// Returns the most recent payment from a list (or null)
export function latestPayment(payments?: Payment[] | null): Payment | null {
  if (!payments || payments.length === 0) return null;
  return [...payments].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
}

// True if the appointment is fully paid
export function isPaid(payments?: Payment[] | null): boolean {
  return latestPayment(payments)?.status === "paid";
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  mtn_momo: "MTN MoMo",
  airtel_money: "Airtel Money",
};
