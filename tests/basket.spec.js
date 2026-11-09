import { test, expect } from "@playwright/test";

// Login helper
async function login(page) {
  await page.goto("/");

  await page.getByLabel("Username").fill("testuser");
  await page.getByLabel("Password").fill("testuser");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();

  await expect(page.getByTestId("product-card").first()).toBeVisible();
}

// Locate a product card
function getProduct(page, productName) {
  return page.getByTestId("product-card").filter({
    has: page.getByRole("heading", {
      name: productName,
      exact: true,
    }),
  });
}

// Read available stock
async function getAvailableStock(product) {
  const stockText = await product.locator(".stock").textContent();
  const match = stockText?.match(/In stock:\s*(\d+)/);

  if (!match) {
    throw new Error(`Could not read stock: ${stockText}`);
  }

  return Number(match[1]);
}

// Read product price
async function getProductPrice(product) {
  const priceText = await product.locator(".price").textContent();
  const match = priceText?.match(/£\s*([\d.]+)/);

  if (!match) {
    throw new Error(`Could not read price: ${priceText}`);
  }

  return Number(match[1]);
}

// Basket navigation
function getBasketButton(page) {
  return page
    .getByRole("navigation", { name: "Main navigation" })
    .locator("button")
    .filter({ hasText: "Basket" });
}

// Navigate to Basket page
async function openBasket(page) {
  await getBasketButton(page).click();

  await expect(
    page.getByRole("heading", { name: "Your Shopping Basket" }),
  ).toBeVisible();
}

// Add a product to basket
async function addLaptop(page) {
  const laptop = getProduct(page, "Laptop");
  const stock = await getAvailableStock(laptop);

  test.skip(stock < 1, "Laptop has no available stock.");

  const price = await getProductPrice(laptop);

  await laptop.getByRole("button", { name: "Add Laptop to cart" }).click();

  return price;
}

// Format currency
function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

// 1. Verify empty basket
test("displays an empty basket when no products have been added", async ({
  page,
}) => {
  await login(page);
  await openBasket(page);

  await expect(page.getByText("Your basket is empty.")).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Continue Shopping" }),
  ).toBeVisible();
});

// 2. Verify basket displays added product
test("displays the added product in the basket", async ({ page }) => {
  await login(page);

  await addLaptop(page);
  await openBasket(page);

  await expect(page.getByRole("heading", { name: "Laptop" })).toBeVisible();

  await expect(page.getByText("£", { exact: false }).first()).toBeVisible();

  await expect(page.getByRole("button", { name: "Remove" })).toBeVisible();
});

// 3. Verify item subtotal and basket total
test("displays the correct item subtotal and basket total", async ({
  page,
}) => {
  await login(page);

  const price = await addLaptop(page);
  await openBasket(page);

  const expectedPrice = formatPrice(price);

  await expect(
    page.getByText(`Subtotal: ${expectedPrice}`, { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByText(`Total: ${expectedPrice}`, { exact: true }),
  ).toBeVisible();
});

// 4. Verify increasing quantity
test("increases product quantity and updates subtotal and total", async ({
  page,
}) => {
  await login(page);

  const laptop = getProduct(page, "Laptop");
  const stock = await getAvailableStock(laptop);

  test.skip(stock < 2, "At least two laptops must be available.");

  const price = await getProductPrice(laptop);

  await laptop.getByRole("button", { name: "Add Laptop to cart" }).click();

  await openBasket(page);

  await page.getByRole("button", { name: "Increase Laptop quantity" }).click();

  const expectedTotal = formatPrice(price * 2);

  await expect(
    page.getByText(`Subtotal: ${expectedTotal}`, { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByText(`Total: ${expectedTotal}`, { exact: true }),
  ).toBeVisible();

  await expect(getBasketButton(page)).toContainText("(2)");
});

// 5. Verify decreasing quantity
test("decreases product quantity and updates subtotal and total", async ({
  page,
}) => {
  await login(page);

  const laptop = getProduct(page, "Laptop");
  const stock = await getAvailableStock(laptop);

  test.skip(stock < 2, "At least two laptops must be available.");

  const price = await getProductPrice(laptop);

  const addButton = laptop.getByRole("button", {
    name: "Add Laptop to cart",
  });

  await addButton.click();
  await addButton.click();

  await openBasket(page);

  await page.getByRole("button", { name: "Decrease Laptop quantity" }).click();

  const expectedTotal = formatPrice(price);

  await expect(
    page.getByText(`Subtotal: ${expectedTotal}`, { exact: true }),
  ).toBeVisible();

  await expect(
    page.getByText(`Total: ${expectedTotal}`, { exact: true }),
  ).toBeVisible();

  await expect(getBasketButton(page)).toContainText("(1)");
});

// 6. Verify removing a product
test("removes a product from the basket", async ({ page }) => {
  await login(page);

  await addLaptop(page);
  await openBasket(page);

  await page.getByRole("button", { name: "Remove" }).click();

  await expect(page.getByText("Your basket is empty.")).toBeVisible();
  await expect(getBasketButton(page)).toContainText("(0)");
});

// 7. Verify Continue Shopping navigation
test("continue shopping returns to the Shop page", async ({ page }) => {
  await login(page);
  await openBasket(page);

  await page.getByRole("button", { name: "Continue Shopping" }).click();

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();

  await expect(page.getByTestId("product-card").first()).toBeVisible();
});

// 8. Verify checkout navigation
test("proceed to checkout opens the Checkout page", async ({ page }) => {
  await login(page);

  await addLaptop(page);
  await openBasket(page);

  await page.getByRole("button", { name: "Proceed to Checkout" }).click();

  await expect(
    page.getByRole("heading", { name: "Checkout", exact: true }),
  ).toBeVisible();
});
