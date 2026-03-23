export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/billing/checkout/route.ts
// Creates a Stripe Checkout session for Sunday Table subscription.
// On success, Stripe webhook fires → user.tier updated to SUNDAY_TABLE.

import Stripe from "stripe";
import { prisma } from "@/lib/db";
import {
  created,
  badRequest,
  requireUser,
  withErrorHandler,
} from "@/lib/api";
import type { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

// Sunday Table price IDs — create these in Stripe dashboard
const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,  // $6.99/mo
  annual:  process.env.STRIPE_PRICE_ANNUAL!,   // $60/yr
};

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  if (user.tier === "SUNDAY_TABLE") {
    return badRequest("You're already a Sunday Table member");
  }

  const { interval } = await req.json() as { interval: "monthly" | "annual" };

  if (!PRICE_IDS[interval]) {
    return badRequest("Invalid billing interval");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [{ price: PRICE_IDS[interval], quantity: 1 }],
    success_url: `${appUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/upgrade`,
    metadata: { userId: user.id },
    subscription_data: {
      metadata: { userId: user.id },
      trial_period_days: 14, // 14-day free trial
    },
    allow_promotion_codes: true,
  });

  return created({ url: session.url });
});
