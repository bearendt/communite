export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/admin/users/route.ts
// Admin-only user management endpoints.
// Protected by middleware (role=ADMIN check).
// All actions logged to AuditLog.

import { prisma } from "@/lib/db";
import {
  ok,
  badRequest,
  notFound,
  forbidden,
  validationError,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { rateLimit, strictLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import type { NextRequest } from "next/server";

const BanUserSchema = z.object({
  userId: z.string().cuid(),
  reason: z.string().min(10).max(500),
  durationDays: z.number().int().min(1).max(365).optional(), // undefined = permanent
});

const SearchSchema = z.object({
  q: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
});

// ---- GET /api/admin/users?q=search ----
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;
  if (user.role !== "ADMIN") return forbidden();

  const { searchParams } = new URL(req.url);
  const parseResult = SearchSchema.safeParse(Object.fromEntries(searchParams));
  if (!parseResult.success) return validationError(parseResult.error);

  const { q, page } = parseResult.data;
  const limit = 20;

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      tier: true,
      isBanned: true,
      bannedAt: true,
      bannedReason: true,
      trustScore: true,
      idVerified: true,
      phoneVerified: true,
      createdAt: true,
      _count: {
        select: {
          hostedEvents: true,
          rsvps: true,
          reportsFiled: true,
          reportsAbout: true,
        },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return ok(users);
});

// ---- POST /api/admin/users — ban or unban ----
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user: admin, response } = await requireUser(req);
  if (!admin) return response!;
  if (admin.role !== "ADMIN") return forbidden();

  const limited = await rateLimit(req, strictLimiter, `admin:${admin.id}`);
  if (limited) return limited;

  const body = await req.json() as { action: string } & Record<string, unknown>;

  if (body.action === "ban") {
    const parseResult = BanUserSchema.safeParse(body);
    if (!parseResult.success) return validationError(parseResult.error);

    const { userId, reason, durationDays } = parseResult.data;

    if (userId === admin.id) return badRequest("Cannot ban yourself");

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return notFound("User");
    if (target.role === "ADMIN") return forbidden("Cannot ban another admin");

    const bannedUntil = durationDays
      ? new Date(Date.now() + durationDays * 86400000)
      : null;

    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: reason,
        bannedBy: admin.id,
      },
    });

    // Sync ban to Clerk publicMetadata so middleware blocks them immediately
    // const { clerkClient } = await import("@clerk/nextjs/server");
    // await clerkClient.users.updateUserMetadata(target.clerkId, {
    //   publicMetadata: { banned: true, bannedReason: reason },
    // });

    await logAudit({
      userId: admin.id,
      action: "admin.user_banned",
      entity: "User",
      entityId: userId,
      metadata: { reason, durationDays, bannedUntil },
      req,
    });

    return ok({ message: `User ${target.displayName} banned` });
  }

  if (body.action === "unban") {
    const userId = body.userId as string;
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return notFound("User");

    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, bannedAt: null, bannedReason: null, bannedBy: null },
    });

    // Sync to Clerk
    // await clerkClient.users.updateUserMetadata(target.clerkId, {
    //   publicMetadata: { banned: false },
    // });

    await logAudit({
      userId: admin.id,
      action: "admin.user_unbanned",
      entity: "User",
      entityId: userId,
      req,
    });

    return ok({ message: `User ${target.displayName} unbanned` });
  }

  if (body.action === "set_role") {
    const { userId, role } = body as { userId: string; role: string };
    if (!["GUEST", "HOST", "SUPER_HOST", "ADMIN"].includes(role)) {
      return badRequest("Invalid role");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role: role as "GUEST" | "HOST" | "SUPER_HOST" | "ADMIN" },
    });

    await logAudit({
      userId: admin.id,
      action: "admin.role_changed",
      entity: "User",
      entityId: userId,
      metadata: { role },
      req,
    });

    return ok({ message: "Role updated" });
  }

  return badRequest("Unknown action");
});
