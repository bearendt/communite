// apps/web/app/(app)/recipes/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Recipe Vault" };

export default async function RecipesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const viewer = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!viewer) redirect("/onboarding");

  const isPremium = viewer.tier === "SUNDAY_TABLE";

  const recipes = await prisma.recipe.findMany({
    where: { userId: viewer.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      culturalNote: true,
      originCountry: true,
      tags: true,
      isPublic: true,
      updatedAt: true,
    },
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Recipe Vault</h1>
          <p className="text-sm text-stone-500 mt-1">
            Preserve the stories behind your dishes.
          </p>
        </div>
        {isPremium ? (
          <Link
            href="/recipes/new"
            className="bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            + Add recipe
          </Link>
        ) : null}
      </div>

      {/* Paywall for free tier */}
      {!isPremium && (
        <div className="bg-stone-900 text-white rounded-2xl p-8 mb-8 text-center">
          <p className="text-3xl mb-3">📖</p>
          <h2 className="text-lg font-semibold mb-2">Recipe Vault is a Sunday Table feature</h2>
          <p className="text-sm text-stone-300 mb-5 max-w-sm mx-auto">
            Preserve cultural recipes, family stories, and the traditions behind your dishes.
            Share them with the community or keep them private.
          </p>
          <Link
            href="/upgrade"
            className="bg-white text-stone-900 px-5 py-2 rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors"
          >
            Upgrade to Sunday Table — $6.99/mo
          </Link>
        </div>
      )}

      {/* Recipe grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">🍳</p>
          <p className="text-sm">No recipes yet. Start preserving your culinary stories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((r) => (
            <Link
              key={r.id}
              href={`/recipes/${r.id}`}
              className="bg-white border border-stone-100 rounded-2xl p-5 hover:border-stone-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-semibold text-stone-900 line-clamp-2">{r.title}</h2>
                {!r.isPublic && (
                  <span className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full shrink-0 ml-2">
                    Private
                  </span>
                )}
              </div>
              {r.originCountry && (
                <p className="text-xs text-stone-400 mb-1">🌍 {r.originCountry}</p>
              )}
              {r.culturalNote && (
                <p className="text-xs text-stone-500 line-clamp-2 italic mb-3">
                  {r.culturalNote}
                </p>
              )}
              {r.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {r.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-xs bg-stone-50 text-stone-500 px-2 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-stone-300 mt-3">
                Updated {new Date(r.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
