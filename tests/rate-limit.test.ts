import { describe, expect, it } from "vitest";
import { rateLimitByIp } from "@/lib/rate-limit";

function createRequest() {
  return new Request("http://localhost/api/orders", {
    headers: {
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

describe("rateLimitByIp", () => {
  it("blocks requests after the configured limit", () => {
    const request = createRequest();

    expect(rateLimitByIp(request, "test-scope", { limit: 2, windowMs: 60_000 }).success).toBe(
      true,
    );
    expect(rateLimitByIp(request, "test-scope", { limit: 2, windowMs: 60_000 }).success).toBe(
      true,
    );

    const blocked = rateLimitByIp(request, "test-scope", { limit: 2, windowMs: 60_000 });

    expect(blocked.success).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
