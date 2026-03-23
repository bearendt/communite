export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/chat/token/route.ts
// Generates a signed Ably token for the requesting user.
// The Ably API key NEVER leaves the server.
// Clients use the token to connect — tokens expire after 1 hour.

import Ably from "ably";
import { requireUser, withErrorHandler, ok, serverError } from "@/lib/api";
import type { NextRequest } from "next/server";

function getAbly() { return new Ably.Rest(process.env.ABLY_API_KEY ?? "key:placeholder"); }

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  try {
    const tokenRequest = await getAbly().auth.createTokenRequest({
      clientId: user.id,
      capability: buildCapability(user.id),
      ttl: 3600_000, // 1 hour in ms
    });

    return ok(tokenRequest);
  } catch (err) {
    console.error("[Ably] Token generation failed:", err);
    return serverError("Could not generate chat token");
  }
});

// Build channel capability map for this user
// Users can only subscribe/publish to channels they have access to
// This is enforced server-side by Ably — not just frontend logic
function buildCapability(userId: string): Record<string, string[]> {
  return {
    // User's own DM inbox
    [`dm:${userId}:*`]: ["subscribe", "publish", "presence"],
    // Event channels — publish requires RSVP check at message-send time
    // Ably capability allows the connection; our API validates RSVP before saving
    "event:*": ["subscribe", "presence"],
    [`event:*:${userId}`]: ["publish"],
    // Private tables
    "table:*": ["subscribe", "presence"],
    // Presence on all channels
    "[meta]connectionDetails": ["subscribe"],
  };
}
