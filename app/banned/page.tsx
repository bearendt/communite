// apps/web/app/banned/page.tsx
// Middleware redirects banned users here. No auth required — they're already blocked.
import { SignOutButton } from "@clerk/nextjs";

export const metadata = { title: "Account Suspended · Communitē" };

export default function BannedPage() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-10 text-center">
        <div className="text-4xl mb-6">🚫</div>
        <h1 className="text-xl font-semibold text-stone-900 mb-2">
          Your account has been suspended
        </h1>
        <p className="text-sm text-stone-500 leading-relaxed mb-6">
          Your account has been suspended due to a violation of our community
          standards. If you believe this is in error, contact our safety team.
        </p>
        <a
          href="mailto:safety@communite.app?subject=Account+suspension+appeal"
          className="block w-full border border-stone-200 text-stone-700 rounded-xl py-2.5 text-sm font-medium hover:bg-stone-50 transition-colors mb-3"
        >
          Appeal this decision
        </a>
        <SignOutButton>
          <button className="block w-full text-stone-400 text-sm py-2 hover:text-stone-600">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}
