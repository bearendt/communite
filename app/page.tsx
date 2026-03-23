// apps/web/app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Communitē — Where strangers become neighbors",
  description:
    "Non-transactional potluck gatherings that rebuild real community. No money changes hands — just good food and genuine connection.",
};

async function getStats() {
  const [events, users] = await Promise.all([
    prisma.event.count({ where: { status: { in: ["PUBLISHED", "ACTIVE", "COMPLETED"] } } }),
    prisma.user.count({ where: { isBanned: false } }),
  ]);
  return { events, users };
}

const EXPERIENCE_TYPES = [
  { emoji: "🍲", label: "Traditional Potlucks" },
  { emoji: "🍷", label: "Wine Tastings" },
  { emoji: "🌿", label: "Farm-to-Table" },
  { emoji: "🫐", label: "Blue Zone Dinners" },
  { emoji: "🌍", label: "Cultural Exchange" },
  { emoji: "♻️", label: "Ethical Dining" },
  { emoji: "🏘", label: "Welcome Neighbor" },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Find or host a gathering",
    body: "Browse events near you by type, date, and neighborhood. Or host your own — any meal, any theme.",
  },
  {
    step: "2",
    title: "No money changes hands",
    body: "Hosts provide space and theme. Guests bring dishes, stories, or ingredients. Pure hospitality.",
  },
  {
    step: "3",
    title: "Build real trust",
    body: "Verified profiles, reflection-based reviews, and a safety layer that actually works.",
  },
];

const TRUST_ITEMS = [
  { emoji: "📱", label: "Phone verification" },
  { emoji: "🪪", label: "Optional ID verification" },
  { emoji: "🛡", label: "Safety code check-in" },
  { emoji: "🚨", label: "<10min incident response" },
  { emoji: "⭐", label: "Reflection-based reviews" },
  { emoji: "🔒", label: "Address hidden until RSVP" },
];

export default async function HomePage() {
  const stats = await getStats();

  return (
    <main className="overflow-x-hidden">
      {/* Hero */}
      <section className="min-h-[85vh] flex flex-col items-center justify-center text-center px-4 py-24 bg-gradient-to-b from-stone-50 to-white">
        <div className="inline-flex items-center gap-2 bg-white border border-stone-100 rounded-full px-4 py-1.5 text-xs text-stone-500 mb-8 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          Now live in Charlottesville, Richmond & Hampton Roads
        </div>

        <h1 className="text-5xl sm:text-6xl font-semibold text-stone-900 leading-tight max-w-3xl">
          Where strangers become{" "}
          <span className="text-[#C2714F]">neighbors</span>,<br />
          and meals become{" "}
          <span className="text-[#7A9E7E]">community</span>.
        </h1>

        <p className="mt-6 text-lg text-stone-500 max-w-xl leading-relaxed">
          Home-based, non-transactional potluck gatherings. No money
          changes hands. Just real food, real people, and real
          connection in your neighborhood.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
          <Link
            href="/sign-up"
            className="bg-stone-900 text-white px-8 py-3.5 rounded-2xl font-medium text-base hover:bg-stone-700 transition-colors shadow-sm"
          >
            Find a gathering near you
          </Link>
          <Link
            href="/map"
            className="border border-stone-200 text-stone-700 px-8 py-3.5 rounded-2xl font-medium text-base hover:bg-stone-50 transition-colors"
          >
            Browse events →
          </Link>
        </div>

        {stats.events > 0 && (
          <p className="mt-8 text-sm text-stone-400">
            {stats.users.toLocaleString()} community members ·{" "}
            {stats.events.toLocaleString()} gatherings hosted
          </p>
        )}
      </section>

      {/* The Silent Table epidemic */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { stat: "37.4%", label: "of U.S. adults experience moderate-to-severe loneliness" },
            { stat: "61%",   label: "of young people (13–24) say loneliness disrupts their daily life" },
            { stat: "33%",   label: "of adults 50–80 report feeling lonely regularly" },
          ].map((s) => (
            <div key={s.stat} className="text-center p-6 bg-stone-50 rounded-2xl">
              <p className="text-4xl font-bold text-[#C2714F]">{s.stat}</p>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-semibold text-stone-900 mb-4">
            We&apos;re eating alone more than ever
          </h2>
          <p className="text-stone-500 leading-relaxed">
            Communitē fights the Silent Table epidemic by restoring the oldest human
            ritual — gathering around shared food. No apps. No transactions.
            Just neighbors choosing to show up for each other.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-stone-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-semibold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-stone-700 flex items-center justify-center text-xl font-bold text-stone-200 mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience types */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-semibold text-stone-900 text-center mb-3">
          A table for every kind of gathering
        </h2>
        <p className="text-stone-500 text-center mb-10">
          From Sunday soup swaps to cultural exchange dinners — find your kind of table.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {EXPERIENCE_TYPES.map((t) => (
            <div
              key={t.label}
              className="flex flex-col items-center gap-2 p-4 bg-stone-50 rounded-2xl text-center hover:bg-stone-100 transition-colors cursor-default"
            >
              <span className="text-3xl">{t.emoji}</span>
              <span className="text-xs font-medium text-stone-600">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & safety */}
      <section className="bg-[#7A9E7E]/10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-semibold text-stone-900 mb-3">
              Safety is not optional
            </h2>
            <p className="text-stone-500 max-w-md mx-auto">
              Inviting strangers into your home requires real trust infrastructure.
              We built it from day one.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {TRUST_ITEMS.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm"
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm font-medium text-stone-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-24 px-4">
        <h2 className="text-3xl font-semibold text-stone-900 mb-4">
          Your neighbors are waiting
        </h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">
          Join the community restoring the lost art of the shared table.
          Free to join. No subscription required to get started.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/sign-up"
            className="bg-stone-900 text-white px-8 py-3.5 rounded-2xl font-medium hover:bg-stone-700 transition-colors"
          >
            Join Communitē — it&apos;s free
          </Link>
          <Link
            href="/events"
            className="text-stone-500 text-sm hover:text-stone-900 underline"
          >
            Or browse events first
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p>© {new Date().getFullYear()} Communitē · team@communite.app</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-stone-700">Privacy</Link>
            <Link href="/terms" className="hover:text-stone-700">Terms</Link>
            <Link href="/safety" className="hover:text-stone-700">Safety</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
