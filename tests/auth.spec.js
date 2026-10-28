import { test, expect } from "@playwright/test";

async function login(page, username = "testuser", password = "testuser") {
  await page.goto("/");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("signed-out visitor sees the login screen", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await expect(page.getByLabel("Username")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByTestId("product-card")).toHaveCount(0);
});

test("valid demo credentials open the shop", async ({ page }) => {
  await login(page);

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();

  await expect(page.getByTestId("product-card")).toHaveCount(3);
});

test("invalid password shows an error", async ({ page }) => {
  await login(page, "testuser", "definitely-wrong-password");

  await expect(page.getByRole("alert")).toHaveText(
    "Invalid username or password.",
  );

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("unknown username is rejected", async ({ page }) => {
  await login(page, "unknown-user", "testuser");

  await expect(page.getByRole("alert")).toHaveText(
    "Invalid username or password.",
  );
});

test("session survives a page refresh", async ({ page }) => {
  await login(page);

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();
});

test("logout returns the visitor to the login screen", async ({ page }) => {
  await login(page);

  await expect(
    page.getByRole("heading", { name: "Welcome to QA Shop" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();

  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  await expect(page.getByTestId("product-card")).toHaveCount(0);
});
