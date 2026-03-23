"use client";
// apps/web/app/(app)/events/[id]/manage/_components/PotluckCoordinator.tsx
// The potluck coordinator — host's view of what's coming to the table.
// Shows dishes by category, open slots, and flags imbalances.

import { useState } from "react";
import { useRouter } from "next/navigation";

type Dish = {
  id: string;
  dishName: string;
  category: string;
  servings: number | null;
  notes: string | null;
  confirmed: boolean;
  userId: string | null;
  user: { id: string; displayName: string } | null;
};

type Props = {
  eventId: string;
  dishes: Dish[];
  confirmedGuestCount: number;
  isHost: boolean;
};

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; targetRatio: number }> = {
  APPETIZER:     { label: "Appetizers",    emoji: "🫒", targetRatio: 0.3 },
  MAIN:          { label: "Mains",         emoji: "🍲", targetRatio: 0.4 },
  SIDE:          { label: "Sides",         emoji: "🥗", targetRatio: 0.4 },
  DESSERT:       { label: "Desserts",      emoji: "🍮", targetRatio: 0.2 },
  BREAD:         { label: "Bread",         emoji: "🍞", targetRatio: 0.15 },
  DRINK:         { label: "Drinks",        emoji: "🍷", targetRatio: 0.25 },
  NON_ALCOHOLIC: { label: "Non-Alcoholic", emoji: "🧃", targetRatio: 0.2 },
  CONDIMENT:     { label: "Condiments",    emoji: "🧂", targetRatio: 0.1 },
  OTHER:         { label: "Other",         emoji: "🍴", targetRatio: 0.1 },
};

export default function PotluckCoordinator({
  eventId, dishes: initialDishes, confirmedGuestCount, isHost,
}: Props) {
  const router = useRouter();
  const [dishes, setDishes] = useState(initialDishes);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    dishName: "", category: "MAIN", servings: "", notes: "",
  });

  const byCategory = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
    acc[cat] = dishes.filter((d) => d.category === cat);
    return acc;
  }, {} as Record<string, Dish[]>);

  // Categories with at least one dish or that need attention
  const relevantCategories = Object.keys(CATEGORY_CONFIG).filter(
    (cat) => byCategory[cat].length > 0 || ["MAIN", "SIDE", "DRINK"].includes(cat)
  );

  async function addDish() {
    const res = await fetch(`/api/events/${eventId}/dishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        servings: Number(form.servings) || undefined,
      }),
    });
    if (res.ok) {
      const json = await res.json() as any;
      setDishes((d) => [...d, json.data]);
      setAdding(false);
      setForm({ dishName: "", category: "MAIN", servings: "", notes: "" });
    }
  }

  async function removeDish(dishId: string) {
    setDeleting(dishId);
    const res = await fetch(`/api/events/${eventId}/dishes?dishId=${dishId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDishes((d) => d.filter((x) => x.id !== dishId));
    }
    setDeleting(null);
  }

  // Balance analysis
  const totalServings = dishes.reduce((acc, d) => acc + (d.servings ?? 4), 0);
  const servingsPerPerson = confirmedGuestCount > 0
    ? (totalServings / confirmedGuestCount).toFixed(1)
    : "—";

  const mainCount = byCategory["MAIN"]?.length ?? 0;
  const drinkCount = (byCategory["DRINK"]?.length ?? 0) + (byCategory["NON_ALCOHOLIC"]?.length ?? 0);

  const warnings: string[] = [];
  if (confirmedGuestCount > 0) {
    if (mainCount === 0) warnings.push("No main dishes yet — add a suggestion for guests");
    if (drinkCount === 0) warnings.push("No drinks assigned — make sure water is covered");
    if (dishes.length < Math.ceil(confirmedGuestCount * 0.7)) {
      warnings.push(`Only ${dishes.length} dishes for ${confirmedGuestCount} guests — you may need more`);
    }
  }

  return (
    <section className="bg-white border border-stone-100 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-stone-900">Potluck Coordinator</h2>
        {isHost && (
          <button
            onClick={() => setAdding((a) => !a)}
            className="text-sm text-[#C2714F] hover:underline"
          >
            {adding ? "Cancel" : "+ Add dish slot"}
          </button>
        )}
      </div>

      {/* Summary stats */}
      <div className="flex gap-4 text-sm text-stone-500 mb-4">
        <span>{dishes.length} dishes total</span>
        <span>~{servingsPerPerson} servings/person</span>
        <span>{confirmedGuestCount} confirmed guests</span>
      </div>

      {/* Warnings */}
      {warnings.map((w) => (
        <div key={w} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800 mb-3">
          ⚠ {w}
        </div>
      ))}

      {/* Add dish form */}
      {adding && (
        <div className="bg-stone-50 rounded-xl p-4 mb-4 space-y-3">
          <input
            placeholder="Dish name *"
            value={form.dishName}
            onChange={(e: any) => setForm((f) => ({ ...f, dishName: e.target.value }))}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.category}
              onChange={(e: any) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            >
              {Object.entries(CATEGORY_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Servings"
              value={form.servings}
              min={1}
              max={100}
              onChange={(e: any) => setForm((f) => ({ ...f, servings: e.target.value }))}
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <textarea
            placeholder="Allergen notes (optional)"
            value={form.notes}
            onChange={(e: any) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
          />
          <button
            onClick={addDish}
            disabled={!form.dishName}
            className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-stone-700 disabled:opacity-50"
          >
            Add to table
          </button>
        </div>
      )}

      {/* Dishes by category */}
      {dishes.length === 0 ? (
        <p className="text-sm text-stone-400 text-center py-6">
          No dishes yet. Add slots above or wait for guests to sign up.
        </p>
      ) : (
        <div className="space-y-4">
          {relevantCategories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const catDishes = byCategory[cat] ?? [];
            const targetCount = Math.ceil(confirmedGuestCount * cfg.targetRatio);
            const isSparse = catDishes.length < targetCount && confirmedGuestCount > 0;

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{cfg.emoji}</span>
                  <span className="text-sm font-medium text-stone-700">{cfg.label}</span>
                  <span className="text-xs text-stone-400">
                    {catDishes.length}
                    {confirmedGuestCount > 0 && ` / ~${targetCount} suggested`}
                  </span>
                  {isSparse && catDishes.length === 0 && (
                    <span className="text-xs text-amber-600">needs dishes</span>
                  )}
                </div>

                {catDishes.length === 0 ? (
                  <p className="text-xs text-stone-300 italic pl-6">None yet</p>
                ) : (
                  <ul className="space-y-1.5">
                    {catDishes.map((d) => (
                      <li key={d.id}
                        className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-stone-900">{d.dishName}</span>
                          {d.servings && (
                            <span className="text-stone-400 ml-2 text-xs">{d.servings} servings</span>
                          )}
                          {d.notes && (
                            <span className="text-amber-700 ml-2 text-xs">⚠ {d.notes}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-stone-400">
                            {d.user?.displayName ?? (
                              <span className="text-stone-300 italic">Open</span>
                            )}
                          </span>
                          {isHost && (
                            <button
                              onClick={() => removeDish(d.id)}
                              disabled={deleting === d.id}
                              className="text-stone-300 hover:text-red-400 text-xs"
                            >
                              {deleting === d.id ? "..." : "✕"}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
