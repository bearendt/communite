export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/events/route.ts

import { prisma } from "@/lib/db";
import {
  ok,
  created,
  forbidden,
  validationError,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { rateLimit, standardLimiter } from "@/lib/rate-limit";
import { CreateEventSchema, EventQuerySchema } from "@/lib/validators";
import { getNearbyEvents } from "@/lib/proximity";
import type { NextRequest } from "next/server";

// ---- GET /api/events — public event discovery ----
// If lat/lng provided: uses PostGIS ST_DWithin (falls back to haversine)
// Otherwise: returns paginated upcoming events ordered by date

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const parseResult = EventQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parseResult.success) return validationError(parseResult.error);

  const { lat, lng, radiusKm, eventType, from, to, page, limit } = parseResult.data;

  // Proximity path — PostGIS query
  if (lat !== undefined && lng !== undefined) {
    const events = await getNearbyEvents({
      lat, lng, radiusKm, eventType, from, to, page, limit,
    });
    return ok({ events, page, limit });
  }

  // Non-location path — paginated list
  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isPrivate: false,
      startsAt: { gte: from ?? new Date(), ...(to ? { lte: to } : {}) },
      ...(eventType ? { eventType: eventType as never } : {}),
    },
    take: limit,
    skip: (page - 1) * limit,
    orderBy: { startsAt: "asc" },
    select: {
      id: true, title: true, description: true, eventType: true,
      theme: true, maxGuests: true, city: true, state: true,
      lat: true, lng: true, startsAt: true, endsAt: true,
      isPrivate: true, requiresIdVerif: true,
      host: { select: { id: true, displayName: true, avatarUrl: true, trustScore: true, role: true } },
      _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
    },
  });

  return ok({
    events: events.map((e) => ({
      ...e,
      spotsLeft: Math.max(0, e.maxGuests - e._count.rsvps),
    })),
    page,
    limit,
  });
});

// ---- POST /api/events — create event (HOST role required) ----

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const limited = await rateLimit(req, standardLimiter, `events:${user.id}`);
  if (limited) return limited;

  if (!["HOST", "SUPER_HOST", "ADMIN"].includes(user.role)) {
    return forbidden(
      "You need to be a verified host to create events. Apply in your profile settings."
    );
  }

  const body = await req.json();
  const parseResult = CreateEventSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const event = await prisma.event.create({
    data: { hostId: user.id, ...parseResult.data, status: "DRAFT" },
  });

  await logAudit({
    userId: user.id,
    action: "event.created",
    entity: "Event",
    entityId: event.id,
    req,
  });

  return created(event);
});
