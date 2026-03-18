import { describe, expect, it } from "vitest";
import { createCategorySchema } from "@/lib/validators/admin";

describe("category validation", () => {
  it("sanitizes category payloads", () => {
    const payload = createCategorySchema.parse({
      name: "  Jackets <script>alert(1)</script> ",
      slug: " jackets ",
      imageUrl: "https://i.ibb.co/example/jackets.png",
    });

    expect(payload.name).toBe("Jackets");
    expect(payload.slug).toBe("jackets");
  });
});
