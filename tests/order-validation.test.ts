import { describe, expect, it } from "vitest";
import { clientCheckoutSchema, orderCheckoutSchema } from "@/lib/validators/order";

describe("order validation", () => {
  it("sanitizes dangerous input on client fields", () => {
    const result = clientCheckoutSchema.parse({
      customerName: " <script>alert(1)</script> Ana Perez ",
      shippingAddress: " Calle 123 <img src=x onerror=alert(1)> Apt 4 ",
    });

    expect(result.customerName).toBe("Ana Perez");
    expect(result.shippingAddress).toBe("Calle 123  Apt 4");
  });

  it("rejects empty checkout items on the server payload", () => {
    const result = orderCheckoutSchema.safeParse({
      customerName: "Ana Perez",
      shippingAddress: "Calle 123",
      items: [],
    });

    expect(result.success).toBe(false);
  });
});
