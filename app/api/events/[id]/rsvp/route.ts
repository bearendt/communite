export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/events/[id]/rsvp/route.ts

import { prisma } from "@/lib/db";
import {
  ok,
  created,
  badRequest,
  forbidden,
  notFound,
  conflict,
  validationError,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { sendRSVPConfirmedEmail } from "@/lib/notifications";
import { rateLimit, standardLimiter } from "@/lib/rate-limit";
import { CreateRSVPSchema, UpdateRSVPSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

type RouteCtx = { params: { id: string } };

// ---- POST /api/events/[id]/rsvp — request to attend ----

export const POST = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const limited = await rateLimit(req, standardLimiter, `rsvp:${user.id}`);
  if (limited) return limited;

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: { _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } } },
  });

  if (!event || event.status === "CANCELLED" || event.status === "SUSPENDED") {
    return notFound("Event");
  }

  if (event.hostId === user.id) {
    return badRequest("You can't RSVP to your own event");
  }

  // Check ID verification requirement
  if (event.requiresIdVerif && !user.idVerified) {
    return forbidden(
      "This event requires ID verification. Complete verification in your profile to attend."
    );
  }

  // Enforce free tier RSVP cap (2/month)
  if (user.tier === "FREE") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRSVPs = await prisma.rSVP.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfMonth },
        status: { in: ["PENDING", "CONFIRMED", "WAITLISTED"] },
      },
    });

    if (monthlyRSVPs >= 2) {
      return forbidden(
        "Free tier allows 2 RSVPs per month. Upgrade to Sunday Table for unlimited access."
      );
    }
  }

  // Check capacity
  const confirmedCount = event._count.rsvps;
  const isAtCapacity = confirmedCount >= event.maxGuests;

  // Check for existing RSVP
  const existing = await prisma.rSVP.findUnique({
    where: { eventId_userId: { eventId: params.id, userId: user.id } },
  });

  if (existing) {
    if (existing.status === "REMOVED") {
      return forbidden("You have been removed from this event by the host");
    }
    return conflict("You already have an RSVP for this event");
  }

  const body = await req.json();
  const parseResult = CreateRSVPSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const rsvp = await prisma.rSVP.create({
    data: {
      eventId: params.id,
      userId: user.id,
      status: isAtCapacity ? "WAITLISTED" : "PENDING",
      note: parseResult.data.note,
    },
  });

  await logAudit({
    userId: user.id,
    action: "rsvp.created",
    entity: "RSVP",
    entityId: rsvp.id,
    metadata: { eventId: params.id, status: rsvp.status },
    req,
  });

  return created({
    rsvp,
    message: isAtCapacity
      ? "You're on the waitlist. We'll notify you if a spot opens up."
      : "RSVP submitted. Waiting for host confirmation.",
  });
});

// ---- PATCH /api/events/[id]/rsvp — host confirms/declines a guest ----

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await req.json();
  const { guestId, status } = body as { guestId: string; status: string };

  const parseResult = UpdateRSVPSchema.safeParse({ status });
  if (!parseResult.success) return validationError(parseResult.error);

  // Verify requester is the event host
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return notFound("Event");
  if (event.hostId !== user.id && user.role !== "ADMIN") {
    return forbidden("Only the host can manage RSVPs");
  }

  const rsvp = await prisma.rSVP.findUnique({
    where: { eventId_userId: { eventId: params.id, userId: guestId } },
  });
  if (!rsvp) return notFound("RSVP");

  const updated = await prisma.rSVP.update({
    where: { eventId_userId: { eventId: params.id, userId: guestId } },
    data: { status: parseResult.data.status },
  });

  // Send confirmation email when host confirms a guest
  if (parseResult.data.status === "CONFIRMED") {
    const guest = await prisma.user.findUnique({
      where: { id: guestId },
      select: { email: true, displayName: true },
    });
    if (guest) {
      sendRSVPConfirmedEmail({
        guestEmail: guest.email,
        guestName: guest.displayName,
        eventTitle: event.title,
        eventId: event.id,
        startsAt: event.startsAt,
        addressLine1: event.addressLine1,
        city: event.city,
        state: event.state,
      }).catch((err) => console.error("[Email] RSVP confirmed email failed:", err));
    }
  }

  // If confirming: reveal address to the guest via their profile query
  // (address is included in the event detail query when RSVP status = CONFIRMED)

  await logAudit({
    userId: user.id,
    action: "rsvp.updated",
    entity: "RSVP",
    entityId: rsvp.id,
    metadata: { guestId, status: parseResult.data.status },
    req,
  });

  return ok(updated);
});

// ---- DELETE /api/events/[id]/rsvp — guest cancels their own RSVP ----

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const rsvp = await prisma.rSVP.findUnique({
    where: { eventId_userId: { eventId: params.id, userId: user.id } },
  });

  if (!rsvp) return notFound("RSVP");
  if (rsvp.userId !== user.id) return forbidden();

  await prisma.rSVP.update({
    where: { eventId_userId: { eventId: params.id, userId: user.id } },
    data: { status: "DECLINED" },
  });

  await logAudit({
    userId: user.id,
    action: "rsvp.cancelled",
    entity: "RSVP",
    entityId: rsvp.id,
    req,
  });

  return ok({ message: "RSVP cancelled" });
});
