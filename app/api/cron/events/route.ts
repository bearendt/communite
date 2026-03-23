// apps/web/app/api/cron/events/route.ts
// Vercel Cron Job — runs every 30 minutes.
// 1. Auto-completes ACTIVE events whose endsAt has passed
// 2. Auto-publishes DRAFT events whose startsAt is < 15min away (safety net)
// 3. Queues review prompts to all confirmed participants
//
// Schedule in vercel.json:
//   { "crons": [{ "path": "/api/cron/events", "schedule": "*/30 * * * *" }] }
//
// Protected by CRON_SECRET header — Vercel injects this automatically.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendReviewReminderEmail } from "@/lib/notifications";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel cron call
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { completed: 0, reviewsQueued: 0, errors: 0 };

  // ---- 1. Auto-complete ACTIVE events that have ended ----
  const expiredEvents = await prisma.event.findMany({
    where: {
      status: "ACTIVE",
      endsAt: { lte: now },
    },
    include: {
      host: { select: { id: true, displayName: true } },
      rsvps: {
        where: { status: "CONFIRMED" },
        include: {
          user: { select: { id: true, displayName: true } },
        },
      },
    },
  });

  for (const event of expiredEvents) {
    try {
      // Mark as COMPLETED
      await prisma.event.update({
        where: { id: event.id },
        data: { status: "COMPLETED", safetyCode: null },
      });

      await prisma.safetyLog.create({
        data: {
          eventId: event.id,
          type: "EVENT_ENDED",
          payload: { autoCompleted: true, completedAt: now },
        },
      });

      results.completed++;

      // ---- 2. Queue review prompts via email ----
      const participants = event.rsvps.map((r) => r.user);

      // Each confirmed guest reviews the host
      for (const guest of participants) {
        try {
          const guestRecord = await prisma.user.findUnique({
            where: { id: guest.id },
            select: { email: true },
          });
          if (guestRecord) {
            await sendReviewReminderEmail({
              recipientEmail: guestRecord.email,
              recipientName: guest.displayName,
              eventTitle: event.title,
              eventId: event.id,
              subjectId: event.host.id,
              subjectName: event.host.displayName,
              role: "host",
            });
          }
          results.reviewsQueued++;
        } catch {
          results.errors++;
        }
      }

      // Host reviews each confirmed guest
      const hostRecord = await prisma.user.findUnique({
        where: { id: event.host.id },
        select: { email: true },
      });
      if (hostRecord) {
        for (const guest of participants) {
          try {
            await sendReviewReminderEmail({
              recipientEmail: hostRecord.email,
              recipientName: event.host.displayName,
              eventTitle: event.title,
              eventId: event.id,
              subjectId: guest.id,
              subjectName: guest.displayName,
              role: "guest",
            });
            results.reviewsQueued++;
          } catch {
            results.errors++;
          }
        }
      }
    } catch (err) {
      console.error(`[Cron] Failed to complete event ${event.id}:`, err);
      results.errors++;
    }
  }

  // ---- 3. Warn about PUBLISHED events starting soon with no confirmed guests ----
  const soonWithNoGuests = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      startsAt: {
        gte: now,
        lte: new Date(now.getTime() + 2 * 60 * 60 * 1000), // within 2 hours
      },
    },
    include: {
      host: { select: { id: true, displayName: true } },
      _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
    },
  });

  for (const event of soonWithNoGuests) {
    if (event._count.rsvps === 0) {
      console.warn(
        `[Cron] Event "${event.title}" (${event.id}) starts in < 2h with 0 confirmed guests`
      );
      // Optionally: notify host that no one has confirmed yet
    }
  }

  console.log("[Cron] events run:", results);
  return NextResponse.json({ ok: true, ...results });
}
