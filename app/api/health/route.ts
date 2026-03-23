// apps/web/app/api/health/route.ts
// Simple health check. Returns 200 if the app is up and DB is reachable.
// Used by Vercel deployment checks, uptime monitors (e.g. BetterUptime), and DEPLOYMENT.md step.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // never cache

export async function GET() {
  const start = Date.now();

  try {
    // Ping the database with a lightweight query
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Health] DB check failed:", err);

    return NextResponse.json(
      {
        status: "degraded",
        db: "unreachable",
        latencyMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
