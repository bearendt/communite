// apps/web/app/safety/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Safety · Communitē",
  description: "How Communitē builds a safer community around shared meals.",
};

const SAFETY_LAYERS = [
  {
    emoji: "📱",
    title: "Phone Verification",
    body: "Every member must verify a real phone number before RSVPing or hosting. Anonymous accounts are not allowed.",
  },
  {
    emoji: "🪪",
    title: "Optional ID Verification",
    body: "Hosts can require ID-verified guests for higher-stakes events. Verification is powered by Stripe Identity and never stores your document.",
  },
  {
    emoji: "🔒",
    title: "Address Hidden Until Confirmed",
    body: "Full event addresses are never visible in public listings. The address is only revealed to guests after the host confirms their RSVP.",
  },
  {
    emoji: "🛡",
    title: "Safety Code Check-In",
    body: "Hosts generate a 6-character code when the event starts and share it verbally at the door. Guests check in through the app. This creates an attendance record and confirms presence.",
  },
  {
    emoji: "⭐",
    title: "Reflection-Based Reviews",
    body: "After every event, participants leave reflections — not just star ratings. Questions like \"Did you feel welcome?\" and \"Would you share a table again?\" build a nuanced trust record.",
  },
  {
    emoji: "🚨",
    title: "Live Incident Escalation",
    body: "During active events, any participant can file a safety report. CRITICAL reports immediately suspend the event and alert our safety team. We respond within 10 minutes.",
  },
  {
    emoji: "📋",
    title: "Full Audit Trail",
    body: "Every safety action — check-ins, reports, escalations, status changes — is logged with timestamps and actor IDs. Nothing is quietly deleted.",
  },
  {
    emoji: "🚫",
    title: "Strict Ban Enforcement",
    body: "Banned accounts are blocked at the authentication layer, not just the UI. Creating a second account to evade a ban is a terms violation we actively enforce.",
  },
];

const FOR_GUESTS = [
  "Browse events and read host reviews before RSVPing",
  "Hosts see your dietary notes only after confirming your RSVP",
  "Bring a friend if it's your first event — it's always allowed",
  "Use the safety check-in to confirm you arrived safely",
  "Trust your instincts — you can leave any event without explanation",
  "Report any concern via the Safety Tools — no concern is too small",
];

const FOR_HOSTS = [
  "Start slow — host a small gathering with people you already know",
  "Require phone verification (default) or ID verification for strangers",
  "Confirm RSVPs manually — review profiles and reviews before approving",
  "Share the safety code at the door, not online",
  "Keep event sizes manageable — you're responsible for your space",
  "End the event in the app so guests can leave reviews",
];

export default function SafetyPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 mb-6 block">← Communitē</Link>
        <h1 className="text-4xl font-semibold text-stone-900 mb-4">Safety is not optional</h1>
        <p className="text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
          Inviting strangers into your home — or going to one — requires real trust infrastructure.
          We built it from day one, not as an afterthought.
        </p>
      </div>

      {/* Safety layers */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold text-stone-900 mb-6">How our safety system works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAFETY_LAYERS.map((layer) => (
            <div key={layer.title} className="bg-white border border-stone-100 rounded-2xl p-5 hover:border-stone-200 transition-colors">
              <div className="flex items-start gap-4">
                <span className="text-2xl shrink-0">{layer.emoji}</span>
                <div>
                  <h3 className="font-semibold text-stone-900 mb-1">{layer.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{layer.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="bg-stone-50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Tips for guests</h2>
          <ul className="space-y-3">
            {FOR_GUESTS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-[#7A9E7E] mt-0.5 shrink-0 font-bold">✓</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-stone-50 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Tips for hosts</h2>
          <ul className="space-y-3">
            {FOR_HOSTS.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                <span className="text-[#C2714F] mt-0.5 shrink-0 font-bold">✓</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Emergency */}
      <section className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-12">
        <h2 className="text-lg font-semibold text-red-900 mb-2">🚨 In an emergency</h2>
        <p className="text-sm text-red-800 leading-relaxed">
          <strong>Call 911 first.</strong> Communitē is not a substitute for emergency services.
          After ensuring immediate safety, use the Safety Tools in the app to file a report and
          alert our team. We commit to responding to CRITICAL escalations within 10 minutes
          during active events.
        </p>
        <p className="text-sm text-red-700 mt-3">
          Safety questions or non-emergency concerns:{" "}
          <a href="mailto:safety@communite.app" className="underline font-medium">
            safety@communite.app
          </a>
        </p>
      </section>

      {/* CTA */}
      <div className="text-center">
        <p className="text-stone-500 text-sm mb-4">
          Built something that doesn't feel safe? Tell us.
          We take every concern seriously.
        </p>
        <Link
          href="/sign-up"
          className="bg-stone-900 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          Join the community →
        </Link>
      </div>
    </main>
  );
}
