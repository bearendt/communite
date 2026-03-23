export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/reviews/route.ts

import { prisma } from "@/lib/db";
import {
  created,
  forbidden,
  badRequest,
  validationError,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { rateLimit, strictLimiter } from "@/lib/rate-limit";
import { CreateReviewSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

// ---- POST /api/reviews ----
// Only allowed after the event has status COMPLETED
// One review per author/subject/event triple

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const limited = await rateLimit(req, strictLimiter, `review:${user.id}`);
  if (limited) return limited;

  const body = await req.json();
  const parseResult = CreateReviewSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const data = parseResult.data;

  // Can't review yourself
  if (data.subjectId === user.id) {
    return forbidden("You cannot review yourself");
  }

  // If tied to an event, verify the event is completed and reviewer attended
  if (data.eventId) {
    const event = await prisma.event.findUnique({ where: { id: data.eventId } });

    if (!event) {
      return badRequest("Event not found");
    }

    if (event.status !== "COMPLETED") {
      return forbidden("Reviews can only be submitted after the event has ended");
    }

    // Reviewer must have attended (confirmed RSVP) or be the host
    const isHost = event.hostId === user.id;
    if (!isHost) {
      const rsvp = await prisma.rSVP.findUnique({
        where: { eventId_userId: { eventId: data.eventId, userId: user.id } },
      });
      if (!rsvp || rsvp.status !== "CONFIRMED") {
        return forbidden("You can only review people you shared a table with");
      }
    }
  }

  // Check for duplicate
  const existing = await prisma.review.findUnique({
    where: {
      authorId_subjectId_eventId: {
        authorId: user.id,
        subjectId: data.subjectId,
        eventId: data.eventId ?? "",
      },
    },
  });

  if (existing) {
    return forbidden("You've already reviewed this person for this event");
  }

  const review = await prisma.review.create({
    data: {
      authorId: user.id,
      subjectId: data.subjectId,
      eventId: data.eventId,
      rating: data.rating,
      body: data.body,
      reflections: data.reflections as object | undefined,
      isPublic: data.isPublic,
    },
  });

  // Recalculate subject's trust score (weighted average of recent reviews)
  await recalculateTrustScore(data.subjectId);

  await logAudit({
    userId: user.id,
    action: "review.created",
    entity: "Review",
    entityId: review.id,
    metadata: { subjectId: data.subjectId, rating: data.rating, eventId: data.eventId },
    req,
  });

  return created(review);
});

// Trust score = weighted average of ratings from last 50 reviews
// More recent reviews weighted more heavily via index position
async function recalculateTrustScore(userId: string) {
  const reviews = await prisma.review.findMany({
    where: { subjectId: userId, isFlagged: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { rating: true },
  });

  if (reviews.length === 0) return;

  // Linear decay weights: most recent review gets weight N, oldest gets weight 1
  const total = reviews.reduce(
    (acc, r, i) => {
      const weight = reviews.length - i;
      acc.weightedSum += r.rating * weight;
      acc.totalWeight += weight;
      return acc;
    },
    { weightedSum: 0, totalWeight: 0 }
  );

  const score = total.weightedSum / total.totalWeight;

  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: Math.round(score * 10) / 10 },
  });
}
