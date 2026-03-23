// apps/web/lib/api.ts
// Standardized API response helpers + error handling
// All API routes should use these instead of raw NextResponse.json()

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";

// ---- Standard response shapes ----

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "You don't have permission to do that") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(entity = "Resource") {
  return NextResponse.json({ error: `${entity} not found` }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

// ---- Zod validation error formatter ----

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: "Validation failed",
      details: error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    },
    { status: 422 }
  );
}

// ---- Route wrapper: catches all unhandled errors ----
// Usage: export const POST = withErrorHandler(async (req) => { ... })

type RouteHandler = (
  req: Request,
  ctx: { params: Record<string, string> }
) => Promise<NextResponse>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      // Zod errors should be caught in-route, but just in case
      if (err instanceof ZodError) {
        return validationError(err);
      }

      // Prisma unique constraint violation
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        return conflict("This record already exists");
      }

      // Log unexpected errors (Sentry will pick this up)
      console.error("[API Error]", err);

      return serverError();
    }
  };
}

// ---- Authorization helper ----
// Gets the internal User record from the Clerk userId header
// Throws 401 if not found

export async function requireUser(req: Request) {
  const clerkId = req.headers.get("x-clerk-user-id");

  if (!clerkId) {
    return { user: null, response: unauthorized() };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user || user.isBanned) {
    return { user: null, response: unauthorized("Account not found or suspended") };
  }

  return { user, response: null };
}

// ---- Audit logger ----

export async function logAudit(params: {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}) {
  const ip = params.req
    ? (params.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined)
    : undefined;

  const userAgent = params.req
    ? (params.req.headers.get("user-agent") ?? undefined)
    : undefined;

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata,
      ip,
      userAgent,
    },
  });
}
