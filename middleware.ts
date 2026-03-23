// apps/web/middleware.ts
// This file is the security perimeter for the entire app.
// Every request passes through here before hitting any route.

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/events(.*)",           // discovery is public; address hidden until RSVP confirmed
  "/api/webhooks/(.*)",    // Clerk + Stripe webhooks — authenticated via signature
  "/api/health",
  "/studio(.*)",           // Sanity Studio — protected separately via Sanity auth
]);

// Routes that require phone verification
const requiresPhone = createRouteMatcher([
  "/events/new",
  "/api/events",
  "/api/events/(.*)/rsvp",
]);

// Routes that require ID verification (Sunday Table premium + host-restricted events)
const requiresIdVerif = createRouteMatcher([
  "/api/events/(.*)/rsvp",  // checked contextually per event config
]);

// Admin-only routes
const isAdminRoute = createRouteMatcher([
  "/admin(.*)",
  "/api/admin/(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims } = await auth();

  // --- Block banned users at the middleware level ---
  // The "banned" claim is set via Clerk's publicMetadata sync (see webhook handler)
  const publicMeta = sessionClaims?.publicMetadata as
    | { banned?: boolean; role?: string }
    | undefined;

  if (userId && publicMeta?.banned) {
    return NextResponse.redirect(new URL("/banned", req.url));
  }

  // --- Admin route guard ---
  if (isAdminRoute(req)) {
    if (!userId || publicMeta?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  // --- Protect non-public routes ---
  if (!isPublicRoute(req) && !userId) {
    return NextResponse.redirect(
      new URL(`/sign-in?redirect_url=${encodeURIComponent(req.url)}`, req.url)
    );
  }

  // --- Phone verification gate ---
  if (requiresPhone(req) && userId) {
    const phoneVerified = sessionClaims?.publicMetadata as
      | { phoneVerified?: boolean }
      | undefined;
    if (!phoneVerified?.phoneVerified) {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Phone verification required" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/onboarding/verify-phone", req.url));
    }
  }

  // Attach userId to request headers for use in API routes
  // (avoids repeated auth() calls in route handlers)
  const requestHeaders = new Headers(req.headers);
  if (userId) {
    requestHeaders.set("x-clerk-user-id", userId);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
