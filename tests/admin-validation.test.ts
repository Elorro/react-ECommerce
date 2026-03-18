import { describe, expect, it } from "vitest";
import {
  bulkOrderStatusSchema,
  bulkProductActionSchema,
  createProductSchema,
} from "@/lib/validators/admin";

describe("admin product validation", () => {
  it("sanitizes and validates admin product creation payloads", () => {
    const payload = createProductSchema.parse({
      name: "  New Jacket  ",
      slug: " new-jacket ",
      description: " <b>Strong</b> cotton jacket for winter use. ",
      imageUrl: "https://i.ibb.co/example/product.png",
      price: 120,
      stock: 7,
      featured: true,
      status: "ACTIVE",
      categoryId: "cat_1",
    });

    expect(payload.name).toBe("New Jacket");
    expect(payload.description).toBe("Strong cotton jacket for winter use.");
  });

  it("validates bulk product actions", () => {
    const payload = bulkProductActionSchema.parse({
      ids: ["prod_1", "prod_2"],
      action: "ARCHIVE",
    });

    expect(payload.ids).toHaveLength(2);
    expect(payload.action).toBe("ARCHIVE");
  });

  it("validates bulk order actions", () => {
    const payload = bulkOrderStatusSchema.parse({
      ids: ["ord_1", "ord_2"],
      status: "FULFILLED",
    });

    expect(payload.ids).toHaveLength(2);
    expect(payload.status).toBe("FULFILLED");
  });
});
