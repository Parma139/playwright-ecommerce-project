# 🛒 QA Shop — E-commerce & Playwright Testing

A small e-commerce website built to practise web development, database integration, and end-to-end (E2E) testing with Playwright.

## Features

- Products loaded from Supabase
- Shopping cart with quantity controls and totals
- Stock limit handling
- Login and logout functionality using Supabase Authentication
- Session persistence after page refresh
- Demo login with username and password hints on the login page
- Automated tests for product display, cart functionality, and stock limits
- Support for testing the live website or a local development version
- GitHub Actions CI to automatically build the application and run Playwright tests on pull requests

## Tech Stack

- React, JavaScript and Vite
- Supabase
- Playwright
- Git and GitHub
- Vercel

## Live Demo

Try the website: [QA Shop](https://playwright-ecommerce-project-1xy3.vercel.app/)

## Run the Playwright Tests

Choose either **Live Testing** or **Local Testing** below.

### Option 1: Live Testing — Recommended for Reviewers

This option runs the tests against the deployed Vercel website. You do not need to start the website locally or configure Supabase for local development.

1. Clone the repository:

   ```bash
   git clone "https://github.com/Parma139/playwright-ecommerce-project.git"
   cd playwright-ecommerce-project
   ```

2. Install dependencies:

   ```bash
   npm install
   npx playwright install chromium
   ```

3. Run the tests:

   ```bash
   npm run test:e2e
   ```

By default, the test runner uses the live Vercel website unless the local automation marker is configured and a matching local website is available.

### Option 2: Local Testing — For Development

Use this option when you want to test your own local code changes.

1. Clone the repository and install dependencies as described above.

2. Create a `.env.local` file in the project root with your Supabase project details:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

3. Add the local automation marker to the same `.env.local` file:

   ```env
   VITE_AUTOMATION_MARKER=ParmaLocalAutomation
   ```

4. Start the local development server:

   ```bash
   npm run dev
   ```

5. Keep the development server running and open a second terminal in the project folder. Run:

   ```bash
   npm run test:e2e
   ```

The test runner checks for the local marker and verifies that the local app is available and matches the expected page. If it does, tests run locally; otherwise, they fall back to Vercel.

**Important:** `.env.local` is excluded from Git and should not be committed. Use a Supabase publishable key, never a service-role or secret key.

### Useful Test Options

Run tests in a visible browser:

```bash
npm run test:e2e -- --headed
```

Open Playwright's debugging tools:

```bash
npm run test:e2e -- --debug
```

## Using AI

I used AI as a development tool to build and improve the application, troubleshoot problems, and explore different solutions. I tested the functionality, verified the results, and refined the implementation to ensure the features worked as expected. I also used Playwright to automate end-to-end tests and GitHub Actions to run the tests automatically on pull requests.
I also used Playwright to automate end-to-end tests for the shop, login, logout, and session persistence, and GitHub Actions to run the tests automatically on pull requests.

## What's Next?

- Create a checkout and payment interface
- Improve the user interface and overall shopping experience
- Expand automated tests to cover checkout functionality
