import { test, expect } from "@playwright/test";

async function login(page) {
  await page.goto("/");

  await page.getByLabel("Username").fill("testuser");
  await page.getByLabel("Password").fill("testuser");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();
  await page.waitForTimeout(2000);

  console.log("Current URL:", page.url());
  console.log("Page heading:", await page.locator("h1, h2").allInnerTexts());
  console.log(
    "Page content:",
    (await page.locator("body").innerText()).slice(0, 1500),
  );
  console.log("Product cards:", await page.getByTestId("product-card").count());
}

async function addAvailableProduct(page) {
  const products = page.getByTestId("product-card");
  const productCount = await products.count();

  console.log(`Products found: ${productCount}`);

  for (let i = 0; i < productCount; i++) {
    const product = products.nth(i);
    const name = await product.locator("h3").innerText();
    const stock = await product.locator(".stock").innerText();
    const button = product.getByRole("button", {
      name: /Add .* to cart/i,
    });

    console.log({
      product: name,
      stock,
      buttonFound: await button.count(),
      buttonEnabled:
        (await button.count()) > 0 ? await button.isEnabled() : false,
    });

    if ((await button.count()) > 0 && (await button.isEnabled())) {
      await button.click();
      return;
    }
  }

  throw new Error("No product with available stock was found.");
}

async function goToCheckout(page) {
  await addAvailableProduct(page);

  const navigation = page.getByRole("navigation", {
    name: "Main navigation",
  });

  await navigation.getByRole("button", { name: /Basket/i }).click();

  await expect(
    page.getByRole("heading", { name: "Your Shopping Basket" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Proceed to Checkout" }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
}

test.describe("Payment", () => {
  test("successfully places an order using Demo Card", async ({ page }) => {
    await login(page);
    await goToCheckout(page);

    await expect(
      page.getByRole("radio", { name: "Demo Card Payment" }),
    ).toBeChecked();

    await page.getByRole("button", { name: "Place Order" }).click();

    await page.waitForTimeout(2000);

    console.log("URL after payment:", page.url());
    console.log(
      "Page content after payment:",
      (await page.locator("body").innerText()).slice(0, 2000),
    );
    const confirmation = page.getByRole("status", {
      name: "Order confirmation",
    });

    await expect(
      confirmation.getByRole("heading", { name: "Order Confirmed!" }),
    ).toBeVisible();

    await expect(
      confirmation.getByText("Your order has been successfully placed."),
    ).toBeVisible();

    await expect(confirmation.getByText(/Order number:/)).toBeVisible();
    await expect(confirmation.getByText(/Total:/)).toBeVisible();
    await expect(
      confirmation.getByText(/Payment method:\s*Demo Card/),
    ).toBeVisible();
    await expect(confirmation.getByText(/Order status:/)).toBeVisible();
    await expect(confirmation.getByText(/Payment status:/)).toBeVisible();
  });

  test("successfully places an order using Cash on Delivery", async ({
    page,
  }) => {
    await login(page);
    await goToCheckout(page);

    await page.getByRole("radio", { name: "Cash on Delivery" }).check();

    await expect(
      page.getByText("Simulate a failed card payment (testing)"),
    ).toBeHidden();

    await page.getByRole("button", { name: "Place Order" }).click();

    const confirmation = page.getByRole("status", {
      name: "Order confirmation",
    });

    await expect(
      confirmation.getByRole("heading", { name: "Order Confirmed!" }),
    ).toBeVisible();

    await expect(
      confirmation.getByText(/Payment method:\s*Cash on Delivery/),
    ).toBeVisible();

    await expect(confirmation.getByText(/Order number:/)).toBeVisible();
  });

  test("displays an error when a Demo Card payment fails", async ({ page }) => {
    await login(page);
    await goToCheckout(page);

    await page
      .getByRole("checkbox", {
        name: "Simulate a failed card payment (testing)",
      })
      .check();

    await page.getByRole("button", { name: "Place Order" }).click();

    await expect(
      page.getByRole("alert").filter({
        hasText:
          "Payment failed. Your order was cancelled and stock was not reduced.",
      }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Order Confirmed!" }),
    ).toBeHidden();

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  });

  test("retains the basket after a failed card payment", async ({ page }) => {
    await login(page);
    await goToCheckout(page);

    await page
      .getByRole("checkbox", {
        name: "Simulate a failed card payment (testing)",
      })
      .check();

    await page.getByRole("button", { name: "Place Order" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Your order was cancelled and stock was not reduced.",
    );

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

    // Navigate back to the basket and verify that the item remains.
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: /Basket/i })
      .click();

    await expect(
      page.getByRole("heading", { name: "Your Shopping Basket" }),
    ).toBeVisible();

    await expect(page.getByText("Your basket is empty.")).toBeHidden();
  });

  test("keeps the failure simulation selection when switching payment methods", async ({
    page,
  }) => {
    await login(page);
    await goToCheckout(page);

    const failureCheckbox = page.getByRole("checkbox", {
      name: "Simulate a failed card payment (testing)",
    });

    await failureCheckbox.check();

    await page.getByRole("radio", { name: "Cash on Delivery" }).check();

    await expect(failureCheckbox).toBeHidden();

    await page.getByRole("radio", { name: "Demo Card Payment" }).check();

    await expect(failureCheckbox).toBeVisible();
    await expect(failureCheckbox).toBeChecked();
  });
});
