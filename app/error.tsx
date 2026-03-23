"use client";
// apps/web/app/error.tsx
// Global error boundary for the Next.js app.
// Catches unhandled errors in server and client components.
// Sentry picks these up automatically via the DSN in next.config.ts.

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev — Sentry captures in production
    if (process.env.NODE_ENV === "development") {
      console.error("[Global Error]", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="text-4xl mb-6">🍽</div>
            <h1 className="text-xl font-semibold text-stone-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-stone-500 leading-relaxed mb-6">
              We hit an unexpected error. Our team has been notified.
              {error.digest && (
                <span className="block mt-2 text-xs text-stone-400 font-mono">
                  Error ID: {error.digest}
                </span>
              )}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                className="w-full bg-stone-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                Try again
              </button>
              <Link
                href="/dashboard"
                className="w-full border border-stone-200 text-stone-700 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors text-center"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
