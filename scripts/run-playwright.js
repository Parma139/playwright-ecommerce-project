import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const LIVE_URL = "https://playwright-ecommerce-project-1xy3.vercel.app";
const LOCAL_URL = "http://localhost:5173/";

let useLocal = false;

try {
  const env = readFileSync(".env.local", "utf8");
  useLocal = env
    .split(/\r?\n/)
    .some(
      (line) => line.trim() === "VITE_AUTOMATION_MARKER=ParmaLocalAutomation",
    );
} catch {
  // No local environment file: use Vercel.
}

let targetURL = LIVE_URL;

if (useLocal) {
  try {
    const response = await fetch(LOCAL_URL, {
      signal: AbortSignal.timeout(2000),
    });

    const html = await response.text();

    if (
      response.ok &&
      /<title>\s*QA Shop\s*<\/title>/i.test(html) &&
      html.includes("/src/main.jsx")
    ) {
      targetURL = LOCAL_URL;
    }
  } catch {
    // Local server unavailable: use Vercel.
  }
}

console.log(`\nRunning Playwright tests against: ${targetURL}\n`);

const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      BASE_URL: targetURL,
    },
  },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
