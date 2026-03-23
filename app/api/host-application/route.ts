export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/host-application/route.ts
// Guests apply to become hosts. Admin reviews and approves/rejects.
// On approval: user.role → HOST, Clerk publicMetadata updated.

import { prisma } from "@/lib/db";
import {
  ok,
  created,
  forbidden,
  conflict,
  validationError,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { notifyAdmins, sendHostDecisionEmail } from "@/lib/notifications";
import { rateLimit, strictLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ApplicationSchema = z.object({
  motivation: z
    .string()
    .min(50, "Tell us a bit more — minimum 50 characters")
    .max(1000)
    .trim(),
  experience: z.string().max(500).trim().optional(),
  eventTypes: z
    .array(z.string())
    .min(1, "Select at least one event type")
    .max(7),
  city: z.string().min(2).max(100).trim(),
  state: z.string().length(2).toUpperCase(),
  hostingFrequency: z.enum(["once", "monthly", "biweekly", "weekly"]),
  agreeToGuidelines: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the host guidelines" }),
  }),
});

// Store applications in AuditLog with action "host.application"
// (avoids a separate table for MVP — migrate to its own model if volume warrants)

// ---- POST /api/host-application — submit application ----
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  // Already a host
  if (["HOST", "SUPER_HOST", "ADMIN"].includes(user.role)) {
    return conflict("You're already a host");
  }

  // Rate limit: 1 application per day per user
  const limited = await rateLimit(req, strictLimiter, `host-app:${user.id}`);
  if (limited) return limited;

  // Check for existing pending application
  const existing = await prisma.auditLog.findFirst({
    where: {
      userId: user.id,
      action: "host.application",
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // last 30 days
    },
  });

  if (existing) {
    return conflict(
      "You already have a pending application. Our team reviews applications within 48 hours."
    );
  }

  const body = await req.json();
  const parseResult = ApplicationSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  // Record application in audit log
  await logAudit({
    userId: user.id,
    action: "host.application",
    entity: "User",
    entityId: user.id,
    metadata: parseResult.data as Record<string, unknown>,
    req,
  });

  // Notify admins
  await notifyAdmins({
    type: "HIGH_SEVERITY_REPORT", // re-using admin notification — TODO: add HOST_APPLICATION type
    reportId: `host-app-${user.id}`,
    severity: "LOW",
    reporterId: user.id,
    description: `New host application from ${user.displayName} (${user.email}) in ${parseResult.data.city}, ${parseResult.data.state}. Motivation: ${parseResult.data.motivation.slice(0, 200)}`,
  });

  return created({
    message:
      "Application submitted. Our team reviews applications within 48 hours. You'll receive an email when a decision has been made.",
  });
});

// ---- PATCH /api/host-application — admin approves or rejects ----
// Body: { userId: string, action: "approve" | "reject", reason?: string }
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;
  if (user.role !== "ADMIN") return forbidden();

  const { userId, action, reason } = await req.json() as {
    userId: string;
    action: "approve" | "reject";
    reason?: string;
  };

  const applicant = await prisma.user.findUnique({ where: { id: userId } });
  if (!applicant) return forbidden("User not found");

  if (action === "approve") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "HOST" },
    });

    // Sync role to Clerk publicMetadata
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      await client.users.updateUserMetadata(applicant.clerkId, {
        publicMetadata: { role: "HOST" },
      });
    } catch (err) {
      console.error("[Host approval] Clerk sync failed:", err);
    }

    await logAudit({
      userId: user.id,
      action: "host.approved",
      entity: "User",
      entityId: userId,
      metadata: { approvedBy: user.id },
      req,
    });

    sendHostDecisionEmail({
      applicantEmail: applicant.email,
      applicantName: applicant.displayName,
      approved: true,
    }).catch((err) => console.error("[Email] Host approval email failed:", err));

  } else {
    await logAudit({
      userId: user.id,
      action: "host.rejected",
      entity: "User",
      entityId: userId,
      metadata: { rejectedBy: user.id, reason },
      req,
    });

    sendHostDecisionEmail({
      applicantEmail: applicant.email,
      applicantName: applicant.displayName,
      approved: false,
    }).catch((err) => console.error("[Email] Host rejection email failed:", err));
  }

  return ok({ action, userId });
});
