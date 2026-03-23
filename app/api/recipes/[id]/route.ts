export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/recipes/[id]/route.ts

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
import { CreateRecipeSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

type RouteCtx = { params: { id: string } };

// ---- GET /api/recipes/[id] ----
export const GET = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const clerkId = req.headers.get("x-clerk-user-id");
  const viewer = clerkId
    ? await prisma.user.findUnique({ where: { clerkId } })
    : null;

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, displayName: true } } },
  });

  if (!recipe) return notFound("Recipe");
  if (!recipe.isPublic && recipe.userId !== viewer?.id) {
    return notFound("Recipe"); // treat private recipes as not found for non-owners
  }

  return ok(recipe);
});

// ---- PATCH /api/recipes/[id] ----
export const PATCH = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const recipe = await prisma.recipe.findUnique({ where: { id: params.id } });
  if (!recipe) return notFound("Recipe");
  if (recipe.userId !== user.id) return forbidden("You can only edit your own recipes");

  const body = await req.json();
  const parseResult = CreateRecipeSchema.partial().safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const updated = await prisma.recipe.update({
    where: { id: params.id },
    data: parseResult.data,
  });

  await logAudit({
    userId: user.id,
    action: "recipe.updated",
    entity: "Recipe",
    entityId: params.id,
    req,
  });

  return ok(updated);
});

// ---- DELETE /api/recipes/[id] ----
export const DELETE = withErrorHandler(async (req: NextRequest, { params }: RouteCtx) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const recipe = await prisma.recipe.findUnique({ where: { id: params.id } });
  if (!recipe) return notFound("Recipe");
  if (recipe.userId !== user.id && user.role !== "ADMIN") {
    return forbidden("You can only delete your own recipes");
  }

  // Soft-delete via Prisma middleware
  await prisma.recipe.delete({ where: { id: params.id } });

  await logAudit({
    userId: user.id,
    action: "recipe.deleted",
    entity: "Recipe",
    entityId: params.id,
    req,
  });

  return ok({ deleted: true });
});
