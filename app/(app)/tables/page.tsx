// apps/web/app/(app)/tables/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import CreateTableButton from "./_components/CreateTableButton";

export const metadata = { title: "Private Tables · Communitē" };

export default async function TablesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const viewer = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!viewer) redirect("/onboarding");

  const isPremium = viewer.tier === "SUNDAY_TABLE" || viewer.role === "ADMIN";

  // Tables the user is a member of
  const myMemberships = await prisma.tableMembership.findMany({
    where: { userId: viewer.id },
    include: {
      table: {
        include: {
          _count: { select: { memberships: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  // Discoverable public tables the user hasn't joined
  const publicTables = await prisma.privateTable.findMany({
    where: {
      isPublic: true,
      memberships: { none: { userId: viewer.id } },
    },
    include: { _count: { select: { memberships: true } } },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Private Tables</h1>
          <p className="text-sm text-stone-500 mt-1">
            Interest-based groups for the people you want to keep eating with.
          </p>
        </div>
        {isPremium && <CreateTableButton />}
      </div>

      {/* Paywall */}
      {!isPremium && (
        <div className="bg-stone-900 text-white rounded-2xl p-8 mb-8 text-center">
          <p className="text-3xl mb-3">💬</p>
          <h2 className="text-lg font-semibold mb-2">Private Tables is a Sunday Table feature</h2>
          <p className="text-sm text-stone-300 mb-5 max-w-sm mx-auto">
            Create or join interest-based groups — wine lovers, cookbook clubs,
            neighborhood networks — with their own chat and events.
          </p>
          <Link
            href="/upgrade"
            className="bg-white text-stone-900 px-5 py-2 rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors"
          >
            Upgrade to Sunday Table — $6.99/mo
          </Link>
        </div>
      )}

      {/* My tables */}
      {myMemberships.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-stone-900 mb-4">
            Your tables ({myMemberships.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {myMemberships.map(({ table, role }) => (
              <Link
                key={table.id}
                href={`/tables/${table.id}`}
                className="bg-white border border-stone-100 rounded-2xl p-5 hover:border-stone-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-stone-900">{table.name}</h3>
                  <span className="text-xs text-stone-400">
                    {role === "OWNER" ? "👑" : role === "MODERATOR" ? "⚡" : ""}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mb-3 line-clamp-2">
                  {table.description ?? table.topic}
                </p>
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>💬 {table.topic}</span>
                  <span>{table._count.memberships} member{table._count.memberships !== 1 ? "s" : ""}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Discover public tables */}
      {isPremium && publicTables.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-stone-900 mb-4">
            Discover tables
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicTables.map((table) => (
              <Link
                key={table.id}
                href={`/tables/${table.id}`}
                className="bg-white border border-stone-100 rounded-2xl p-5 hover:border-stone-300 hover:shadow-sm transition-all group"
              >
                <h3 className="font-semibold text-stone-900 group-hover:text-[#C2714F] transition-colors mb-1">
                  {table.name}
                </h3>
                <p className="text-xs text-stone-500 mb-3 line-clamp-2">
                  {table.description ?? table.topic}
                </p>
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>💬 {table.topic}</span>
                  <span className="text-[#C2714F] font-medium">Join →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isPremium && myMemberships.length === 0 && publicTables.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm">No tables yet. Create the first one for your neighborhood.</p>
        </div>
      )}
    </main>
  );
}
