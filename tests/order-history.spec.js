import { test, expect } from "@playwright/test";

async function login(page) {
  await page.goto("/");

  await page.getByLabel("Username").fill("testuser");
  await page.getByLabel("Password").fill("testuser");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();
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

test.describe("Order History", () => {
  test("displays the order history section", async ({ page }) => {
    await login(page);

    const history = await openOrderHistory(page);

    await expect(
      history.getByText("View your previous purchases and order details."),
    ).toBeVisible();
  });

  test("displays previous orders", async ({ page }) => {
    await login(page);

    const history = await openOrderHistory(page);

    await expect(history.locator(".order-card").first()).toBeVisible();
  });

  test("expands an order to display its items", async ({ page }) => {
    await login(page);

    const history = await openOrderHistory(page);
    const order = history.locator(".order-card").first();

    await expect(order).toBeVisible();

    await order.getByRole("button", { name: "View Details" }).click();

    await expect(order.locator(".order-details")).toBeVisible();
    await expect(
      order.getByRole("heading", { name: "Items Ordered" }),
    ).toBeVisible();
  });

  test("collapses order details when Hide Details is clicked", async ({
    page,
  }) => {
    await login(page);

    const history = await openOrderHistory(page);
    const order = history.locator(".order-card").first();

    await order.getByRole("button", { name: "View Details" }).click();

    await expect(order.locator(".order-details")).toBeVisible();

    await order.getByRole("button", { name: "Hide Details" }).click();

    await expect(order.locator(".order-details")).toBeHidden();
  });

  test("keeps order history available after page refresh", async ({ page }) => {
    await login(page);

    await openOrderHistory(page);
    await page.reload();

    await expect(
      page.getByRole("heading", { name: "Welcome to QA Shop" }),
    ).toBeVisible();

    const history = await openOrderHistory(page);

    await expect(history.locator(".order-card").first()).toBeVisible();
  });
});
