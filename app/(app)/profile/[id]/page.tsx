// apps/web/app/(app)/profile/[id]/page.tsx
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { displayName: true },
  });
  return { title: user?.displayName ?? "Profile" };
}

export default async function ProfilePage({ params }: Props) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      reviewsReceived: {
        where: { isPublic: true, isFlagged: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { author: { select: { displayName: true, avatarUrl: true } } },
      },
      recipes: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          culturalNote: true,
          originCountry: true,
          tags: true,
        },
      },
      hostedEvents: {
        where: { status: "COMPLETED" },
        select: { id: true },
      },
    },
  });

  if (!user) return notFound();

  const avgRating =
    user.reviewsReceived.length > 0
      ? user.reviewsReceived.reduce((acc, r) => acc + r.rating, 0) /
        user.reviewsReceived.length
      : null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-8">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-2xl font-semibold text-stone-500">
            {user.displayName[0]}
          </div>
        )}

        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-stone-900">{user.displayName}</h1>
            {user.idVerified && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-1 font-medium">
                ✓ ID Verified
              </span>
            )}
            {user.role === "SUPER_HOST" && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-1 font-medium">
                ⭐ Super Host
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
            {avgRating !== null && (
              <span>⭐ {avgRating.toFixed(1)} ({user.reviewsReceived.length} reviews)</span>
            )}
            <span>🏠 {user.hostedEvents.length} events hosted</span>
            <span>Trust: {user.trustScore.toFixed(1)}</span>
          </div>

          {user.bio && (
            <p className="text-sm text-stone-600 mt-3 max-w-md">{user.bio}</p>
          )}
          {user.culturalBg && (
            <p className="text-xs text-stone-400 mt-1">🌍 {user.culturalBg}</p>
          )}
        </div>
      </div>

      {/* Reviews */}
      {user.reviewsReceived.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Community Reflections</h2>
          <div className="space-y-4">
            {user.reviewsReceived.map((r) => (
              <div key={r.id} className="bg-white border border-stone-100 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {r.author.avatarUrl && (
                      <img src={r.author.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                    )}
                    <span className="text-sm font-medium text-stone-700">
                      {r.author.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{"⭐".repeat(r.rating)}</span>
                    <span className="text-xs text-stone-400">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed">{r.body}</p>

                {/* Reflection indicators */}
                {r.reflections && (() => {
                  const rf = r.reflections as Record<string, boolean | number>;
                  return (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {rf.feltWelcome === true && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                          Felt welcome
                        </span>
                      )}
                      {rf.wouldAttendAgain === true && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          Would attend again
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Public recipes */}
      {user.recipes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-stone-900 mb-4">From the Recipe Vault</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.recipes.map((r) => (
              <Link
                key={r.id}
                href={`/recipes/${r.id}`}
                className="bg-white border border-stone-100 rounded-xl p-4 hover:border-stone-300 transition-colors"
              >
                <p className="font-medium text-stone-900 mb-1">{r.title}</p>
                {r.originCountry && (
                  <p className="text-xs text-stone-400 mb-1">🌍 {r.originCountry}</p>
                )}
                {r.culturalNote && (
                  <p className="text-xs text-stone-500 line-clamp-2 italic">{r.culturalNote}</p>
                )}
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-xs bg-stone-50 text-stone-500 px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
