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

test("store displays products from Supabase", async ({ page }) => {
  await login(page);

  await expect(
    page.getByRole("heading", { name: "QA Shop", exact: true }),
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Laptop" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Keyboard" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Mouse" })).toBeVisible();
});

test("adding a laptop updates cart count, total and stock", async ({
  page,
}) => {
  await login(page);

  // Confirm the cart starts empty
  await expect(page.getByTestId("cart-count")).toHaveText("0");

  // Find the laptop product card
  const laptop = page.getByTestId("product-card").filter({
    has: page.getByRole("heading", {
      name: "Laptop",
      exact: true,
    }),
  });

  // Confirm initial stock
  await expect(laptop).toContainText("In stock: 10");

  // Add the laptop to the cart
  await laptop
    .getByRole("button", {
      name: "Add Laptop to cart",
    })
    .click();

  // Verify cart count, total and updated stock
  await expect(page.getByTestId("cart-count")).toHaveText("1");
  await expect(page.getByTestId("cart-total")).toHaveText("Total: £799.00");
  await expect(laptop).toContainText("In stock: 9");
});

test("increasing quantity updates the cart total and stock", async ({
  page,
}) => {
  await login(page);

  const laptop = page.getByTestId("product-card").filter({
    has: page.getByRole("heading", {
      name: "Laptop",
      exact: true,
    }),
  });

  await laptop
    .getByRole("button", {
      name: "Add Laptop to cart",
    })
    .click();

  await laptop
    .getByRole("button", {
      name: "Add Laptop to cart",
    })
    .click();

  await expect(page.getByTestId("cart-count")).toHaveText("2");
  await expect(page.getByTestId("cart-total")).toHaveText("Total: £1598.00");
  await expect(laptop).toContainText("In stock: 8");
});

test("removing a product empties the cart", async ({ page }) => {
  await login(page);

  const laptop = page.getByTestId("product-card").filter({
    has: page.getByRole("heading", {
      name: "Laptop",
      exact: true,
    }),
  });

  await laptop
    .getByRole("button", {
      name: "Add Laptop to cart",
    })
    .click();

  await page
    .getByRole("button", {
      name: "Remove",
    })
    .click();

  await expect(page.getByTestId("cart-count")).toHaveText("0");
  await expect(page.getByTestId("empty-cart")).toBeVisible();
  await expect(laptop).toContainText("In stock: 10");
});

test("cannot add more laptops than available stock", async ({ page }) => {
  await login(page);

  const laptop = page.getByTestId("product-card").filter({
    has: page.getByRole("heading", {
      name: "Laptop",
      exact: true,
    }),
  });

  // Keep a stable locator even when the button text changes
  const addButton = laptop.locator("button").first();

  // Add all 10 available laptops
  for (let i = 0; i < 10; i++) {
    await addButton.click();
  }

  await expect(page.getByTestId("cart-count")).toHaveText("10");
  await expect(page.getByTestId("cart-total")).toHaveText("Total: £7990.00");
  await expect(laptop).toContainText("In stock: 0");

  // Verify the button is disabled and its label has changed
  await expect(addButton).toBeDisabled();
  await expect(addButton).toHaveText("Stock Limit Reached");
});

test("cannot decrease a cart quantity below one", async ({ page }) => {
  await login(page);

  const laptop = page.getByTestId("product-card").filter({
    has: page.getByRole("heading", {
      name: "Laptop",
      exact: true,
    }),
  });

  await laptop
    .getByRole("button", {
      name: "Add Laptop to cart",
    })
    .click();

  const decreaseButton = page.getByRole("button", {
    name: "Decrease Laptop quantity",
  });

  await expect(decreaseButton).toBeDisabled();
  await expect(page.getByTestId("cart-count")).toHaveText("1");
});
