"use client";
// apps/web/app/(app)/recipes/new/page.tsx
// Also used for editing: /recipes/[id]/edit (same component, pre-populated)

import { useState } from "react";
import { useRouter } from "next/navigation";

type Ingredient = { name: string; amount: string; unit: string };
type Step = { order: number; instruction: string };

type RecipeForm = {
  title: string;
  description: string;
  culturalNote: string;
  originCountry: string;
  servings: string;
  tags: string;
  isPublic: boolean;
  ingredients: Ingredient[];
  steps: Step[];
};

const EMPTY_FORM: RecipeForm = {
  title: "",
  description: "",
  culturalNote: "",
  originCountry: "",
  servings: "",
  tags: "",
  isPublic: false,
  ingredients: [{ name: "", amount: "", unit: "" }],
  steps: [{ order: 1, instruction: "" }],
};

type Props = {
  initialValues?: Partial<RecipeForm>;
  recipeId?: string; // if set, PATCH instead of POST
};

export default function RecipeForm({ initialValues, recipeId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<RecipeForm>({ ...EMPTY_FORM, ...initialValues });
  const [step, setStep] = useState<"basics" | "ingredients" | "method" | "story">("basics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = ["basics", "ingredients", "method", "story"] as const;
  const stepIndex = steps.indexOf(step);

  function updateField<K extends keyof RecipeForm>(key: K, value: RecipeForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Ingredients
  function addIngredient() {
    updateField("ingredients", [...form.ingredients, { name: "", amount: "", unit: "" }]);
  }
  function updateIngredient(i: number, field: keyof Ingredient, val: string) {
    const updated = form.ingredients.map((ing, idx) =>
      idx === i ? { ...ing, [field]: val } : ing
    );
    updateField("ingredients", updated);
  }
  function removeIngredient(i: number) {
    updateField("ingredients", form.ingredients.filter((_, idx) => idx !== i));
  }

  // Steps
  function addStep() {
    updateField("steps", [...form.steps, { order: form.steps.length + 1, instruction: "" }]);
  }
  function updateStep(i: number, instruction: string) {
    const updated = form.steps.map((s, idx) => idx === i ? { ...s, instruction } : s);
    updateField("steps", updated);
  }
  function removeStep(i: number) {
    updateField(
      "steps",
      form.steps.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 }))
    );
  }

  async function submit() {
    setLoading(true);
    setError(null);

    const validIngredients = form.ingredients.filter((i) => i.name.trim());
    const validSteps = form.steps.filter((s) => s.instruction.trim());

    if (!form.title.trim()) { setError("Title is required"); setLoading(false); return; }
    if (validIngredients.length === 0) { setError("Add at least one ingredient"); setLoading(false); return; }
    if (validSteps.length === 0) { setError("Add at least one step"); setLoading(false); return; }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      culturalNote: form.culturalNote.trim() || undefined,
      originCountry: form.originCountry.trim() || undefined,
      servings: form.servings ? Number(form.servings) : undefined,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      isPublic: form.isPublic,
      ingredients: validIngredients,
      steps: validSteps,
    };

    const url = recipeId ? `/api/recipes/${recipeId}` : "/api/recipes";
    const method = recipeId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json() as any;
    setLoading(false);

    if (!res.ok) {
      if (json.details) {
        setError(json.details.map((d: { message: string }) => d.message).join(", "));
      } else {
        setError(json.error ?? "Failed to save recipe");
      }
      return;
    }

    router.push(`/recipes/${json.data.id}`);
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-stone-900">
          {recipeId ? "Edit recipe" : "Add a recipe"}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Preserve the story behind your dish for the community.
        </p>

        {/* Progress */}
        <div className="flex items-center gap-2 mt-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => i < stepIndex && setStep(s)}
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i < stepIndex ? "bg-stone-900 text-white cursor-pointer hover:bg-stone-700"
                  : i === stepIndex ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-400"
                }`}
              >
                {i < stepIndex ? "✓" : i + 1}
              </button>
              <span className={`text-xs capitalize hidden sm:block ${i === stepIndex ? "text-stone-900 font-medium" : "text-stone-400"}`}>
                {s}
              </span>
              {i < steps.length - 1 && <div className="h-px w-6 bg-stone-200" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-stone-100 rounded-2xl p-6 space-y-5">
        {/* BASICS */}
        {step === "basics" && (
          <>
            <Field label="Recipe title *" value={form.title} onChange={(v) => updateField("title", v)}
              placeholder="Grandma's Lamb Stew" maxLength={150} />
            <Field label="Brief description" value={form.description}
              onChange={(v) => updateField("description", v)}
              placeholder="What makes this dish special?" textarea rows={3} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Country of origin" value={form.originCountry}
                onChange={(v) => updateField("originCountry", v)} placeholder="Morocco" />
              <Field label="Servings" value={form.servings}
                onChange={(v) => updateField("servings", v)} placeholder="6" type="number" />
            </div>
            <Field label="Tags (comma-separated)" value={form.tags}
              onChange={(v) => updateField("tags", v)}
              placeholder="slow-cook, lamb, winter, family" />
            <Toggle label="Share publicly" description="Visible on your profile and to the community"
              checked={form.isPublic} onChange={(v) => updateField("isPublic", v)} />
          </>
        )}

        {/* INGREDIENTS */}
        {step === "ingredients" && (
          <>
            <p className="text-sm text-stone-500">
              List all ingredients. Allergens will be visible to guests at your events.
            </p>
            <div className="space-y-3">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={ing.amount} onChange={(e: any) => updateIngredient(i, "amount", e.target.value)}
                    placeholder="2" className={inputCls + " w-16 shrink-0"} />
                  <input value={ing.unit} onChange={(e: any) => updateIngredient(i, "unit", e.target.value)}
                    placeholder="cups" className={inputCls + " w-20 shrink-0"} />
                  <input value={ing.name} onChange={(e: any) => updateIngredient(i, "name", e.target.value)}
                    placeholder="all-purpose flour" className={inputCls + " flex-1"} />
                  {form.ingredients.length > 1 && (
                    <button onClick={() => removeIngredient(i)}
                      className="text-stone-300 hover:text-red-400 text-lg shrink-0">×</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addIngredient}
              className="text-sm text-[#C2714F] hover:underline">
              + Add ingredient
            </button>
          </>
        )}

        {/* METHOD */}
        {step === "method" && (
          <>
            <p className="text-sm text-stone-500">
              Write each step clearly. Be specific — readers should be able to follow along without guessing.
            </p>
            <div className="space-y-4">
              {form.steps.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center mt-1.5 shrink-0">
                    {s.order}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <textarea
                      value={s.instruction}
                      onChange={(e: any) => updateStep(i, e.target.value)}
                      rows={2}
                      placeholder={`Step ${s.order} instruction…`}
                      className={inputCls + " flex-1 resize-none"}
                    />
                    {form.steps.length > 1 && (
                      <button onClick={() => removeStep(i)}
                        className="text-stone-300 hover:text-red-400 text-lg self-start mt-1.5">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addStep} className="text-sm text-[#C2714F] hover:underline">
              + Add step
            </button>
          </>
        )}

        {/* STORY */}
        {step === "story" && (
          <>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                The story behind this dish
              </label>
              <p className="text-xs text-stone-400 mb-2">
                Where did this recipe come from? Who taught you? What memories does it carry?
                This is what makes the Recipe Vault more than just ingredients.
              </p>
              <textarea
                value={form.culturalNote}
                onChange={(e: any) => updateField("culturalNote", e.target.value)}
                rows={6}
                maxLength={1000}
                placeholder="My grandmother made this every Sunday in Casablanca. The secret is in the spice blend she brought from the market near her childhood home…"
                className={inputCls + " w-full resize-none"}
              />
              <p className="text-xs text-stone-300 text-right mt-1">
                {form.culturalNote.length}/1000
              </p>
            </div>
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {stepIndex > 0 && (
            <button onClick={() => setStep(steps[stepIndex - 1])}
              className="flex-1 border border-stone-200 text-stone-700 rounded-lg py-2.5 text-sm font-medium hover:bg-stone-50">
              Back
            </button>
          )}
          <button
            onClick={step === "story" ? submit : () => setStep(steps[stepIndex + 1])}
            disabled={loading}
            className="flex-1 bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : step === "story" ? (recipeId ? "Save changes" : "Save recipe") : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}

const inputCls = "rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900";

function Field({ label, value, onChange, placeholder, textarea, rows, maxLength, type }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; textarea?: boolean; rows?: number;
  maxLength?: number; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e: any) => onChange(e.target.value)}
          rows={rows ?? 3} maxLength={maxLength} placeholder={placeholder}
          className={`${inputCls} w-full resize-none`} />
      ) : (
        <input type={type ?? "text"} value={value} onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder} maxLength={maxLength}
          className={`${inputCls} w-full`} />
      )}
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className="text-xs text-stone-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button" role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none ${checked ? "bg-stone-900" : "bg-stone-200"}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition mt-0.5 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
