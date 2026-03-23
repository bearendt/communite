export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/tables/[id]/membership/route.ts

import { prisma } from "@/lib/db";
import {
  ok, created, forbidden, notFound, conflict,
  requireUser, withErrorHandler,
} from "@/lib/api";
import type { NextRequest } from "next/server";

type RouteCtx = { params: { id: string } };

// ---- POST — join a public table ----
export const POST = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  if (user.tier !== "SUNDAY_TABLE" && user.role !== "ADMIN") {
    return forbidden("Private Tables is a Sunday Table feature");
  }

  const table = await prisma.privateTable.findUnique({ where: { id: params.id } });
  if (!table) return notFound("Table");
  if (!table.isPublic) return forbidden("This table is private — you need an invite");

  const existing = await prisma.tableMembership.findUnique({
    where: { tableId_userId: { tableId: params.id, userId: user.id } },
  });
  if (existing) return conflict("Already a member");

  const membership = await prisma.tableMembership.create({
    data: { tableId: params.id, userId: user.id, role: "MEMBER" },
  });

  return created(membership);
});

// ---- DELETE — leave a table ----
export const DELETE = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const membership = await prisma.tableMembership.findUnique({
    where: { tableId_userId: { tableId: params.id, userId: user.id } },
  });

  if (!membership) return notFound("Membership");
  if (membership.role === "OWNER") {
    return forbidden("Table owners cannot leave. Transfer ownership first.");
  }

  await prisma.tableMembership.delete({
    where: { tableId_userId: { tableId: params.id, userId: user.id } },
  });

  return ok({ left: true });
});
