export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/events/[id]/dishes/route.ts

import { prisma } from "@/lib/db";
import {
  ok,
  created,
  forbidden,
  notFound,
  validationError,
  requireUser,
  withErrorHandler,
} from "@/lib/api";
import { rateLimit, standardLimiter } from "@/lib/rate-limit";
import { CreateDishSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

type RouteCtx = { params: { id: string } };

// ---- GET /api/events/[id]/dishes ----
export const GET = withErrorHandler(async (_req: NextRequest, { params }: RouteCtx) => {
  const dishes = await prisma.dishAssignment.findMany({
    where: { eventId: params.id },
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    include: { user: { select: { id: true, displayName: true } } },
  });
  return ok(dishes);
});

// ---- POST /api/events/[id]/dishes — guest claims a dish slot ----
export const POST = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const limited = await rateLimit(req, standardLimiter, `dishes:${user.id}`);
  if (limited) return limited;

  // Must have a confirmed RSVP (or be the host)
  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return notFound("Event");

  const isHost = event.hostId === user.id;

  if (!isHost) {
    const rsvp = await prisma.rSVP.findUnique({
      where: { eventId_userId: { eventId: params.id, userId: user.id } },
    });
    if (!rsvp || rsvp.status !== "CONFIRMED") {
      return forbidden("You need a confirmed RSVP to add a dish");
    }
  }

  const body = await req.json();
  const parseResult = CreateDishSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const dish = await prisma.dishAssignment.create({
    data: {
      eventId: params.id,
      userId: user.id,
      ...parseResult.data,
      confirmed: isHost, // host-added dishes auto-confirm
    },
    include: { user: { select: { id: true, displayName: true } } },
  });

  return created(dish);
});

// ---- DELETE /api/events/[id]/dishes?dishId=xxx ----
export const DELETE = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const dishId = new URL(req.url).searchParams.get("dishId");
  if (!dishId) return notFound("Dish ID required");

  const dish = await prisma.dishAssignment.findUnique({ where: { id: dishId } });
  if (!dish || dish.eventId !== params.id) return notFound("Dish");

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  const isHost = event?.hostId === user.id;

  // Only dish owner or host can delete
  if (dish.userId !== user.id && !isHost) {
    return forbidden("You can only remove your own dish");
  }

  await prisma.dishAssignment.delete({ where: { id: dishId } });
  return ok({ message: "Dish removed" });
});
