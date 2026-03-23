// apps/web/app/(app)/events/[id]/review/page.tsx
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type ReflectionKey = "wouldAttendAgain" | "feltWelcome" | "dishQuality" | "hostResponsiveness";

const REFLECTION_PROMPTS: Array<{
  key: ReflectionKey;
  question: string;
  type: "boolean" | "rating";
}> = [
  { key: "feltWelcome", question: "I felt genuinely welcomed", type: "boolean" },
  { key: "wouldAttendAgain", question: "I would share a table with this person again", type: "boolean" },
  { key: "dishQuality", question: "The food was thoughtfully prepared", type: "rating" },
  { key: "hostResponsiveness", question: "Communication was clear and timely", type: "rating" },
];

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const subjectId = searchParams.get("subject") ?? "";
  const subjectName = searchParams.get("name") ?? "your host";
  const isReviewingHost = searchParams.get("role") === "host";

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [reflections, setReflections] = useState<Record<ReflectionKey, boolean | number | undefined>>({
    feltWelcome: undefined,
    wouldAttendAgain: undefined,
    dishQuality: undefined,
    hostResponsiveness: undefined,
  });
  const [step, setStep] = useState<"reflections" | "rating" | "written" | "done">("reflections");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setReflection(key: ReflectionKey, value: boolean | number) {
    setReflections((r) => ({ ...r, [key]: value }));
  }

  const relevantPrompts = REFLECTION_PROMPTS.filter((p) =>
    isReviewingHost
      ? true
      : p.key !== "hostResponsiveness"
  );

  const allReflectionsAnswered = relevantPrompts.every(
    (p) => reflections[p.key] !== undefined
  );

  async function submit() {
    if (!rating || body.trim().length < 10) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        eventId: params.id,
        rating,
        body: body.trim(),
        reflections,
        isPublic: true,
      }),
    });

    const json = await res.json() as any;
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Failed to submit review");
      return;
    }

    setStep("done");
    setTimeout(() => router.push("/dashboard"), 2500);
  }

  if (step === "done") {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🙏</div>
          <h1 className="text-xl font-semibold text-stone-900">Thank you</h1>
          <p className="text-sm text-stone-500 mt-2">
            Your reflection helps build trust in the community.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-xl font-semibold text-stone-900 mb-1">
          Reflect on your gathering
        </h1>
        <p className="text-sm text-stone-500 mb-6">
          Sharing your experience with {subjectName} helps everyone at the table.
          These reflections are thoughtful — not just stars.
        </p>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {["reflections", "rating", "written"].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                ["reflections", "rating", "written"].indexOf(step) >= i
                  ? "bg-stone-900"
                  : "bg-stone-200"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Reflection prompts */}
        {step === "reflections" && (
          <div className="space-y-5">
            {relevantPrompts.map((prompt) => (
              <div key={prompt.key}>
                <p className="text-sm font-medium text-stone-800 mb-2">{prompt.question}</p>

                {prompt.type === "boolean" ? (
                  <div className="flex gap-3">
                    <ChoiceButton
                      label="Yes"
                      selected={reflections[prompt.key] === true}
                      onClick={() => setReflection(prompt.key, true)}
                    />
                    <ChoiceButton
                      label="No"
                      selected={reflections[prompt.key] === false}
                      onClick={() => setReflection(prompt.key, false)}
                    />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <ChoiceButton
                        key={n}
                        label={String(n)}
                        selected={reflections[prompt.key] === n}
                        onClick={() => setReflection(prompt.key, n)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => setStep("rating")}
              disabled={!allReflectionsAnswered}
              className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-40 transition-colors mt-2"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Star rating */}
        {step === "rating" && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-stone-800 mb-3">
                Overall, how was your experience with {subjectName}?
              </p>
              <div className="flex gap-3 justify-center py-4">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    className="text-4xl transition-transform hover:scale-110"
                  >
                    {n <= (hoverRating || rating) ? "⭐" : "☆"}
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-stone-500">
                  {["", "Disappointing", "Below expectations", "It was okay", "Good gathering", "Wonderful experience"][rating]}
                </p>
              )}
            </div>

            <button
              onClick={() => setStep("written")}
              disabled={!rating}
              className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-40 transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 3: Written reflection */}
        {step === "written" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-stone-800 mb-2">
                Share a brief reflection
              </p>
              <p className="text-xs text-stone-400 mb-3">
                What made this gathering memorable? What would help future guests?
              </p>
              <textarea
                value={body}
                onChange={(e: any) => setBody(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="The conversation flowed naturally and the homemade bread was..."
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 resize-none"
              />
              <p className="text-xs text-stone-300 text-right mt-1">
                {body.length}/1000 · min 10 characters
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={submit}
              disabled={loading || body.trim().length < 10}
              className="w-full bg-stone-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-40 transition-colors"
            >
              {loading ? "Submitting..." : "Submit reflection"}
            </button>

            <p className="text-xs text-stone-400 text-center">
              Your review will be visible to the community unless you make it private.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function ChoiceButton({
  label, selected, onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
        selected
          ? "bg-stone-900 text-white border-stone-900"
          : "border-stone-200 text-stone-700 hover:border-stone-400"
      }`}
    >
      {label}
    </button>
  );
}
