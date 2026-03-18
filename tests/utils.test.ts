import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("mergea clases sin romper utilidades duplicadas", () => {
    expect(cn("px-4", "px-6", "font-semibold")).toBe("px-6 font-semibold");
  });
});
