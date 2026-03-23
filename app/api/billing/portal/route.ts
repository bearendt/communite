export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/billing/portal/route.ts
// Opens Stripe Customer Portal for subscription management.
// Handles: plan changes, cancellation, payment method updates.

import Stripe from "stripe";
import { prisma } from "@/lib/db";
import {
  created,
  forbidden,
  badRequest,
  requireUser,
  withErrorHandler,
} from "@/lib/api";
import type { NextRequest } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  if (user.tier !== "SUNDAY_TABLE") {
    return forbidden("No active subscription to manage");
  }

  // Find their Stripe customer ID from active subscriptions
  const subscriptions = await stripe.subscriptions.list({
    expand: ["data.customer"],
    limit: 1,
  });

  // Search by metadata userId
  const stripeSearch = await stripe.subscriptions.search({
    query: `metadata["userId"]:"${user.id}"`,
    limit: 1,
  });

  const subscription = stripeSearch.data[0];
  if (!subscription) {
    return badRequest("Could not find your subscription. Contact support.");
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return created({ url: session.url });
});
