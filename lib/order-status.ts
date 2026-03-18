export type OrderStatusValue = "PENDING" | "PAID" | "PROCESSING" | "FULFILLED" | "CANCELED";
export type PaymentStatusValue = "UNPAID" | "REQUIRES_ACTION" | "PAID" | "FAILED" | "REFUNDED";

export function getAllowedOrderStatusTransitions(input: {
  status: OrderStatusValue;
  paymentStatus: PaymentStatusValue;
}): OrderStatusValue[] {
  if (input.status === "CANCELED" || input.status === "FULFILLED") {
    return [input.status];
  }

  if (input.status === "PROCESSING") {
    return ["PROCESSING", "FULFILLED", "CANCELED"];
  }

  if (input.status === "PAID") {
    return ["PAID", "PROCESSING", "FULFILLED", "CANCELED"];
  }

  if (input.paymentStatus === "PAID") {
    return ["PENDING", "PAID", "PROCESSING", "CANCELED"];
  }

  return ["PENDING", "CANCELED"];
}

export function canTransitionOrderStatus(input: {
  currentStatus: OrderStatusValue;
  paymentStatus: PaymentStatusValue;
  nextStatus: OrderStatusValue;
}) {
  return getAllowedOrderStatusTransitions({
    status: input.currentStatus,
    paymentStatus: input.paymentStatus,
  }).includes(input.nextStatus);
}
