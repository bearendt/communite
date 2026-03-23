"use client";
// apps/web/app/(app)/upgrade/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

const FEATURES = [
  { icon: "🎟", label: "Unlimited RSVPs", free: "2/month", premium: "Unlimited" },
  { icon: "⚡", label: "First Dibs", free: "—", premium: "24hr early access to new events" },
  { icon: "📖", label: "Recipe Vault", free: "—", premium: "Preserve & share recipes" },
  { icon: "✈️", label: "Traveler Mode", free: "—", premium: "Find events in any city" },
  { icon: "🏷", label: "Host Toolkit", free: "Basic", premium: "Conversation cards & themes" },
  { icon: "🪪", label: "Trusted Neighbor badge", free: "—", premium: "After ID verification" },
  { icon: "💬", label: "Private Tables", free: "—", premium: "Interest-based groups" },
  { icon: "🛡", label: "Safety features", free: "✓", premium: "✓ + priority support" },
];

export default function UpgradePage() {
  const router = useRouter();
  const [interval, setInterval] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });

    const json = await res.json() as any;

    if (!res.ok) {
      setError(json.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    // Redirect to Stripe Checkout
    window.location.href = json.data.url;
  }

  const monthlyPrice = interval === "annual" ? "5.00" : "6.99";
  const annualSaving = Math.round((6.99 * 12 - 60) / (6.99 * 12) * 100);

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-3xl mb-3">☀️</p>
        <h1 className="text-3xl font-semibold text-stone-900">Sunday Table</h1>
        <p className="text-stone-500 mt-2 max-w-md mx-auto">
          For people serious about community. Unlimited gatherings, your recipe legacy,
          and a seat at every table.
        </p>
      </div>

      {/* Pricing toggle */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <button
          onClick={() => setInterval("monthly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            interval === "monthly"
              ? "bg-stone-900 text-white"
              : "border border-stone-200 text-stone-600"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("annual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
            interval === "annual"
              ? "bg-stone-900 text-white"
              : "border border-stone-200 text-stone-600"
          }`}
        >
          Annual
          <span className="absolute -top-2 -right-2 text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">
            -{annualSaving}%
          </span>
        </button>
      </div>

      {/* Price card */}
      <div className="bg-stone-900 text-white rounded-2xl p-8 mb-6 text-center">
        <div className="mb-1">
          <span className="text-5xl font-bold">${monthlyPrice}</span>
          <span className="text-stone-400 text-lg">/mo</span>
        </div>
        {interval === "annual" && (
          <p className="text-stone-400 text-sm">Billed as $60/year · Save ${(6.99 * 12 - 60).toFixed(2)}</p>
        )}

        <div className="mt-4 bg-stone-800 rounded-xl px-4 py-3">
          <p className="text-sm text-stone-300">
            🎉 <strong className="text-white">14-day free trial.</strong> No charge until your trial ends.
            Cancel anytime.
          </p>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400 bg-red-900/30 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          onClick={startCheckout}
          disabled={loading}
          className="mt-6 w-full bg-white text-stone-900 font-semibold py-3 rounded-xl hover:bg-stone-100 disabled:opacity-50 transition-colors"
        >
          {loading ? "Redirecting…" : "Start free trial →"}
        </button>

        <p className="text-xs text-stone-500 mt-3">
          Secured by Stripe · Cancel anytime · No hidden fees
        </p>
      </div>

      {/* Feature comparison */}
      <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3 text-xs font-medium text-stone-500 uppercase tracking-wide px-4 py-3 border-b border-stone-100">
          <span>Feature</span>
          <span className="text-center">Free</span>
          <span className="text-center text-stone-900">Sunday Table</span>
        </div>
        {FEATURES.map((f) => (
          <div
            key={f.label}
            className="grid grid-cols-3 items-center px-4 py-3 border-b border-stone-50 last:border-0"
          >
            <span className="text-sm text-stone-700 flex items-center gap-2">
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </span>
            <span className="text-xs text-stone-400 text-center">{f.free}</span>
            <span className="text-xs text-stone-900 font-medium text-center">
              {f.premium}
            </span>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-stone-400 mt-6">
        Questions? Email{" "}
        <a href="mailto:team@communite.app" className="underline">
          team@communite.app
        </a>
      </p>
    </main>
  );
}
