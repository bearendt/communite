export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/webhooks/stripe-billing/route.ts
// Handles Stripe subscription lifecycle events.
// Keeps user.tier in sync with Stripe — single source of truth.

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_BILLING_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const obj = event.data.object as Stripe.Subscription & {
    metadata?: Record<string, string>;
  };

  const userId = obj.metadata?.userId;
  if (!userId) {
    console.warn("[Stripe Billing] Event missing userId metadata:", event.type);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const isActive = ["active", "trialing"].includes(obj.status);
        const currentPeriodEnd = new Date((obj as unknown as { current_period_end: number }).current_period_end * 1000);

        await prisma.user.update({
          where: { id: userId },
          data: {
            tier: isActive ? "SUNDAY_TABLE" : "FREE",
            tierExpiresAt: isActive ? currentPeriodEnd : null,
          },
        });

        await logAudit({
          userId,
          action: isActive ? "subscription.activated" : "subscription.updated",
          entity: "User",
          entityId: userId,
          metadata: {
            stripeStatus: obj.status,
            periodEnd: currentPeriodEnd,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        // Cancelled and past expiry — downgrade to free
        await prisma.user.update({
          where: { id: userId },
          data: {
            tier: "FREE",
            tierExpiresAt: null,
          },
        });

        await logAudit({
          userId,
          action: "subscription.cancelled",
          entity: "User",
          entityId: userId,
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[Stripe Billing] Payment failed for user ${userId}:`, invoice.id);
        // Stripe automatically retries — no immediate action needed
        // After final retry fails, subscription.deleted fires
        break;
      }
    }
  } catch (err) {
    console.error(`[Stripe Billing] Failed to process ${event.type}:`, err);
    return NextResponse.json({ received: true, error: "Processing failed" });
  }

  return NextResponse.json({ received: true });
}
