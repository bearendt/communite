"use client";
// apps/web/app/(app)/profile/edit/page.tsx

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Profile = {
  displayName: string;
  bio: string;
  dietaryNotes: string;
  culturalBg: string;
};

export default function EditProfilePage() {
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [form, setForm] = useState<Profile>({
    displayName: "", bio: "", dietaryNotes: "", culturalBg: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((json) => {
        const d = json.data;
        setForm({
          displayName: d.displayName ?? "",
          bio: d.bio ?? "",
          dietaryNotes: d.dietaryNotes ?? "",
          culturalBg: d.culturalBg ?? "",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function set(key: keyof Profile, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: form.displayName.trim(),
        bio: form.bio.trim() || undefined,
        dietaryNotes: form.dietaryNotes.trim() || undefined,
        culturalBg: form.culturalBg.trim() || undefined,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const json = await res.json() as any;
      setError(json.error ?? "Failed to save");
      return;
    }

    setSaved(true);
    setTimeout(() => router.push("/dashboard"), 1200);
  }

  if (loading) {
    return (
      <main className="max-w-lg mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-stone-100 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <Link
        href="/dashboard"
        className="text-sm text-stone-400 hover:text-stone-600 mb-6 block"
      >
        ← Back to dashboard
      </Link>

      <h1 className="text-2xl font-semibold text-stone-900 mb-1">Edit profile</h1>
      <p className="text-sm text-stone-500 mb-8">
        This is how the community knows you.
      </p>

      <form onSubmit={save} className="space-y-5">
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
            onChange={(e: any) => set("displayName", e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Bio
          </label>
          <textarea
            maxLength={500}
            rows={3}
            value={form.bio}
            onChange={(e: any) => set("bio", e.target.value)}
            placeholder="What brings you to Communitē? What do you love to cook?"
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
          />
          <p className="text-xs text-stone-400 text-right mt-1">
            {form.bio.length}/500
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Dietary notes
          </label>
          <input
            type="text"
            maxLength={300}
            value={form.dietaryNotes}
            onChange={(e: any) => set("dietaryNotes", e.target.value)}
            placeholder="Nut allergy, vegetarian, gluten-free…"
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <p className="text-xs text-stone-400 mt-1">
            Shared with hosts when your RSVP is confirmed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Cultural background (optional)
          </label>
          <input
            type="text"
            maxLength={100}
            value={form.culturalBg}
            onChange={(e: any) => set("culturalBg", e.target.value)}
            placeholder="Ethiopian-American, third-generation Italian…"
            className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <p className="text-xs text-stone-400 mt-1">
            Helps connect you with cultural exchange events
          </p>
        </div>

        {/* Account fields (Clerk-managed — link to Clerk UI) */}
        <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
          <p className="font-medium text-stone-800">Account settings</p>
          <p className="text-stone-500">
            Email, password, and phone number are managed through your account
            settings.
          </p>
          <button
            type="button"
            onClick={() => clerkUser?.openUserProfile()}
            className="text-[#C2714F] hover:underline font-medium"
          >
            Manage account →
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {saved && (
          <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
            ✓ Profile saved! Redirecting…
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
