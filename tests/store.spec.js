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

// Read available stock dynamically from the product card
async function getAvailableStock(product) {
  const stockText = await product.locator(".stock").textContent();
  const match = stockText?.match(/In stock:\s*(\d+)/);

  if (!match) {
    throw new Error(`Could not read available stock: ${stockText}`);
  }

  return Number(match[1]);
}

// Read product price dynamically
async function getProductPrice(product) {
  const priceText = await product.locator(".price").textContent();
  const match = priceText?.match(/£\s*([\d.]+)/);

  if (!match) {
    throw new Error(`Could not read product price: ${priceText}`);
  }

  return Number(match[1]);
}

// Locate the Basket navigation button
function getBasketButton(page) {
  return page
    .getByRole("navigation", { name: "Main navigation" })
    .locator("button")
    .filter({ hasText: "Basket" });
}

// Verify basket item count
async function expectBasketCount(page, count) {
  await expect(getBasketButton(page)).toContainText(`(${count})`);
}

// Navigate to the separate Basket page
async function openBasket(page) {
  await getBasketButton(page).click();

  await expect(
    page.getByRole("heading", { name: "Your Shopping Basket" }),
  ).toBeVisible();
}

// Verify the displayed basket total
async function expectBasketTotal(page, total) {
  await expect(
    page.getByText(`Total: £${total.toFixed(2)}`, { exact: true }),
  ).toBeVisible();
}

// 1. Verify products are displayed
test("store displays products from Supabase", async ({ page }) => {
  await login(page);

  await expect(
    page.getByRole("heading", { name: "QA Shop", exact: true }),
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Laptop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Keyboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mouse" })).toBeVisible();
});

// 2. Verify adding a product updates basket count, total and stock
test("adding a laptop updates basket count, total and stock", async ({
  page,
}) => {
  await login(page);

  const laptop = getProduct(page, "Laptop");

  const initialStock = await getAvailableStock(laptop);
  const laptopPrice = await getProductPrice(laptop);

  test.skip(initialStock < 1, "Laptop has no available stock.");

  await expectBasketCount(page, 0);

  await laptop.getByRole("button", { name: "Add Laptop to cart" }).click();

  await expectBasketCount(page, 1);

  await expect(laptop).toContainText(`In stock: ${initialStock - 1}`);

  await openBasket(page);

  await expectBasketTotal(page, laptopPrice);
});

// 3. Verify increasing quantity updates basket total and stock
test("increasing quantity updates the basket total and stock", async ({
  page,
}) => {
  await login(page);

  const laptop = getProduct(page, "Laptop");

  const initialStock = await getAvailableStock(laptop);
  const laptopPrice = await getProductPrice(laptop);

  test.skip(initialStock < 2, "At least two laptops must be available.");

  const addButton = laptop.getByRole("button", {
    name: "Add Laptop to cart",
  });

  await addButton.click();
  await addButton.click();

  await expectBasketCount(page, 2);

  await expect(laptop).toContainText(`In stock: ${initialStock - 2}`);

  await openBasket(page);

  await expectBasketTotal(page, laptopPrice * 2);
});

// 4. Verify removing a product empties the basket
test("removing a product empties the basket", async ({ page }) => {
  await login(page);

  const laptop = getProduct(page, "Laptop");
  const initialStock = await getAvailableStock(laptop);

  test.skip(initialStock < 1, "Laptop has no available stock.");

  await laptop.getByRole("button", { name: "Add Laptop to cart" }).click();

  await openBasket(page);

  await page.getByRole("button", { name: "Remove" }).click();

  await expectBasketCount(page, 0);

  await expect(page.getByText("Your basket is empty.")).toBeVisible();
});

// 5. Verify customers cannot add more products than available stock
test("cannot add more laptops than available stock", async ({ page }) => {
  await login(page);

  const laptop = getProduct(page, "Laptop");

  const initialStock = await getAvailableStock(laptop);
  const laptopPrice = await getProductPrice(laptop);

  const addButton = laptop.getByRole("button", {
    name: "Add Laptop to cart",
  });

  // Product already has zero stock
  if (initialStock === 0) {
    await expect(addButton).toBeDisabled();
    await expect(addButton).toHaveText("Out of Stock");
    return;
  }

  // Add exactly the available quantity
  for (let i = 0; i < initialStock; i++) {
    await addButton.click();
  }

  await expect(laptop).toContainText("In stock: 0");

  await expect(addButton).toBeDisabled();
  await expect(addButton).toHaveText("Stock Limit Reached");

  await expectBasketCount(page, initialStock);

  await openBasket(page);

  await expectBasketTotal(page, laptopPrice * initialStock);
});

// 6. Verify quantity cannot be decreased below one
test("cannot decrease a basket quantity below one", async ({ page }) => {
  await login(page);

  const laptop = getProduct(page, "Laptop");
  const initialStock = await getAvailableStock(laptop);

  test.skip(initialStock < 1, "Laptop has no available stock.");

  await laptop.getByRole("button", { name: "Add Laptop to cart" }).click();

  await openBasket(page);

  const decreaseButton = page.getByRole("button", {
    name: "Decrease Laptop quantity",
  });

  await expect(decreaseButton).toBeDisabled();
  await expectBasketCount(page, 1);
});
