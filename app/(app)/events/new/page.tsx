"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        eventType: form.get("eventType"),
        maxGuests: Number(form.get("maxGuests")),
        addressLine1: form.get("addressLine1"),
        city: form.get("city"),
        state: form.get("state"),
        zip: form.get("zip"),
        lat: 38.0293,
        lng: -78.4767,
        startsAt: new Date(form.get("startsAt")).toISOString(),
        endsAt: new Date(form.get("endsAt")).toISOString(),
        isPrivate: false,
        requiresIdVerif: false,
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { setError(json.error ?? "Failed"); return; }
    router.push("/events/" + json.data.id + "/manage?created=true");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Host a gathering</h1>
      <form onSubmit={submit} className="space-y-4">
        <input name="title" placeholder="Event title" required className="w-full border rounded-xl px-3 py-2" />
        <select name="eventType" required className="w-full border rounded-xl px-3 py-2">
          <option value="POTLUCK">Potluck</option>
          <option value="FARM_TO_TABLE">Farm-to-Table</option>
          <option value="CULTURAL_EXCHANGE">Cultural Exchange</option>
          <option value="WINE_TASTING">Wine Tasting</option>
          <option value="BLUE_ZONE">Blue Zone Dinner</option>
          <option value="WELCOME_NEIGHBOR">Welcome Neighbor</option>
        </select>
        <textarea name="description" placeholder="Description (min 20 chars)" required minLength={20} rows={4} className="w-full border rounded-xl px-3 py-2" />
        <input name="maxGuests" type="number" defaultValue={10} min={2} max={50} required className="w-full border rounded-xl px-3 py-2" />
        <input name="addressLine1" placeholder="Street address" required className="w-full border rounded-xl px-3 py-2" />
        <div className="grid grid-cols-3 gap-2">
          <input name="city" placeholder="City" required className="border rounded-xl px-3 py-2" />
          <input name="state" placeholder="VA" maxLength={2} required className="border rounded-xl px-3 py-2" />
          <input name="zip" placeholder="ZIP" required className="border rounded-xl px-3 py-2" />
        </div>
        <input name="startsAt" type="datetime-local" required className="w-full border rounded-xl px-3 py-2" />
        <input name="endsAt" type="datetime-local" required className="w-full border rounded-xl px-3 py-2" />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium">
          {loading ? "Creating..." : "Save as draft"}
        </button>
      </form>
    </main>
  );
}
