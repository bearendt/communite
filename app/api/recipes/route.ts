export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/recipes/route.ts

import { prisma } from "@/lib/db";
import {
  ok,
  created,
  forbidden,
  validationError,
  requireUser,
  logAudit,
  withErrorHandler,
} from "@/lib/api";
import { rateLimit, standardLimiter } from "@/lib/rate-limit";
import { CreateRecipeSchema } from "@/lib/validators";
import type { NextRequest } from "next/server";

// ---- GET /api/recipes — user's own recipes ----
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const recipes = await prisma.recipe.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return ok(recipes);
});

// ---- POST /api/recipes — create (Sunday Table only) ----
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  // Sunday Table gate
  if (user.tier !== "SUNDAY_TABLE" && user.role !== "ADMIN") {
    return forbidden(
      "Recipe Vault is a Sunday Table feature. Upgrade to preserve your recipes."
    );
  }

  const limited = await rateLimit(req, standardLimiter, `recipes:${user.id}`);
  if (limited) return limited;

  const body = await req.json();
  const parseResult = CreateRecipeSchema.safeParse(body);
  if (!parseResult.success) return validationError(parseResult.error);

  const recipe = await prisma.recipe.create({
    data: {
      userId: user.id,
      ...parseResult.data,
    },
  });

  await logAudit({
    userId: user.id,
    action: "recipe.created",
    entity: "Recipe",
    entityId: recipe.id,
    req,
  });

  return created(recipe);
});
