export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/tables/route.ts

import { prisma } from "@/lib/db";
import {
  ok, created, forbidden, validationError,
  requireUser, withErrorHandler,
} from "@/lib/api";
import { rateLimit, standardLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import type { NextRequest } from "next/server";

const CreateTableSchema = z.object({
  name: z.string().min(2).max(80).trim(),
  description: z.string().max(300).trim().optional(),
  topic: z.string().min(2).max(100).trim(),
  isPublic: z.boolean().default(false),
});

// ---- GET /api/tables — user's memberships ----
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const memberships = await prisma.tableMembership.findMany({
    where: { userId: user.id },
    include: {
      table: { include: { _count: { select: { memberships: true } } } },
    },
    orderBy: { joinedAt: "desc" },
  });

  return ok(memberships);
});

// ---- POST /api/tables — create (Sunday Table only) ----
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  if (user.tier !== "SUNDAY_TABLE" && user.role !== "ADMIN") {
    return forbidden("Private Tables is a Sunday Table feature");
  }

  const limited = await rateLimit(req, standardLimiter, `tables:${user.id}`);
  if (limited) return limited;

  const body = await req.json();
  const parseResult = CreateTableSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const table = await prisma.privateTable.create({
    data: {
      ...parseResult.data,
      memberships: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  return created(table);
});
