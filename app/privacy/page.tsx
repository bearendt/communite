// apps/web/app/privacy/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Communitē",
  description: "How Communitē collects, uses, and protects your personal information.",
};

const LAST_UPDATED = "January 1, 2025";

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10">
        <Link href="/" className="text-sm text-stone-400 hover:text-stone-600 mb-4 block">← Communitē</Link>
        <h1 className="text-3xl font-semibold text-stone-900">Privacy Policy</h1>
        <p className="text-stone-400 text-sm mt-2">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="prose prose-stone max-w-none space-y-8 text-stone-700">
        <Section title="1. Information We Collect">
          <p>We collect information you provide directly:</p>
          <ul>
            <li><strong>Account information:</strong> name, email address, phone number, profile photo, bio, and dietary preferences.</li>
            <li><strong>Identity verification:</strong> if you choose to verify your identity via Stripe Identity, we store the verification status and reference ID — not your ID document itself.</li>
            <li><strong>Event data:</strong> events you host or attend, RSVPs, dish assignments, and reviews you write or receive.</li>
            <li><strong>Messages:</strong> messages sent in event chats and private tables. These are stored to provide the service and are not sold.</li>
            <li><strong>Payment information:</strong> handled entirely by Stripe. We do not store card numbers or payment credentials.</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul>
            <li>To operate the platform — matching hosts and guests, managing RSVPs, and delivering real-time chat.</li>
            <li>To protect our community — detecting fraud, banning abusive accounts, and responding to safety reports.</li>
            <li>To send transactional emails — RSVP confirmations, event reminders, and review requests. You cannot opt out of safety-critical communications.</li>
            <li>To improve the product — understanding how people use Communitē so we can fix what's broken.</li>
          </ul>
          <p>We do not sell your personal data. We do not use your data to train external AI models.</p>
        </Section>

        <Section title="3. Information Shared With Others">
          <p>We share limited information to make the platform work:</p>
          <ul>
            <li><strong>Other users:</strong> your display name, avatar, trust score, and public reviews are visible to other members. Your full address is only revealed to guests after you confirm their RSVP.</li>
            <li><strong>Service providers:</strong> Clerk (authentication), Neon (database), Ably (chat), Stripe (payments and ID verification), Cloudflare R2 (file storage), and Resend (email). Each is bound by data processing agreements.</li>
            <li><strong>Law enforcement:</strong> we will comply with valid legal process. We will notify you when permitted by law.</li>
          </ul>
        </Section>

        <Section title="4. Location Data">
          <p>We use your location — either from your browser or entered manually — to show you nearby events. We store the coordinates of event addresses to power proximity search. We do not track your real-time location continuously.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain your data while your account is active. If you delete your account, we soft-delete your profile within 24 hours and permanently delete your data within 30 days, except where required by law or needed to resolve open safety investigations.</p>
          <p>Messages in event chats are retained for 90 days after the event ends.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data (right to erasure)</li>
            <li>Object to or restrict how we process your data</li>
            <li>Data portability</li>
          </ul>
          <p>To exercise these rights, email <a href="mailto:privacy@communite.app" className="text-[#C2714F] underline">privacy@communite.app</a>. We respond within 30 days.</p>
        </Section>

        <Section title="7. Security">
          <p>We implement industry-standard security: TLS in transit, encrypted storage at rest, bcrypt-hashed sensitive codes, rate limiting, and multi-layer authentication via Clerk. No system is perfectly secure — if you discover a vulnerability, please email <a href="mailto:security@communite.app" className="text-[#C2714F] underline">security@communite.app</a>.</p>
        </Section>

        <Section title="8. Children">
          <p>Communitē is not directed at children under 18. We do not knowingly collect data from minors. If you believe a minor has created an account, contact us immediately.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We will notify registered users of material changes by email at least 14 days before they take effect.</p>
        </Section>

        <Section title="10. Contact">
          <p>Communitē · <a href="mailto:privacy@communite.app" className="text-[#C2714F] underline">privacy@communite.app</a></p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-900 mb-3">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
