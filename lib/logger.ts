type LogLevel = "INFO" | "WARN" | "ERROR";

type LogContext = Record<string, unknown>;

export function getRequestId(request: Request) {
  return request.headers.get("x-request-id") || crypto.randomUUID();
}

export function logEvent(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  const serialized = JSON.stringify(payload);

  if (level === "ERROR") {
    console.error(serialized);
    return;
  }

  if (level === "WARN") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export function logApiError(message: string, error: unknown, context: LogContext = {}) {
  logEvent("ERROR", message, {
    ...context,
    error: error instanceof Error ? error.message : "unknown",
  });
}

export function withRequestIdHeaders(init: ResponseInit | undefined, requestId: string): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", requestId);

  return {
    ...init,
    headers,
  };
}
