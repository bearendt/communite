// apps/web/app/onboarding/page.tsx
// First run after sign-up: complete profile, verify phone
"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState<"profile" | "phone" | "done">("profile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    displayName: user?.fullName ?? "",
    bio: "",
    dietaryNotes: "",
  });

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const json = await res.json() as any;
        throw new Error(json.error ?? "Failed to save profile");
      }

      setStep("phone");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    router.push("/dashboard");
    return null;
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-stone-900">
            {step === "profile" ? "Tell us about yourself" : "Verify your phone"}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {step === "profile"
              ? "This is how other community members will know you."
              : "Required to RSVP or host events. We never share your number."}
          </p>

          {/* Progress dots */}
          <div className="flex gap-2 mt-4">
            <div className="h-1.5 w-12 rounded-full bg-stone-900" />
            <div
              className={`h-1.5 w-12 rounded-full ${
                step === "phone" ? "bg-stone-900" : "bg-stone-200"
              }`}
            />
          </div>
        </div>

        {step === "profile" && (
          <form onSubmit={submitProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Display name *
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={form.displayName}
                onChange={(e: any) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                placeholder="How you'll appear to others"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Short bio
              </label>
              <textarea
                maxLength={500}
                value={form.bio}
                onChange={(e: any) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
                placeholder="What brings you to Communitē?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Dietary notes
              </label>
              <input
                type="text"
                maxLength={300}
                value={form.dietaryNotes}
                onChange={(e: any) =>
                  setForm((f) => ({ ...f, dietaryNotes: e.target.value }))
                }
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                placeholder="Allergies, preferences, restrictions..."
              />
              <p className="mt-1 text-xs text-stone-400">
                Shared with hosts when your RSVP is confirmed
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : "Continue"}
            </button>
          </form>
        )}

        {step === "phone" && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Phone verification is handled securely via your account settings.
              Clerk sends a one-time code to your number — we never store it.
            </p>
            {/* Clerk's phone verification UI is embedded via UserProfile or
                a custom flow using useUser().user.createPhoneNumber() */}
            <button
              onClick={() => setStep("done")}
              className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              I'll verify later
            </button>
            <button
              onClick={() => {
                // Trigger Clerk phone verification flow
                // user?.createPhoneNumber({ phoneNumber }) then verify
                setStep("done");
              }}
              className="w-full border border-stone-200 text-stone-700 rounded-lg py-2.5 text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              Verify phone now
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
