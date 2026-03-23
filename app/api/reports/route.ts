export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/reports/route.ts

import { prisma } from "@/lib/db";
import {
  created,
  forbidden,
  validationError,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { rateLimit, strictLimiter } from "@/lib/rate-limit";
import { CreateReportSchema } from "@/lib/validators";
import { notifyAdmins } from "@/lib/notifications";
import type { NextRequest } from "next/server";

// ---- POST /api/reports ----
// Rate limited hard: 5 reports per hour per user
// CRITICAL reports trigger immediate admin notification

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const limited = await rateLimit(req, strictLimiter, `report:${user.id}`);
  if (limited) return limited;

  const body = await req.json();
  const parseResult = CreateReportSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const data = parseResult.data;

  // Can't report yourself
  if (data.subjectId === user.id) {
    return forbidden("You cannot report yourself");
  }

  const report = await prisma.report.create({
    data: {
      filerId: user.id,
      subjectId: data.subjectId,
      eventId: data.eventId,
      type: data.type,
      severity: data.severity,
      description: data.description,
      status: data.severity === "CRITICAL" ? "INVESTIGATING" : "OPEN",
    },
  });

  // Critical reports wake up admins immediately
  if (data.severity === "CRITICAL" || data.severity === "HIGH") {
    await notifyAdmins({
      type: "HIGH_SEVERITY_REPORT",
      reportId: report.id,
      severity: data.severity,
      reporterId: user.id,
      description: data.description,
    });
  }

  await logAudit({
    userId: user.id,
    action: "report.filed",
    entity: "Report",
    entityId: report.id,
    metadata: {
      type: data.type,
      severity: data.severity,
      subjectId: data.subjectId,
      eventId: data.eventId,
    },
    req,
  });

  return created({
    reportId: report.id,
    message: "Report received. Our safety team will review it within 12 hours.",
  });
});
