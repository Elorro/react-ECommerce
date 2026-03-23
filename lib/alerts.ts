type AlertPayload = {
  level: "ERROR" | "WARN";
  message: string;
  timestamp: string;
  environment?: string;
  requestId?: string;
  route?: string;
  orderId?: string;
  eventType?: string;
  error?: string;
};

function getAlertEndpoint() {
  return process.env.ALERT_WEBHOOK_URL || "";
}

export function alertsAreConfigured() {
  return Boolean(getAlertEndpoint());
}

export function dispatchAlert(payload: AlertPayload) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const endpoint = getAlertEndpoint();

  if (!endpoint) {
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (process.env.ALERT_WEBHOOK_BEARER_TOKEN) {
    headers.authorization = `Bearer ${process.env.ALERT_WEBHOOK_BEARER_TOKEN}`;
  }

  void fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      service: "atelier-commerce",
      ...payload,
    }),
  }).catch(() => {
    // Alerts must never break request handling.
  });
}
