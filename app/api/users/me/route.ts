export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/users/me/route.ts

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
import { UpdateUserProfileSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

// ---- GET /api/users/me ----
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  return ok({
    id: user.id,
    displayName: user.displayName,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
    tier: user.tier,
    trustScore: user.trustScore,
    phoneVerified: user.phoneVerified,
    idVerified: user.idVerified,
    dietaryNotes: user.dietaryNotes,
    culturalBg: user.culturalBg,
    createdAt: user.createdAt,
  });
});

// ---- PATCH /api/users/me ----
export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await req.json();
  const parseResult = UpdateUserProfileSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parseResult.data,
    select: {
      id: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      dietaryNotes: true,
      culturalBg: true,
    },
  });

  await logAudit({
    userId: user.id,
    action: "user.profile_updated",
    entity: "User",
    entityId: user.id,
    req,
  });

  return ok(updated);
});

// ---- DELETE /api/users/me — account deletion (GDPR) ----
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const clerkId = user.clerkId;

  // Soft-delete in Postgres first (Prisma middleware sets deletedAt)
  await prisma.user.delete({ where: { id: user.id } });

  await logAudit({
    userId: user.id,
    action: "user.account_deleted",
    entity: "User",
    entityId: user.id,
    req,
  });

  // Hard-delete from Clerk — do this after DB so audit log is recorded
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.deleteUser(clerkId);
  } catch (err) {
    // Non-fatal: DB record is soft-deleted, user can't sign in
    // Manual Clerk cleanup can follow from the Clerk dashboard
    console.error("[Clerk] Account deletion sync failed for clerkId:", clerkId, err);
  }

  return ok({ message: "Account deleted. You have been signed out." });
});
