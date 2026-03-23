// apps/web/app/(app)/tables/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import TableChatWrapper from "./_components/TableChatWrapper";
import JoinLeaveButton from "./_components/JoinLeaveButton";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const table = await prisma.privateTable.findUnique({ where: { id: params.id } });
  return { title: table?.name ?? "Table" };
}

export default async function TableDetailPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const viewer = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!viewer) redirect("/onboarding");

  const table = await prisma.privateTable.findUnique({
    where: { id: params.id },
    include: {
      memberships: {
        include: {
          user: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!table) return notFound();

  const myMembership = table.memberships.find((m) => m.userId === viewer.id);
  const isMember = !!myMembership;

  // Private tables: non-members can't view
  if (!table.isPublic && !isMember) return notFound();

  const isPremium = viewer.tier === "SUNDAY_TABLE" || viewer.role === "ADMIN";
  const isOwner = myMembership?.role === "OWNER";

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/tables" className="text-sm text-stone-400 hover:text-stone-600 mb-6 block">
        ← Tables
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{table.name}</h1>
          <p className="text-sm text-stone-500 mt-1">💬 {table.topic}</p>
          {table.description && (
            <p className="text-sm text-stone-600 mt-2">{table.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {table.isPublic && (
            <span className="text-xs bg-stone-50 text-stone-500 px-2.5 py-1 rounded-full border border-stone-100">
              Public
            </span>
          )}
          {table.memberships.length} member{table.memberships.length !== 1 ? "s" : ""}
          {isPremium && (
            <JoinLeaveButton
              tableId={table.id}
              isMember={isMember}
              isOwner={isOwner}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2">
          {isMember ? (
            <TableChatWrapper
              tableId={table.id}
              userId={viewer.id}
              tableName={table.name}
            />
          ) : (
            <div className="bg-stone-50 rounded-2xl p-8 text-center">
              <p className="text-stone-400 text-sm">Join this table to participate in the chat.</p>
            </div>
          )}
        </div>

        {/* Members */}
        <div>
          <h2 className="text-sm font-semibold text-stone-900 mb-3">Members</h2>
          <div className="space-y-2">
            {table.memberships.map(({ user, role }) => (
              <Link
                key={user.id}
                href={`/profile/${user.id}`}
                className="flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-xl hover:border-stone-300 transition-colors"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
                    {user.displayName[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{user.displayName}</p>
                  {role !== "MEMBER" && (
                    <p className="text-xs text-stone-400 capitalize">{role.toLowerCase()}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
