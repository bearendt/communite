"use client";
import React, { useState } from "react";

type Dish = {
  id: string;
  dishName: string;
  category: string;
  servings: number | null;
  notes: string | null;
  confirmed: boolean;
  user: { id: string; displayName: string } | null;
};

type Props = {
  eventId: string;
  dishes: Dish[];
  isHost: boolean;
  viewerId: string | null;
};

const CATEGORIES = [
  "APPETIZER","MAIN","SIDE","DESSERT","DRINK",
  "NON_ALCOHOLIC","BREAD","CONDIMENT","OTHER",
];

export default function DishList({ eventId, dishes: initial, isHost, viewerId }: Props) {
  const [dishes, setDishes] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ dishName: "", category: "MAIN", servings: "", notes: "" });

  async function addDish() {
    const res = await fetch(`/api/events/${eventId}/dishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, servings: Number(form.servings) || undefined }),
    });
    if (res.ok) {
      const json = await res.json() as any;
      setDishes((d) => [...d, json.data]);
      setAdding(false);
      setForm({ dishName: "", category: "MAIN", servings: "", notes: "" });
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">What's on the Table</h2>
        {viewerId && (
          <button onClick={() => setAdding((a) => !a)}
            className="text-sm text-[#C2714F] underline">
            {adding ? "Cancel" : "+ Add your dish"}
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
          <input placeholder="Dish name" value={form.dishName}
            onChange={(e: any) => setForm((f) => ({ ...f, dishName: e.target.value }))}
            className="input" />
          <select value={form.category}
            onChange={(e: any) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="input">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input placeholder="Servings (optional)" type="number" value={form.servings}
            onChange={(e: any) => setForm((f) => ({ ...f, servings: e.target.value }))}
            className="input" />
          <textarea placeholder="Allergen notes (optional)" value={form.notes}
            onChange={(e: any) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="input" rows={2} />
          <button onClick={addDish}
            className="bg-[#C2714F] text-white px-4 py-2 rounded-lg text-sm">
            Add Dish
          </button>
        </div>
      )}

      {dishes.length === 0 ? (
        <p className="text-gray-400 text-sm">No dishes signed up yet. Be the first!</p>
      ) : (
        <ul className="space-y-2">
          {dishes.map((d) => (
            <li key={d.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex justify-between items-start">
              <div>
                <p className="font-medium text-sm">{d.dishName}</p>
                <p className="text-xs text-gray-400">
                  {d.category.replace(/_/g, " ")}
                  {d.servings ? ` · ${d.servings} servings` : ""}
                  {d.notes ? ` · ${d.notes}` : ""}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 shrink-0">
                {d.user?.displayName ?? "Open slot"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
