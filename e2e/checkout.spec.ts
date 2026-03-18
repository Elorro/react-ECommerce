import { expect, test } from "@playwright/test";

const secret = process.env.E2E_TEST_SECRET || "local-e2e-secret";
const baseUrl = "http://127.0.0.1:3100";

async function authenticate(
  page: import("@playwright/test").Page,
  input: {
    email: string;
    role: "CUSTOMER" | "OPERATIONS" | "ADMIN";
  },
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

async function seedAuthenticatedCartByEmail(
  page: import("@playwright/test").Page,
  email: string,
  items: Array<{ slug: string; quantity: number }>,
) {
  const response = await page.request.post("/api/test/cart/user", {
    headers: {
      "x-e2e-secret": secret,
      "Content-Type": "application/json",
    },
    data: {
      email,
      mode: "sync",
      items,
    },
  });

  expect(response.ok()).toBeTruthy();
}

test("authenticated customer can reach checkout", async ({ page }) => {
  const testRunId = Date.now();
  const email = `buyer-${testRunId}@example.com`;

  await authenticate(page, {
    email,
    role: "CUSTOMER",
  });
  await seedAuthenticatedCartByEmail(page, email, [{ slug: "brown-cowboy", quantity: 1 }]);

  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Datos de la orden" })).toBeVisible();
  await expect(page.getByText(/Correo autenticado/i)).toBeVisible();
});

test("authenticated customer can complete mocked stripe checkout", async ({ page }) => {
  const testRunId = Date.now();
  const email = `stripe-buyer-${testRunId}@example.com`;

  await authenticate(page, {
    email,
    role: "CUSTOMER",
  });
  await seedAuthenticatedCartByEmail(page, email, [{ slug: "brown-cowboy", quantity: 1 }]);

  await page.goto("/checkout");
  await page.getByLabel("Nombre completo").fill("Comprador E2E");
  await page.getByLabel("Direccion de envio").fill("Calle 123, Bogota");
  await page.getByRole("button", { name: "Pagar con Stripe" }).click();

  await page.waitForURL("**/checkout/success**");
  await expect(
    page.getByRole("heading", {
      name: "Stripe validó la sesión y la orden quedó finalizada",
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver orden" }).click();
  await page.waitForURL("**/orders/**");
  await expect(page.getByText(/^Pedido /)).toBeVisible();
  await expect(page.getByText("PAID")).toHaveCount(2);
});

test("checkout shows cancelled payment notice when returning from Stripe", async ({ page }) => {
  const testRunId = Date.now();
  const email = `cancelled-buyer-${testRunId}@example.com`;

  await authenticate(page, {
    email,
    role: "CUSTOMER",
  });
  await seedAuthenticatedCartByEmail(page, email, [{ slug: "brown-cowboy", quantity: 1 }]);

  await page.goto("/checkout?payment=cancelled");
  await expect(page.getByRole("heading", { name: "Datos de la orden" })).toBeVisible();
  await expect(page.getByText(/El pago fue cancelado antes de completarse/i)).toBeVisible();
});
