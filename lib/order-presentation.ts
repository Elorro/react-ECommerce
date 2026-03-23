export function formatOrderReference(orderId: string) {
  return `#${orderId.slice(-8).toUpperCase()}`;
}

export function humanizeOrderStatus(status: string) {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "PAID":
      return "Confirmado";
    case "PROCESSING":
      return "En preparación";
    case "FULFILLED":
      return "Entregado";
    case "CANCELED":
      return "Cancelado";
    default:
      return "Actualización reciente";
  }
}

export function humanizePaymentStatus(status: string) {
  switch (status) {
    case "UNPAID":
      return "Sin pago";
    case "REQUIRES_ACTION":
      return "Pendiente";
    case "PAID":
      return "Pago recibido";
    case "FAILED":
      return "Pago no completado";
    case "REFUNDED":
      return "Reembolsado";
    default:
      return "Pago en revisión";
  }
}

export function humanizeReturnStatus(status: string) {
  switch (status) {
    case "NONE":
      return "Sin devolución";
    case "REQUESTED":
      return "Solicitud registrada";
    case "RECEIVED":
      return "Producto recibido";
    case "REFUNDED":
      return "Devolución reembolsada";
    default:
      return "Actualización reciente";
  }
}
