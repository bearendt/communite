export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// apps/web/app/api/users/push-token/route.ts
// Registers or removes an Expo push token for the authenticated user.
// Called by the mobile app on startup (register) and sign-out (remove).

import { prisma } from "@/lib/db";
import {
  ok,
  badRequest,
  requireUser,
  withErrorHandler,
} from "@/lib/api";
import { z } from "zod";
import type { NextRequest } from "next/server";

const RegisterSchema = z.object({
  token: z
    .string()
    .min(10)
    .refine(
      (t) => t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken["),
      "Invalid Expo push token format"
    ),
});

// ---- POST /api/users/push-token — register token ----
export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  const body = await req.json();
  const parseResult = RegisterSchema.safeParse(body);
  if (!parseResult.success) {
    return badRequest("Invalid push token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { expoPushToken: parseResult.data.token },
  });

  return ok({ registered: true });
});

// ---- DELETE /api/users/push-token — remove token on sign-out ----
export const DELETE = withErrorHandler(async (req: NextRequest) => {
  const { user, response } = await requireUser(req);
  if (!user) return response!;

  await prisma.user.update({
    where: { id: user.id },
    data: { expoPushToken: null },
  });

  return ok({ removed: true });
});
