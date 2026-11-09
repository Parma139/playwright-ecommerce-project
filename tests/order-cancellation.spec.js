import { test, expect } from "@playwright/test";

async function login(page) {
  await page.goto("/");

  await page.getByLabel("Username").fill("testuser");
  await page.getByLabel("Password").fill("testuser");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();

  // Wait until products have loaded.
  await expect(page.getByTestId("product-card").first()).toBeVisible();
}

async function addAvailableProduct(page) {
  const products = page.getByTestId("product-card");
  const productCount = await products.count();

  console.log("Product cards found:", productCount);

  for (let i = 0; i < productCount; i++) {
    const product = products.nth(i);
    const name = await product.locator("h3").innerText();
    const stockText = await product.locator(".stock").innerText();

    console.log("Product:", name);
    console.log("Stock text:", stockText);

    const match = stockText.match(/In stock:\s*(\d+)/);
    const stock = match ? Number(match[1]) : 0;

    const button = product.getByRole("button", {
      name: `Add ${name} to cart`,
    });

    console.log("Stock number:", stock);
    console.log("Button enabled:", await button.isEnabled());

    if (stock > 0 && (await button.isEnabled())) {
      await button.click();
      return { name, stock };
    }
  }

  throw new Error("No product with available stock was found.");
}

async function createSuccessfulOrder(page) {
  const product = await addAvailableProduct(page);

  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /Basket/i })
    .click();

  await expect(
    page.getByRole("heading", { name: "Your Shopping Basket" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Proceed to Checkout" }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

  await page.getByRole("button", { name: "Place Order" }).click();

  const confirmation = page.getByRole("status", {
    name: "Order confirmation",
  });

  await expect(
    confirmation.getByRole("heading", { name: "Order Confirmed!" }),
  ).toBeVisible();

  return product;
}

async function openOrderHistory(page) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "My Orders" })
    .click();

  const history = page.locator(".order-history");

  await expect(
    history.getByRole("heading", { name: "My Orders" }),
  ).toBeVisible();

  return history;
}

async function cancelLatestOrder(page) {
  const history = await openOrderHistory(page);
  const order = history.locator(".order-card").first();

  await expect(order).toBeVisible();

  await expect(order.locator(".order-status")).toHaveText("completed");

  page.once("dialog", (dialog) => dialog.accept());

  await order.getByRole("button", { name: "Cancel Order" }).click();

  await expect(order.locator(".order-status")).toHaveText("cancelled");

  return order;
}

test.describe("Order Cancellation", () => {
  test("successfully cancels a completed order", async ({ page }) => {
    await login(page);
    await createSuccessfulOrder(page);

    const order = await cancelLatestOrder(page);

    await expect(order.locator(".order-status")).toHaveText("cancelled");
  });

  test("restores product stock after order cancellation", async ({ page }) => {
    await login(page);

    const product = await addAvailableProduct(page);

    const productCard = page.getByTestId("product-card").filter({
      has: page.getByRole("heading", {
        name: product.name,
        exact: true,
      }),
    });

    // Navigate to checkout and place a successful order.
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: /Basket/i })
      .click();

    await page.getByRole("button", { name: "Proceed to Checkout" }).click();

    await page.getByRole("button", { name: "Place Order" }).click();

    await expect(
      page.getByRole("heading", { name: "Order Confirmed!" }),
    ).toBeVisible();

    // Return to the shop and read the actual stock after ordering.
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Shop" })
      .click();

    const stockAfterOrder = Number(
      (await productCard.locator(".stock").innerText()).match(/\d+/)?.[0],
    );

    // Cancel the latest order.
    const history = await openOrderHistory(page);
    const order = history.locator(".order-card").first();

    page.once("dialog", (dialog) => dialog.accept());

    await order.getByRole("button", { name: "Cancel Order" }).click();

    await expect(order.locator(".order-status")).toHaveText("cancelled");

    // Return to the shop and verify stock increased by one.
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: "Shop" })
      .click();

    await expect(productCard.locator(".stock")).toHaveText(
      `In stock: ${stockAfterOrder + 1}`,
    );
  });

  test("cancellation persists after refreshing the page", async ({ page }) => {
    await login(page);
    const product = await createSuccessfulOrder(page);

    const order = await cancelLatestOrder(page);
    const orderNumber = await order.locator("h3").innerText();

    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Welcome to QA Shop" }),
    ).toBeVisible();

    const history = await openOrderHistory(page);
    const cancelledOrder = history.locator(".order-card").filter({
      has: page.getByRole("heading", { name: orderNumber, exact: true }),
    });

    await expect(cancelledOrder.locator(".order-status")).toHaveText(
      "cancelled",
    );
  });

  test("hides the cancellation button after cancellation", async ({ page }) => {
    await login(page);
    await createSuccessfulOrder(page);

    const order = await cancelLatestOrder(page);

    await expect(
      order.getByRole("button", { name: "Cancel Order" }),
    ).toBeHidden();
  });
});
