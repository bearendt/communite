export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/events/[id]/route.ts

import { prisma } from "@/lib/db";
import {
  ok,
  forbidden,
  notFound,
  validationError,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { UpdateEventSchema } from "@/lib/validators";
import { sendEventCancelledEmail } from "@/lib/notifications";
import type { NextRequest } from "next/server";

type RouteCtx = { params: { id: string } };

// ---- GET /api/events/[id] ----
export const GET = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const clerkId = req.headers.get("x-clerk-user-id");
  const viewer = clerkId
    ? await prisma.user.findUnique({ where: { clerkId } })
    : null;

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, displayName: true, avatarUrl: true, trustScore: true, role: true } },
      rsvps: {
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      },
      dishAssignments: {
        include: { user: { select: { id: true, displayName: true } } },
        orderBy: [{ category: "asc" }, { createdAt: "asc" }],
      },
      _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
    },
  });

  if (!event || event.status === "CANCELLED") return notFound("Event");

  const isHost = viewer?.id === event.hostId;
  const viewerRSVP = viewer
    ? event.rsvps.find((r) => r.userId === viewer.id) ?? null
    : null;
  const isConfirmed = viewerRSVP?.status === "CONFIRMED";
  const showAddress = isHost || isConfirmed;

  // Strip address from non-confirmed viewers
  const { addressLine1, addressLine2, ...publicEvent } = event;

  return ok({
    ...publicEvent,
    ...(showAddress ? { addressLine1, addressLine2 } : {}),
    viewerRSVP,
    isHost,
  });
});

// ---- PATCH /api/events/[id] — host updates event (pre-publish only) ----
export const PATCH = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return notFound("Event");

  if (event.hostId !== user.id && user.role !== "ADMIN") {
    return forbidden("Only the host can edit this event");
  }

  if (event.status === "ACTIVE" || event.status === "COMPLETED") {
    return forbidden("Cannot edit an event that has already started");
  }

  const body = await req.json();
  const parseResult = UpdateEventSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const updated = await prisma.event.update({
    where: { id: params.id },
    data: parseResult.data,
  });

  await logAudit({
    userId: user.id,
    action: "event.updated",
    entity: "Event",
    entityId: params.id,
    metadata: parseResult.data as Record<string, unknown>,
    req,
  });

  return ok(updated);
});

// ---- POST /api/events/[id] — publish / cancel (action-based) ----
// Body: { action: "publish" | "cancel" }
export const POST = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return notFound("Event");

  if (event.hostId !== user.id && user.role !== "ADMIN") {
    return forbidden("Only the host can perform this action");
  }

  const { action } = await req.json() as { action: string };

  if (action === "publish") {
    if (event.status !== "DRAFT") {
      return forbidden(`Cannot publish an event with status: ${event.status}`);
    }
    const updated = await prisma.event.update({
      where: { id: params.id },
      data: { status: "PUBLISHED" },
    });
    await logAudit({ userId: user.id, action: "event.published", entity: "Event", entityId: params.id, req });
    return ok(updated);
  }

  if (action === "cancel") {
    if (["COMPLETED", "CANCELLED"].includes(event.status)) {
      return forbidden("Event is already completed or cancelled");
    }
    const updated = await prisma.event.update({
      where: { id: params.id },
      data: { status: "CANCELLED" },
    });
    await logAudit({ userId: user.id, action: "event.cancelled", entity: "Event", entityId: params.id, req });

    // Notify all confirmed guests of the cancellation (fire-and-forget)
    prisma.rSVP.findMany({
      where: { eventId: params.id, status: "CONFIRMED" },
      include: { user: { select: { email: true, displayName: true } } },
    }).then((rsvps) => {
      for (const rsvp of rsvps) {
        sendEventCancelledEmail({
          guestEmail: rsvp.user.email,
          guestName: rsvp.user.displayName,
          eventTitle: event.title,
          hostName: user.displayName,
        }).catch((err) => console.error("[Email] Cancellation email failed:", err));
      }
    }).catch(() => {});

    return ok(updated);
  }

  return notFound("Unknown action");
});
