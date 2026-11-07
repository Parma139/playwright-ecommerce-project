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

// Locate a product
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

// Add laptop and return its price
async function addLaptop(page) {
  const laptop = getProduct(page, "Laptop");
  const stock = await getAvailableStock(laptop);

  test.skip(stock < 1, "Laptop has no available stock.");

  const price = await getProductPrice(laptop);

  await laptop.getByRole("button", { name: "Add Laptop to cart" }).click();

  return price;
}

// Navigate to Basket
async function openBasket(page) {
  await getBasketButton(page).click();

  await expect(
    page.getByRole("heading", { name: "Your Shopping Basket" }),
  ).toBeVisible();
}

// Navigate from Basket to Checkout
async function openCheckout(page) {
  await openBasket(page);

  await page.getByRole("button", { name: "Proceed to Checkout" }).click();

  await expect(
    page.getByRole("heading", { name: "Checkout", exact: true }),
  ).toBeVisible();
}

// Format currency
function formatPrice(amount) {
  return `£${amount.toFixed(2)}`;
}

// 1. Verify Checkout page displays correctly
test("checkout page displays correctly", async ({ page }) => {
  await login(page);
  await addLaptop(page);
  await openCheckout(page);

  await expect(
    page.getByRole("heading", { name: "Checkout", exact: true }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Order Summary" }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Select Payment Method" }),
  ).toBeVisible();

  await expect(page.getByRole("button", { name: "Place Order" })).toBeVisible();

  await expect(
    page.getByText(
      "This is a demonstration checkout. No real payments are processed.",
    ),
  ).toBeVisible();
});

// 2. Verify order summary displays the product
test("checkout displays the correct product and quantity", async ({ page }) => {
  await login(page);

  const price = await addLaptop(page);
  await openCheckout(page);

  await expect(page.getByText("Laptop × 1")).toBeVisible();

  await expect(
    page.getByText(formatPrice(price), { exact: true }),
  ).toBeVisible();
});

// 3. Verify checkout total
test("checkout displays the correct order total", async ({ page }) => {
  await login(page);

  const price = await addLaptop(page);
  await openCheckout(page);

  await expect(
    page.getByText(`Total: ${formatPrice(price)}`, { exact: true }),
  ).toBeVisible();
});

// 4. Verify Demo Card is selected by default
test("demo card payment is selected by default", async ({ page }) => {
  await login(page);
  await addLaptop(page);
  await openCheckout(page);

  await expect(
    page.getByRole("radio", { name: "Demo Card Payment" }),
  ).toBeChecked();

  await expect(
    page.getByRole("checkbox", {
      name: "Simulate a failed card payment (testing)",
    }),
  ).toBeVisible();
});

// 5. Verify Cash on Delivery can be selected
test("customer can select cash on delivery", async ({ page }) => {
  await login(page);
  await addLaptop(page);
  await openCheckout(page);

  const cashOption = page.getByRole("radio", {
    name: "Cash on Delivery",
  });

  await cashOption.check();

  await expect(cashOption).toBeChecked();
});

// 6. Verify failed payment simulation can be enabled
test("customer can enable failed card payment simulation", async ({ page }) => {
  await login(page);
  await addLaptop(page);
  await openCheckout(page);

  const failureOption = page.getByRole("checkbox", {
    name: "Simulate a failed card payment (testing)",
  });

  await failureOption.check();

  await expect(failureOption).toBeChecked();
});

// 7. Verify failure simulation disappears for Cash on Delivery
test("failed card simulation is hidden for cash on delivery", async ({
  page,
}) => {
  await login(page);
  await addLaptop(page);
  await openCheckout(page);

  const cashOption = page.getByRole("radio", {
    name: "Cash on Delivery",
  });

  await cashOption.check();

  await expect(
    page.getByRole("checkbox", {
      name: "Simulate a failed card payment (testing)",
    }),
  ).toBeHidden();
});

// 8. Verify Basket navigation from Checkout
test("customer can return to basket from checkout", async ({ page }) => {
  await login(page);
  await addLaptop(page);
  await openCheckout(page);

  await getBasketButton(page).click();

  await expect(
    page.getByRole("heading", { name: "Your Shopping Basket" }),
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Laptop" })).toBeVisible();
});
