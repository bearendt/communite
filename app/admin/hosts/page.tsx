// apps/web/app/admin/hosts/page.tsx
// Admin view of pending host applications.
// Applications are stored as AuditLog entries with action "host.application".

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import HostApplicationActions from "./_components/HostApplicationActions";

export const metadata = { title: "Host Applications · Admin" };

export default async function AdminHostsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  // Pull pending applications from audit log
  const applicationLogs = await prisma.auditLog.findMany({
    where: {
      action: "host.application",
      // Only show applications where user is still a GUEST
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
          trustScore: true,
          createdAt: true,
          phoneVerified: true,
          idVerified: true,
          _count: {
            select: {
              rsvps: true,
              reviewsReceived: true,
            },
          },
        },
      },
    },
  });

  // Filter to only applicants still at GUEST role (not yet approved/rejected)
  const pending = applicationLogs.filter(
    (log) => log.user?.role === "GUEST"
  );

  const approved = applicationLogs.filter(
    (log) => log.user && ["HOST", "SUPER_HOST"].includes(log.user.role)
  );

  type AppMeta = {
    motivation?: string;
    city?: string;
    state?: string;
    hostingFrequency?: string;
    eventTypes?: string[];
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin" className="text-sm text-stone-400 hover:text-stone-600">← Admin</Link>
        <h1 className="text-2xl font-semibold text-stone-900">Host Applications</h1>
      </div>

      {/* Pending */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-base font-semibold text-stone-900">Pending Review</h2>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-stone-400 py-6 text-center">No pending applications</p>
        ) : (
          <div className="space-y-4">
            {pending.map((log) => {
              if (!log.user) return null;
              const meta = (log.metadata ?? {}) as AppMeta;

              return (
                <div key={log.id}
                  className="bg-white border border-stone-100 rounded-2xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-stone-900">{log.user.displayName}</p>
                        {log.user.idVerified && (
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">ID ✓</span>
                        )}
                        {log.user.phoneVerified && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">📱 ✓</span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500">{log.user.email}</p>
                      <p className="text-xs text-stone-400 mt-1">
                        Member since {new Date(log.user.createdAt).toLocaleDateString()} ·{" "}
                        {log.user._count.rsvps} RSVPs ·{" "}
                        {log.user._count.reviewsReceived} reviews ·{" "}
                        Trust {log.user.trustScore.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-stone-400 shrink-0">
                      <p>{new Date(log.createdAt).toLocaleDateString()}</p>
                      {meta.city && <p className="mt-0.5">{meta.city}, {meta.state}</p>}
                    </div>
                  </div>

                  {meta.motivation && (
                    <div className="bg-stone-50 rounded-xl p-4 mb-4">
                      <p className="text-xs font-medium text-stone-500 mb-1">Motivation</p>
                      <p className="text-sm text-stone-700 leading-relaxed">{meta.motivation}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {meta.eventTypes?.map((t) => (
                      <span key={t} className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                    {meta.hostingFrequency && (
                      <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full">
                        {meta.hostingFrequency}
                      </span>
                    )}
                  </div>

                  <HostApplicationActions userId={log.user.id} applicantName={log.user.displayName} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recently approved */}
      {approved.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-stone-900 mb-4">
            Recently Approved ({approved.length})
          </h2>
          <div className="space-y-2">
            {approved.slice(0, 10).map((log) => {
              if (!log.user) return null;
              return (
                <div key={log.id}
                  className="flex items-center justify-between p-4 bg-white border border-stone-100 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{log.user.displayName}</p>
                    <p className="text-xs text-stone-400">{log.user.email}</p>
                  </div>
                  <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    HOST
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
