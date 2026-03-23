// apps/web/lib/env.ts
// Validates required environment variables at startup.
// Import this at the top of any file that needs env vars, or in next.config.ts.
// Fails loud and early rather than silently at runtime.

const required = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  // Auth
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  // Rate limiting
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_BILLING_WEBHOOK_SECRET: process.env.STRIPE_BILLING_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  // Ably
  ABLY_API_KEY: process.env.ABLY_API_KEY,
  // App
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
} as const;

// Optional — warn in dev if missing, don't crash
const optional = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  SLACK_SAFETY_WEBHOOK: process.env.SLACK_SAFETY_WEBHOOK,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  SANITY_API_TOKEN: process.env.SANITY_API_TOKEN,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  STRIPE_PRICE_MONTHLY: process.env.STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_ANNUAL: process.env.STRIPE_PRICE_ANNUAL,
} as const;

function validateEnv() {
  // Only validate in server context (not during static generation of public pages)
  if (typeof window !== "undefined") return;
  // Skip in test environment
  if (process.env.NODE_ENV === "test") return;

  const missing = Object.entries(required)
    .filter(([, val]) => !val)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join("\n")}\n\nSee .env.example for reference.`
    );
  }

  if (process.env.NODE_ENV === "development") {
    const missingOptional = Object.entries(optional)
      .filter(([, val]) => !val)
      .map(([key]) => key);

    if (missingOptional.length > 0) {
      console.warn(
        `[env] Optional variables not set (some features will be degraded):\n${missingOptional.map((k) => `  - ${k}`).join("\n")}`
      );
    }
  }
}

// Run validation when this module is imported
validateEnv();

export const env = {
  ...required,
  ...optional,
} as Record<string, string | undefined>;
