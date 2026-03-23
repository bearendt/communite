// apps/web/components/nav/Navbar.tsx
"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/map", label: "Discover", emoji: "🗺" },
  { href: "/events", label: "Events", emoji: "🍽" },
  { href: "/recipes", label: "Recipe Vault", emoji: "📖" },
  { href: "/tables", label: "Tables", emoji: "💬" },
];

export default function Navbar() {
  const { isSignedIn, user } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-stone-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={isSignedIn ? "/dashboard" : "/"}
          className="font-semibold text-lg text-stone-900 tracking-tight"
        >
          Communitē
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith(link.href)
                  ? "bg-stone-100 text-stone-900 font-medium"
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
              }`}
            >
              <span>{link.emoji}</span>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-3">
          {isSignedIn ? (
            <>
              <Link
                href="/events/new"
                className="hidden md:inline-flex items-center gap-1.5 bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-stone-700 transition-colors"
              >
                + Host
              </Link>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm text-stone-600 hover:text-stone-900"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-stone-700 transition-colors"
              >
                Join
              </Link>
            </>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-stone-600"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-stone-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm ${
                pathname.startsWith(link.href)
                  ? "bg-stone-100 text-stone-900 font-medium"
                  : "text-stone-600"
              }`}
            >
              <span>{link.emoji}</span>
              {link.label}
            </Link>
          ))}
          {isSignedIn && (
            <Link
              href="/events/new"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-[#C2714F] font-medium"
            >
              <span>✚</span>
              Host a gathering
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
