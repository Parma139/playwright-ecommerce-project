import { defineConfig } from "@playwright/test";

const baseURL =
  process.env.BASE_URL ||
  "https://playwright-ecommerce-project-1xy3.vercel.app";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: "list",

  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    trace: "on-first-retry",
  },
});
