"use client";
// apps/web/app/(app)/profile/become-host/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const EVENT_TYPES = [
  { value: "POTLUCK", label: "Traditional Potluck", emoji: "🍲" },
  { value: "WINE_TASTING", label: "Wine Tasting", emoji: "🍷" },
  { value: "FARM_TO_TABLE", label: "Farm-to-Table", emoji: "🌿" },
  { value: "BLUE_ZONE", label: "Blue Zone Dinner", emoji: "🫐" },
  { value: "CULTURAL_EXCHANGE", label: "Cultural Exchange", emoji: "🌍" },
  { value: "ETHICAL_DINING", label: "Ethical Dining", emoji: "♻️" },
  { value: "WELCOME_NEIGHBOR", label: "Welcome Neighbor", emoji: "🏘" },
];

const FREQUENCIES = [
  { value: "once", label: "Just once to try it" },
  { value: "monthly", label: "Monthly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "weekly", label: "Weekly" },
];

const HOST_GUIDELINES = [
  "My home (or venue) is safe, accessible, and reasonably clean",
  "I will never charge money for attendance",
  "I will confirm or decline RSVPs within 48 hours",
  "I will start the event and share the safety code when guests arrive",
  "I will not discriminate based on race, religion, nationality, gender, or sexual orientation",
  "I understand that violations may result in account suspension",
];

export default function BecomeHostPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    motivation: "",
    experience: "",
    eventTypes: [] as string[],
    city: "",
    state: "",
    hostingFrequency: "",
    agreeToGuidelines: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function toggleEventType(type: string) {
    setForm((f) => ({
      ...f,
      eventTypes: f.eventTypes.includes(type)
        ? f.eventTypes.filter((t) => t !== type)
        : [...f.eventTypes, type],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/host-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, agreeToGuidelines: form.agreeToGuidelines || undefined }),
    });

    const json = await res.json() as any;
    setLoading(false);

    if (!res.ok) {
      if (json.details) {
        setError(json.details.map((d: { message: string }) => d.message).join(". "));
      } else {
        setError(json.error ?? "Something went wrong");
      }
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🏠</div>
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">Application submitted</h1>
          <p className="text-stone-500 mb-6">
            Our team reviews applications within 48 hours. You'll receive an email when
            a decision has been made.
          </p>
          <Link href="/dashboard"
            className="bg-stone-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">Become a Host</h1>
        <p className="text-stone-500 mt-2">
          Hosts are the heart of Communitē. Tell us about yourself and what kind of
          gatherings you'd like to create.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        {/* Motivation */}
        <div>
          <label className="block text-sm font-semibold text-stone-900 mb-1">
            Why do you want to host?
          </label>
          <p className="text-xs text-stone-400 mb-2">
            Tell us what draws you to the idea of hosting community meals.
            What experience do you want to create?
          </p>
          <textarea
            required
            minLength={50}
            maxLength={1000}
            rows={4}
            value={form.motivation}
            onChange={(e: any) => setForm((f) => ({ ...f, motivation: e.target.value }))}
            placeholder="I've always believed that the best conversations happen around a shared table…"
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
          />
          <p className="text-xs text-stone-400 text-right mt-1">
            {form.motivation.length}/1000 · min 50 characters
          </p>
        </div>

        {/* Event types */}
        <div>
          <label className="block text-sm font-semibold text-stone-900 mb-1">
            What kind of gatherings would you host? *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => toggleEventType(t.value)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm text-left transition-colors ${
                  form.eventTypes.includes(t.value)
                    ? "border-stone-900 bg-stone-50 font-medium"
                    : "border-stone-100 hover:border-stone-300"
                }`}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Frequency */}
        <div>
          <label className="block text-sm font-semibold text-stone-900 mb-2">
            How often do you expect to host? *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, hostingFrequency: f.value }))}
                className={`p-3 rounded-xl border text-sm text-left transition-colors ${
                  form.hostingFrequency === f.value
                    ? "border-stone-900 bg-stone-50 font-medium"
                    : "border-stone-100 hover:border-stone-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">City *</label>
            <input
              required type="text" value={form.city}
              onChange={(e: any) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Charlottesville"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">State *</label>
            <input
              required type="text" maxLength={2} value={form.state}
              onChange={(e: any) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
              placeholder="VA"
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 uppercase"
            />
          </div>
        </div>

        {/* Host guidelines */}
        <div className="bg-stone-50 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-3">Host Guidelines</h3>
          <p className="text-xs text-stone-500 mb-4">
            By applying, you agree to uphold these standards at every gathering you host.
          </p>
          <ul className="space-y-2 mb-5">
            {HOST_GUIDELINES.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-green-600 mt-0.5 shrink-0">✓</span>
                {g}
              </li>
            ))}
          </ul>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.agreeToGuidelines}
              onChange={(e: any) => setForm((f) => ({ ...f, agreeToGuidelines: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-stone-900"
            />
            <span className="text-sm text-stone-700">
              I agree to these guidelines and understand that violations may result
              in suspension of my hosting privileges.
            </span>
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !form.agreeToGuidelines || form.eventTypes.length === 0 || !form.hostingFrequency}
          className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-700 disabled:opacity-40 transition-colors"
        >
          {loading ? "Submitting…" : "Submit application"}
        </button>

        <p className="text-xs text-stone-400 text-center">
          Applications are reviewed within 48 hours. You'll be notified by email.
        </p>
      </form>
    </main>
  );
}
