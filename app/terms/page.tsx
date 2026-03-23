// apps/web/app/terms/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Terms of Service · Communitē",
  description: "Terms governing your use of the Communitē platform.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 mb-4 block">← Communitē</Link>
        <h1 className="text-3xl font-semibold text-stone-900">Terms of Service</h1>
        <p className="text-stone-400 text-sm mt-2">Last updated: January 1, 2025</p>
      </div>

      <div className="space-y-8 text-stone-700 text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">1. Acceptance</h2>
          <p>By creating an account or using Communitē, you agree to these Terms. If you don't agree, don't use the platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">2. The Non-Transactional Principle</h2>
          <p>Communitē exists to facilitate non-transactional community gatherings. <strong>No money may change hands at any Communitē event.</strong> Hosts may not charge guests. Guests may not offer payment to hosts. Violations result in immediate account suspension. This is not negotiable.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">3. Your Account</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You must be 18 or older to create an account.</li>
            <li>You are responsible for all activity on your account.</li>
            <li>One account per person. Creating multiple accounts to evade bans is prohibited.</li>
            <li>You must provide accurate information. Fake profiles violate these terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">4. Hosting</h2>
          <p>Hosts are responsible for:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Ensuring their venue is safe and accessible</li>
            <li>Following all applicable laws, including local ordinances about gatherings</li>
            <li>Managing RSVPs honestly and confirming or declining within 48 hours</li>
            <li>Not discriminating against guests on any protected basis</li>
          </ul>
          <p className="mt-3">Communitē is a platform, not a co-host. We do not vet venues, guarantee the safety of any specific event, or accept liability for what happens at gatherings. Our safety tools — verification, check-in codes, incident escalation — reduce risk but cannot eliminate it.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">5. Prohibited Conduct</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Charging for attendance in any form</li>
            <li>Harassment, threats, or hate speech targeting any community member</li>
            <li>Creating fake profiles or impersonating others</li>
            <li>Using Communitē to solicit romantic or sexual relationships without consent</li>
            <li>Misusing the safety reporting system (false or frivolous reports)</li>
            <li>Scraping, reverse-engineering, or automated access to the platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">6. Safety Incidents</h2>
          <p>If you experience or witness a safety incident at a Communitē event, use the in-app Safety Tools to report it. CRITICAL reports auto-suspend the event and alert our team. We commit to acknowledging all safety reports within 12 hours and responding to CRITICAL escalations within 10 minutes during active events.</p>
          <p className="mt-2">For immediate emergencies, call 911. Communitē is not a substitute for emergency services.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">7. Subscriptions</h2>
          <p>The Sunday Table subscription ($6.99/month or $60/year) unlocks premium features. Subscriptions auto-renew. Cancel any time via Settings → Manage Subscription. No refunds for partial billing periods.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">8. Intellectual Property</h2>
          <p>Recipes and stories you post remain yours. By posting them, you grant Communitē a limited license to display them on the platform. We will not sell or transfer your content without your permission.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">9. Disclaimers and Liability</h2>
          <p>Communitē is provided "as is." We are not liable for injuries, property damage, or other harms that occur at gatherings facilitated by the platform. Use good judgment. Meet in well-lit, accessible spaces. Trust your instincts.</p>
          <p className="mt-2">To the maximum extent permitted by law, our total liability to you for any claims arising from your use of Communitē is limited to the amount you paid us in the 12 months preceding the claim.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">10. Termination</h2>
          <p>We may suspend or terminate accounts that violate these Terms, threaten community safety, or engage in fraud. You may delete your account at any time via Settings → Account → Delete Account.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">11. Governing Law</h2>
          <p>These Terms are governed by the laws of the Commonwealth of Virginia. Disputes must be resolved by binding arbitration in Charlottesville, Virginia, except that either party may seek injunctive relief in court.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-3">12. Contact</h2>
          <p>Communitē · <a href="mailto:legal@communite.app" className="text-[#C2714F] underline">legal@communite.app</a></p>
        </section>
      </div>
    </main>
  );
}
