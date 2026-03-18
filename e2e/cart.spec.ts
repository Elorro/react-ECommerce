import { expect, test } from "@playwright/test";

const secret = process.env.E2E_TEST_SECRET || "local-e2e-secret";
const baseUrl = "http://127.0.0.1:3100";
const anonymousCartKey = "atelier-commerce-cart:anonymous";

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

test("anonymous cart merges into the first authenticated account and stays isolated from another user", async ({
  page,
}) => {
  const testRunId = Date.now();
  const firstEmail = `cart-owner-${testRunId}@example.com`;
  const secondEmail = `other-customer-${testRunId}@example.com`;
  const anonymousCartResponse = await page.request.post("/api/test/cart", {
    headers: {
      "x-e2e-secret": secret,
      "Content-Type": "application/json",
    },
    data: {
      items: [{ slug: "brown-cowboy", quantity: 1 }],
    },
  });

  expect(anonymousCartResponse.ok()).toBeTruthy();

  const anonymousCart = (await anonymousCartResponse.json()) as {
    items: Array<{
      id: string;
      slug: string;
      name: string;
      imageUrl: string;
      price: number;
      stock: number;
      quantity: number;
    }>;
  };

  await page.goto("/");
  await page.evaluate(
    ({ key, items }) => {
      window.localStorage.setItem(key, JSON.stringify(items));
    },
    { key: anonymousCartKey, items: anonymousCart.items },
  );

  await authenticate(page, {
    email: firstEmail,
    role: "CUSTOMER",
  });

  const mergeResponse = await page.request.post("/api/test/cart/user", {
    headers: {
      "x-e2e-secret": secret,
      "Content-Type": "application/json",
    },
    data: {
      email: firstEmail,
      mode: "merge",
      items: anonymousCart.items.map((item) => ({
        slug: item.slug,
        quantity: item.quantity,
      })),
    },
  });

  expect(mergeResponse.ok()).toBeTruthy();

  await page.goto("/cart");
  await expect(page.getByText("Brown Cowboy")).toBeVisible();

  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL("**/");
  await page.waitForLoadState("networkidle");

  await authenticate(page, {
    email: secondEmail,
    role: "CUSTOMER",
  });

  await page.goto("/cart");
  await expect(page.getByText("Carrito vacio")).toBeVisible();
});
