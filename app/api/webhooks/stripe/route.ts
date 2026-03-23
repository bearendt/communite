export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/webhooks/stripe/route.ts
// Handles Stripe Identity verification events.
// When a user completes ID verification, we flip idVerified = true
// and sync to Clerk publicMetadata so the middleware can read it.

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
  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ---- Identity verification events ----

  if (event.type === "identity.verification_session.verified") {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    const userId = session.metadata?.userId;

    if (!userId) {
      console.error("[Stripe] Verification session missing userId metadata");
      return NextResponse.json({ received: true });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        idVerified: true,
        idVerifiedAt: new Date(),
        idVerificationRef: session.id,
      },
    });

    // Sync to Clerk publicMetadata so middleware reads idVerified without a DB call
    const verifiedUser = await prisma.user.findUnique({ where: { id: userId } });
    if (verifiedUser) {
      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
        const client = await clerkClient();
        await client.users.updateUserMetadata(verifiedUser.clerkId, {
          publicMetadata: { idVerified: true },
        });
      } catch (err) {
        // Non-fatal — DB is source of truth, Clerk sync is a performance optimisation
        console.error("[Stripe] Failed to sync idVerified to Clerk:", err);
      }
    }

    await logAudit({
      userId,
      action: "user.id_verified",
      entity: "User",
      entityId: userId,
      metadata: { stripeSessionId: session.id },
    });
  }

  if (event.type === "identity.verification_session.requires_input") {
    const session = event.data.object as Stripe.Identity.VerificationSession;
    console.warn(
      `[Stripe Identity] Verification requires input for session ${session.id}:`,
      session.last_error
    );
  }

  return NextResponse.json({ received: true });
}

// ---- POST /api/identity/start — creates a verification session for the user ----
// Call this from the frontend when user clicks "Get Verified"
export async function createVerificationSession(userId: string) {
  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { userId },
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
  });

  return {
    clientSecret: session.client_secret,
    sessionId: session.id,
  };
}
