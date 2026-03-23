// apps/web/app/admin/safety/page.tsx
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Safety Dashboard · Admin" };

export default async function AdminSafetyPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const [activeEvents, recentEscalations, suspendedEvents, criticalReports] =
    await Promise.all([
      // All currently live events
      prisma.event.findMany({
        where: { status: "ACTIVE" },
        include: {
          host: { select: { displayName: true, email: true } },
          _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
          safetyLogs: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { startsAt: "asc" },
      }),
      // Escalations in the last 24 hours
      prisma.safetyLog.findMany({
        where: {
          type: "ESCALATED",
          createdAt: { gte: new Date(Date.now() - 86400000) },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          event: { select: { id: true, title: true, status: true } },
        },
      }),
      // Suspended events awaiting review
      prisma.event.findMany({
        where: { status: "SUSPENDED" },
        orderBy: { suspendedAt: "asc" },
        include: {
          host: { select: { id: true, displayName: true, email: true } },
          _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
        },
      }),
      // All open critical reports
      prisma.report.findMany({
        where: {
          severity: "CRITICAL",
          status: { in: ["OPEN", "INVESTIGATING"] },
        },
        orderBy: { createdAt: "asc" },
        include: {
          filer: { select: { displayName: true } },
          subject: { select: { id: true, displayName: true } },
          event: { select: { id: true, title: true } },
        },
      }),
    ]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin" className="text-sm text-stone-400 hover:text-stone-600 mb-1 block">
            ← Admin home
          </Link>
          <h1 className="text-2xl font-semibold text-stone-900">Safety Dashboard</h1>
          <p className="text-sm text-stone-500">
            Real-time safety monitoring · {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${activeEvents.length > 0 ? "bg-green-400 animate-pulse" : "bg-stone-300"}`} />
          <span className="text-sm text-stone-500">
            {activeEvents.length} live event{activeEvents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Critical alerts */}
      {(criticalReports.length > 0 || suspendedEvents.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 space-y-4">
          <h2 className="text-sm font-bold text-red-800 uppercase tracking-wide">
            🚨 Immediate Action Required
          </h2>

          {criticalReports.map((r) => (
            <div key={r.id} className="bg-white rounded-xl p-4 border border-red-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-700">
                    CRITICAL: {r.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Filed by {r.filer.displayName}
                    {r.subject && ` against ${r.subject.displayName}`}
                    {r.event && ` at "${r.event.title}"`}
                  </p>
                  <p className="text-sm text-stone-700 mt-2 leading-relaxed">{r.description}</p>
                </div>
                <Link
                  href="/admin"
                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 shrink-0 ml-4"
                >
                  Resolve
                </Link>
              </div>
            </div>
          ))}

          {suspendedEvents.map((event) => (
            <div key={event.id} className="bg-white rounded-xl p-4 border border-amber-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-700">
                    Suspended: {event.title}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Host: {event.host.displayName} ({event.host.email}) ·{" "}
                    {event._count.rsvps} confirmed guests
                  </p>
                  {event.suspendReason && (
                    <p className="text-xs text-stone-600 mt-1">{event.suspendReason}</p>
                  )}
                  {event.suspendedAt && (
                    <p className="text-xs text-stone-400 mt-1">
                      Suspended {new Date(event.suspendedAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <Link
                  href={`/events/${event.id}/manage`}
                  className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 shrink-0 ml-4"
                >
                  Review event
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live events */}
        <section className="bg-white border border-stone-100 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-stone-900 mb-4">
            Live Events ({activeEvents.length})
          </h2>
          {activeEvents.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">No events currently active</p>
          ) : (
            <ul className="space-y-3">
              {activeEvents.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                      <p className="text-sm font-medium text-stone-900">{event.title}</p>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {event.host.displayName} · {event._count.rsvps} guests ·{" "}
                      Started {new Date(event.startsAt).toLocaleTimeString()}
                    </p>
                    {event.safetyLogs[0] && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        Last activity: {event.safetyLogs[0].type.replace(/_/g, " ").toLowerCase()}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/events/${event.id}/manage`}
                    className="text-xs border border-stone-200 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50 shrink-0"
                  >
                    Monitor
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent escalations */}
        <section className="bg-white border border-stone-100 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-stone-900 mb-4">
            Escalations (24h)
          </h2>
          {recentEscalations.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">
              ✓ No escalations in the last 24 hours
            </p>
          ) : (
            <ul className="space-y-3">
              {recentEscalations.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      🚨 Escalation — {log.event?.title ?? "Unknown event"}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                    {(log.payload as Record<string, unknown>)?.description && (
                      <p className="text-xs text-stone-600 mt-1">
                        {String((log.payload as Record<string, unknown>).description).slice(0, 120)}
                      </p>
                    )}
                  </div>
                  {log.event && (
                    <Link
                      href={`/events/${log.event.id}/manage`}
                      className="text-xs border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 shrink-0"
                    >
                      Review
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
