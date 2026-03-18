import { expect, test } from "@playwright/test";

const secret = process.env.E2E_TEST_SECRET || "local-e2e-secret";
const baseUrl = "http://127.0.0.1:3100";

async function authenticate(
  page: import("@playwright/test").Page,
  input: { email: string; role: "CUSTOMER" | "OPERATIONS" | "ADMIN" },
) {
  await page.context().clearCookies();

  const response = await page.request.post("/api/test/session", {
    headers: {
      "x-e2e-secret": secret,
      "Content-Type": "application/json",
    },
    data: input,
  });

  expect(response.ok()).toBeTruthy();

  const session = (await response.json()) as {
    sessionToken: string;
    expires: string;
  };

  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: session.sessionToken,
      url: baseUrl,
      expires: Math.floor(new Date(session.expires).getTime() / 1000),
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

test("operations user can access orders but not catalog admin", async ({ page }) => {
  await authenticate(page, {
    email: "ops@example.com",
    role: "OPERATIONS",
  });

  await page.goto("/admin/orders");
  await expect(page.getByText("Operación de órdenes")).toBeVisible();

  await page.goto("/admin/products");
  await page.waitForURL("**/account");
  await expect(page.getByText("Mi cuenta")).toBeVisible();
});
