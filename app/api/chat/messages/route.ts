export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/chat/messages/route.ts
// Message persistence layer. Ably delivers messages in real-time;
// this endpoint writes them to Postgres for history + moderation.
//
// Flow:
//   Client sends message → POST here (validates auth + RSVP) →
//   Save to DB → Publish via Ably REST → Client receives via Ably subscription

import Ably from "ably";
import { prisma } from "@/lib/db";
import {
  ok,
  created,
  forbidden,
  badRequest,
  notFound,
  validationError,
  requireUser,
  withErrorHandler,
} from "@/lib/api";
import { rateLimit, standardLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import type { NextRequest } from "next/server";

function getAbly() { return new Ably.Rest(process.env.ABLY_API_KEY ?? "key:placeholder"); }

const SendMessageSchema = z.object({
  body: z.string().min(1).max(2000).trim(),
  channelType: z.enum(["EVENT", "DIRECT", "PRIVATE_TABLE"]),
  channelId: z.string().min(1).max(100), // eventId, userId (DM), or tableId
});

// ---- POST /api/chat/messages — send a message ----
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  // Rate limit: 30 messages per minute per user
  const limited = await rateLimit(req, standardLimiter, `chat:${user.id}`);
  if (limited) return limited;

  const body = await req.json();
  const parseResult = SendMessageSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const { body: msgBody, channelType, channelId } = parseResult.data;

  // ---- Authorization per channel type ----
  let ablyChannel: string;
  let eventId: string | undefined;

  if (channelType === "EVENT") {
    const event = await prisma.event.findUnique({ where: { id: channelId } });
    if (!event) return notFound("Event");
    if (["CANCELLED", "SUSPENDED"].includes(event.status)) {
      return forbidden("This event's chat is closed");
    }

    // Must be host or confirmed RSVP to chat in event channel
    const isHost = event.hostId === user.id;
    if (!isHost) {
      const rsvp = await prisma.rSVP.findUnique({
        where: { eventId_userId: { eventId: channelId, userId: user.id } },
      });
      if (!rsvp || rsvp.status !== "CONFIRMED") {
        return forbidden("You need a confirmed RSVP to chat in this event");
      }
    }

    ablyChannel = `event:${channelId}`;
    eventId = channelId;
  } else if (channelType === "DIRECT") {
    // DM: channelId is the recipient's userId
    const recipient = await prisma.user.findUnique({ where: { id: channelId } });
    if (!recipient) return notFound("User");
    // Canonical DM channel: sorted user IDs so both parties use the same channel
    const [a, b] = [user.id, channelId].sort();
    ablyChannel = `dm:${a}:${b}`;
  } else if (channelType === "PRIVATE_TABLE") {
    const membership = await prisma.tableMembership.findUnique({
      where: { tableId_userId: { tableId: channelId, userId: user.id } },
    });
    if (!membership) return forbidden("You're not a member of this table");
    ablyChannel = `table:${channelId}`;
  } else {
    return badRequest("Invalid channel type");
  }

  // ---- Persist to DB ----
  const message = await prisma.message.create({
    data: {
      senderId: user.id,
      channelId,
      channelType,
      body: msgBody,
      eventId,
    },
    select: {
      id: true,
      body: true,
      channelId: true,
      channelType: true,
      createdAt: true,
      sender: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
    },
  });

  // ---- Publish to Ably ----
  // This triggers real-time delivery to all subscribers
  try {
    const channel = getAbly().channels.get(ablyChannel);
    await channel.publish("message", {
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      sender: message.sender,
    });
  } catch (err) {
    // Message saved to DB even if Ably publish fails
    // Clients can re-fetch history from GET endpoint
    console.error("[Ably] Publish failed:", err);
  }

  return created(message);
});

// ---- GET /api/chat/messages?channelId=xxx&channelType=EVENT&before=cursor ----
// Paginated message history — most recent first
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channelId");
  const channelType = searchParams.get("channelType") as "EVENT" | "DIRECT" | "PRIVATE_TABLE" | null;
  const before = searchParams.get("before"); // cursor: ISO date string
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);

  if (!channelId || !channelType) return badRequest("channelId and channelType required");

  // Auth check for history access
  if (channelType === "EVENT") {
    const event = await prisma.event.findUnique({ where: { id: channelId } });
    if (!event) return notFound("Event");
    const isHost = event.hostId === user.id;
    if (!isHost) {
      const rsvp = await prisma.rSVP.findUnique({
        where: { eventId_userId: { eventId: channelId, userId: user.id } },
      });
      if (!rsvp || rsvp.status !== "CONFIRMED") {
        return forbidden("Confirmed RSVP required to view event chat");
      }
    }
  } else if (channelType === "PRIVATE_TABLE") {
    const membership = await prisma.tableMembership.findUnique({
      where: { tableId_userId: { tableId: channelId, userId: user.id } },
    });
    if (!membership) return forbidden("Not a table member");
  }

  const messages = await prisma.message.findMany({
    where: {
      channelId,
      channelType,
      isDeleted: false,
      ...(before && { createdAt: { lt: new Date(before) } }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      body: true,
      channelId: true,
      channelType: true,
      createdAt: true,
      sender: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });

  return ok({
    messages: messages.reverse(), // chronological for display
    hasMore: messages.length === limit,
    nextCursor: messages[0]?.createdAt?.toISOString(),
  });
});

// ---- DELETE /api/chat/messages?messageId=xxx — soft delete own message ----
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const messageId = new URL(req.url).searchParams.get("messageId");
  if (!messageId) return badRequest("messageId required");

  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) return notFound("Message");
  if (message.senderId !== user.id && user.role !== "ADMIN") {
    return forbidden("You can only delete your own messages");
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  // Broadcast deletion to channel subscribers
  try {
    const channel = getAbly().channels.get(`${message.channelType.toLowerCase()}:${message.channelId}`);
    await channel.publish("message:deleted", { id: messageId });
  } catch { /* non-fatal */ }

  return ok({ deleted: true });
});
