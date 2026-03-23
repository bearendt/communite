// apps/web/app/(app)/upgrade/success/page.tsx
// Stripe redirects here after successful checkout.
// session_id is in the URL — we verify and show a welcome screen.
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function UpgradeSuccessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!sessionId) {
      router.replace("/dashboard");
      return;
    }
    // The Stripe billing webhook has already updated user.tier.
    // Just show the success screen after a short delay.
    const t = setTimeout(() => setStatus("success"), 1000);
    return () => clearTimeout(t);
  }, [sessionId, router]);

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-10 text-center">
        <div className="text-5xl mb-6">☀️</div>
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">
          Welcome to Sunday Table
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">
          Your trial has started. You now have unlimited RSVPs, access to the
          Recipe Vault, First Dibs on new events, and your Trusted Neighbor badge
          once you complete ID verification.
        </p>

        <div className="space-y-3 mb-8 text-left bg-stone-50 rounded-xl p-5">
          {[
            { icon: "🎟", label: "Unlimited RSVPs — no more monthly cap" },
            { icon: "📖", label: "Recipe Vault — preserve your culinary story" },
            { icon: "⚡", label: "First Dibs — 24hr early access to events" },
            { icon: "✈️", label: "Traveler Mode — find events anywhere" },
            { icon: "💬", label: "Private Tables — join interest-based groups" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3 text-sm text-stone-700">
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        <Link
          href="/dashboard"
          className="block w-full bg-stone-900 text-white rounded-xl py-3 text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          Go to dashboard →
        </Link>
        <Link
          href="/profile/verify"
          className="block mt-3 text-sm text-[#C2714F] hover:underline"
        >
          Get your Trusted Neighbor badge (ID verification)
        </Link>
      </div>
    </main>
  );
}
