const PENDING_PAYMENT_WINDOW_MS = 30 * 60 * 1000;

export function getPendingPaymentExpiryDate(from = new Date()) {
  return new Date(from.getTime() + PENDING_PAYMENT_WINDOW_MS);
}

export function shouldExpirePendingOrder(params: {
  paymentStatus: "UNPAID" | "REQUIRES_ACTION" | "PAID" | "FAILED" | "REFUNDED";
  paymentExpiresAt: Date | null;
  now?: Date;
}) {
  if (params.paymentStatus !== "REQUIRES_ACTION") {
    return false;
  }

  if (!params.paymentExpiresAt) {
    return false;
  }

  const now = params.now ?? new Date();
  return params.paymentExpiresAt.getTime() <= now.getTime();
}
