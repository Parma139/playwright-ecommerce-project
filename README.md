# 🛒 QA Shop — E-commerce & Playwright Testing

A small e-commerce website I built to practise web development, database integration, and automated testing with Playwright.

## Features

- Products loaded from Supabase
- Shopping cart with quantity controls and totals
- Stock limit handling
- Automated tests for key shopping cart scenarios

## Tech Stack

- React, JavaScript and Vite
- Supabase
- Playwright
- Git and GitHub

## Run Locally

1. Clone this repository:
   ```bash
   git clone YOUR_GITHUB_REPOSITORY_URL
   cd playwright-ecommerce-project
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the project root and add your own Supabase project details:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```
4. Start the app:
   ```bash
   npm run dev
   ```

## Run the Tests

Run all Playwright tests:

```bash
npx playwright test
```

Run tests in a visible browser:

```bash
npx playwright test --headed
```

## Using AI

I used AI as a learning assistant to help me understand concepts, troubleshoot errors, and improve my tests. I ran the application and tests myself to check that everything worked as expected.

## Live Demo

Try the website: https://YOUR-VERCEL-URL.vercel.app

## What's Next?

- Set up GitHub Actions to run tests automatically
- Add screenshots and improve the project documentation
