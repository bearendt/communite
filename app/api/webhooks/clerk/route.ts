export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/webhooks/clerk/route.ts
// Clerk sends events here when users are created, updated, or deleted.
// This is how Clerk → your Postgres DB stays in sync.
// Verified via Svix signature — do NOT remove the verification step.

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/api";

type ClerkUserEvent = {
  type:
    | "user.created"
    | "user.updated"
    | "user.deleted"
    | "session.created"
    | "session.ended";
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    phone_numbers: Array<{ phone_number: string; verified: boolean }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    public_metadata: Record<string, unknown>;
  };
};

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Misconfigured" }, { status: 500 });
  }

  // Verify signature via Svix
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const { type, data } = event;

  // ---- Handle events ----

  try {
    if (type === "user.created") {
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id
      )?.email_address;

      const phone = data.phone_numbers[0];

      await prisma.user.create({
        data: {
          clerkId: data.id,
          email: primaryEmail!,
          displayName:
            [data.first_name, data.last_name].filter(Boolean).join(" ") ||
            "Community Member",
          avatarUrl: data.image_url,
          phone: phone?.phone_number,
          phoneVerified: phone?.verified ?? false,
        },
      });

      await logAudit({
        action: "user.created",
        entity: "User",
        metadata: { clerkId: data.id },
      });
    }

    if (type === "user.updated") {
      const primaryEmail = data.email_addresses.find(
        (e) => e.id === data.primary_email_address_id
      )?.email_address;

      const phone = data.phone_numbers[0];
      const meta = data.public_metadata;

      await prisma.user.update({
        where: { clerkId: data.id },
        data: {
          email: primaryEmail,
          phone: phone?.phone_number,
          phoneVerified: phone?.verified ?? false,
          avatarUrl: data.image_url,
          // Sync role and ban status from Clerk publicMetadata
          // (set these in Clerk dashboard or via admin API)
          ...(meta?.role && { role: meta.role as string }),
          ...(typeof meta?.banned === "boolean" && { isBanned: meta.banned }),
          ...(typeof meta?.idVerified === "boolean" && {
            idVerified: meta.idVerified,
          }),
        },
      });
    }

    if (type === "user.deleted") {
      // Soft-delete — Prisma middleware converts this to { deletedAt: now }
      await prisma.user.delete({
        where: { clerkId: data.id },
      });

      await logAudit({
        action: "user.deleted",
        entity: "User",
        metadata: { clerkId: data.id },
      });
    }
  } catch (err) {
    console.error(`[Clerk Webhook] Failed to handle ${type}:`, err);
    // Return 200 so Clerk doesn't retry — log and investigate separately
    return NextResponse.json({ received: true, error: "Processing failed" });
  }

  return NextResponse.json({ received: true });
}
