"use client";
// apps/web/app/(app)/profile/verify/page.tsx
// Launches Stripe Identity verification for the authenticated user.
// On completion Stripe fires a webhook → user.idVerified = true.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type VerifyStatus = "idle" | "loading" | "launched" | "success" | "error";

export default function VerifyIdentityPage() {
  const router = useRouter();
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function startVerification() {
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/identity/start", { method: "POST" });
      const json = await res.json() as any;

      if (!res.ok) {
        setError(json.error ?? "Couldn't start verification");
        setStatus("error");
        return;
      }

      // Load Stripe.js and launch the Identity modal
      const { clientSecret } = json.data;

      // Dynamically import Stripe to avoid SSR issues
      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );

      if (!stripe) {
        setError("Failed to load verification service");
        setStatus("error");
        return;
      }

      setStatus("launched");

      const { error: stripeError } = await stripe.verifyIdentity(clientSecret);

      if (stripeError) {
        if (stripeError.code === "session_cancelled") {
          // User closed the modal — not a hard error
          setStatus("idle");
        } else {
          setError(stripeError.message ?? "Verification failed");
          setStatus("error");
        }
        return;
      }

      // Success — webhook will update idVerified in the background
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-sm text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">
            Verification submitted
          </h1>
          <p className="text-sm text-stone-500 mb-6">
            Your documents have been submitted for review. Verification
            typically completes within a few minutes. Your profile will
            update automatically.
          </p>
          <Link
            href="/dashboard"
            className="bg-stone-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-12">
      <Link
        href="/dashboard"
        className="text-sm text-stone-400 hover:text-stone-600 mb-8 block"
      >
        ← Back
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 mb-2">
        Verify your identity
      </h1>
      <p className="text-stone-500 text-sm mb-8">
        Some hosts require ID-verified guests. Verification takes about 2
        minutes and uses your government-issued ID.
      </p>

      {/* What to expect */}
      <div className="bg-stone-50 rounded-2xl p-5 mb-8 space-y-3">
        <h2 className="text-sm font-semibold text-stone-900">What you'll need</h2>
        <ul className="space-y-2">
          {[
            "A government-issued photo ID (driver's license or passport)",
            "A device with a camera for a selfie",
            "About 2 minutes",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-stone-600">
              <span className="text-green-600 shrink-0 mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <div className="border-t border-stone-200 pt-3 mt-3">
          <p className="text-xs text-stone-400">
            Powered by{" "}
            <strong className="text-stone-600">Stripe Identity</strong>.
            Communitē never stores your ID documents. Verification results
            are confirmed as pass/fail only.
          </p>
        </div>
      </div>

      {/* Earn your badge */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏷</span>
          <div>
            <p className="text-sm font-semibold text-stone-900">
              Earn your Trusted Neighbor badge
            </p>
            <p className="text-xs text-stone-500 mt-1">
              ID verification unlocks your Trusted Neighbor badge, visible on
              your profile and accepted at events requiring verified guests.
              Available to Sunday Table members.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={startVerification}
        disabled={status === "loading" || status === "launched"}
        className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
      >
        {status === "loading"
          ? "Starting verification…"
          : status === "launched"
          ? "Verification in progress…"
          : "Start verification"}
      </button>

      <p className="text-xs text-stone-400 text-center mt-4">
        By continuing you agree to Stripe's{" "}
        <a
          href="https://stripe.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Privacy Policy
        </a>
        .
      </p>
    </main>
  );
}
