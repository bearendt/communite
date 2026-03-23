// apps/web/app/not-found.tsx
import Link from "next/link";

export const metadata = { title: "Page not found · Communitē" };

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-sm text-center">
        <div className="text-5xl mb-4">🍽</div>
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">
          Table not found
        </h1>
        <p className="text-stone-500 text-sm mb-8">
          This page doesn't exist, or you may not have access to it.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/events"
            className="bg-stone-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Find a gathering
          </Link>
          <Link
            href="/dashboard"
            className="border border-stone-200 text-stone-700 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
