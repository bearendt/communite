"use client";
// apps/web/app/(app)/tables/_components/CreateTableButton.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTableButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", topic: "", isPublic: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!form.name.trim() || !form.topic.trim()) {
      setError("Name and topic are required");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json() as any;
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to create table");
      return;
    }

    setOpen(false);
    router.push(`/tables/${json.data.id}`);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
      >
        + New table
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Create a table</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
                <input
                  type="text"
                  maxLength={80}
                  value={form.name}
                  onChange={(e: any) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Cville Natural Wine Club"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Topic *</label>
                <input
                  type="text"
                  maxLength={100}
                  value={form.topic}
                  onChange={(e: any) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="Natural wine, low-intervention, skin-contact"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  maxLength={300}
                  rows={2}
                  value={form.description}
                  onChange={(e: any) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="What's this table for?"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900">Public table</p>
                  <p className="text-xs text-stone-500">Anyone can discover and join</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isPublic: !f.isPublic }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.isPublic ? "bg-stone-900" : "bg-stone-200"}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${form.isPublic ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-4">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setOpen(false); setError(null); }}
                className="flex-1 border border-stone-200 text-stone-700 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={loading}
                className="flex-1 bg-stone-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create table"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
