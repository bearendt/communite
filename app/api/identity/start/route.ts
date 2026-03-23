export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/identity/start/route.ts
// Creates a Stripe Identity verification session for the authenticated user.
// Returns a clientSecret the frontend uses to launch the Stripe Identity modal.
// On completion, Stripe fires a webhook → /api/webhooks/stripe → updates user.idVerified

import Stripe from "stripe";
import { prisma } from "@/lib/db";
import {
  created,
  forbidden,
  conflict,
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

  if (user.idVerified) {
    return conflict("Your identity is already verified");
  }

  // Only Sunday Table members or hosts need ID verification
  // (guests can verify voluntarily to unlock events that require it)

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: { userId: user.id },
    options: {
      document: {
        // Require a selfie to match the document
        require_matching_selfie: true,
      },
    },
  });

  // Store the pending session reference so we can correlate the webhook
  await prisma.user.update({
    where: { id: user.id },
    data: { idVerificationRef: session.id },
  });

  return created({
    clientSecret: session.client_secret,
    sessionId: session.id,
  });
});
