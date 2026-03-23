export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/admin/reports/route.ts

import { prisma } from "@/lib/db";
import {
  ok,
  badRequest,
  notFound,
  forbidden,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ResolveSchema = z.object({
  reportId: z.string().cuid(),
  action: z.enum(["resolve", "dismiss", "escalate"]),
  resolution: z.string().min(5).max(1000).optional(),
});

// ---- GET /api/admin/reports ----
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;
  if (user.role !== "ADMIN") return forbidden();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "OPEN";
  const severity = searchParams.get("severity");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = 25;

  const reports = await prisma.report.findMany({
    where: {
      status: status as "OPEN" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "DISMISSED",
      ...(severity && { severity: severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }),
    },
    orderBy: [
      { severity: "desc" }, // CRITICAL first
      { createdAt: "asc" }, // Oldest first within severity
    ],
    skip: (page - 1) * limit,
    take: limit,
    include: {
      filer: { select: { id: true, displayName: true, email: true } },
      subject: { select: { id: true, displayName: true, email: true, isBanned: true } },
      event: { select: { id: true, title: true, status: true } },
    },
  });

  const counts = await prisma.report.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return ok({ reports, counts });
});

// ---- PATCH /api/admin/reports — resolve/dismiss/escalate ----
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const { user: admin, response } = await requireUser(req);
  if (!admin) return response!;
  if (admin.role !== "ADMIN") return forbidden();

  const body = await req.json();
  const parseResult = ResolveSchema.safeParse(body);
  if (!parseResult.success) return badRequest("Invalid request");

  const { reportId, action, resolution } = parseResult.data;

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) return notFound("Report");

  const statusMap: Record<string, "RESOLVED" | "DISMISSED" | "INVESTIGATING"> = {
    resolve: "RESOLVED",
    dismiss: "DISMISSED",
    escalate: "INVESTIGATING",
  };

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      status: statusMap[action],
      resolvedAt: ["resolve", "dismiss"].includes(action) ? new Date() : undefined,
      resolvedBy: admin.id,
      resolution,
    },
  });

  await logAudit({
    userId: admin.id,
    action: `admin.report_${action}d`,
    entity: "Report",
    entityId: reportId,
    metadata: { resolution },
    req,
  });

  return ok(updated);
});
