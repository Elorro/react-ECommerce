export type OrderStatusValue = "PENDING" | "PAID" | "FULFILLED" | "CANCELED";
export type PaymentStatusValue = "UNPAID" | "REQUIRES_ACTION" | "PAID" | "FAILED";

export function getAllowedOrderStatusTransitions(input: {
  status: OrderStatusValue;
  paymentStatus: PaymentStatusValue;
}): OrderStatusValue[] {
  if (input.status === "CANCELED" || input.status === "FULFILLED") {
    return [input.status];
  }

  if (input.status === "PAID") {
    return ["PAID", "FULFILLED", "CANCELED"];
  }

  if (input.paymentStatus === "PAID") {
    return ["PENDING", "PAID", "CANCELED"];
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
