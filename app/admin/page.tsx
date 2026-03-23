// apps/web/app/admin/page.tsx
// Admin dashboard — server component, auth checked via middleware + role guard.
// Only ADMIN role users reach this page.

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminReportQueue from "./_components/AdminReportQueue";
import AdminUserSearch from "./_components/AdminUserSearch";

export const metadata = { title: "Admin Dashboard · Communitē" };

async function getAdminMetrics() {
  const [
    totalUsers,
    activeEvents,
    openReports,
    criticalReports,
    suspendedEvents,
    newUsersToday,
    sundayTableMembers,
  ] = await Promise.all([
    prisma.user.count({ where: { isBanned: false } }),
    prisma.event.count({ where: { status: { in: ["PUBLISHED", "ACTIVE"] } } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] } } }),
    prisma.report.count({ where: { status: { in: ["OPEN", "INVESTIGATING"] }, severity: "CRITICAL" } }),
    prisma.event.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
    }),
    prisma.user.count({ where: { tier: "SUNDAY_TABLE" } }),
  ]);

  return {
    totalUsers,
    activeEvents,
    openReports,
    criticalReports,
    suspendedEvents,
    newUsersToday,
    sundayTableMembers,
  };
}

async function getRecentReports() {
  return prisma.report.findMany({
    where: { status: { in: ["OPEN", "INVESTIGATING"] } },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    take: 15,
    include: {
      filer: { select: { id: true, displayName: true } },
      subject: { select: { id: true, displayName: true, isBanned: true } },
      event: { select: { id: true, title: true, status: true } },
    },
  });
}

async function getSuspendedEvents() {
  return prisma.event.findMany({
    where: { status: "SUSPENDED" },
    orderBy: { suspendedAt: "asc" },
    take: 5,
    include: {
      host: { select: { id: true, displayName: true, email: true } },
      _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
    },
  });
}

export default async function AdminDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const [metrics, reports, suspended] = await Promise.all([
    getAdminMetrics(),
    getRecentReports(),
    getSuspendedEvents(),
  ]);

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Admin Dashboard</h1>
          <p className="text-sm text-stone-500">Logged in as {admin.displayName}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-stone-500 hover:text-stone-900">
          ← Back to app
        </Link>
      </div>

      {/* Critical alerts */}
      {(metrics.criticalReports > 0 || metrics.suspendedEvents > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-red-800 mb-3">🚨 Requires Immediate Attention</h2>
          <div className="flex gap-6">
            {metrics.criticalReports > 0 && (
              <div>
                <p className="text-2xl font-bold text-red-700">{metrics.criticalReports}</p>
                <p className="text-xs text-red-600">Critical report{metrics.criticalReports !== 1 ? "s" : ""}</p>
              </div>
            )}
            {metrics.suspendedEvents > 0 && (
              <div>
                <p className="text-2xl font-bold text-red-700">{metrics.suspendedEvents}</p>
                <p className="text-xs text-red-600">Suspended event{metrics.suspendedEvents !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="flex flex-wrap gap-3 mb-8">
        {[
          { href: "/admin/safety", label: "🛡 Safety Dashboard" },
          { href: "/admin/hosts",  label: "🏠 Host Applications" },
          { href: "/admin",       label: "📋 Reports" },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="text-sm border border-stone-200 text-stone-600 px-4 py-2 rounded-lg hover:bg-stone-50">
            {link.label}
          </Link>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Users",      value: metrics.totalUsers,        color: "text-stone-900" },
          { label: "Active Events",    value: metrics.activeEvents,      color: "text-blue-700" },
          { label: "Open Reports",     value: metrics.openReports,       color: metrics.openReports > 0 ? "text-amber-700" : "text-stone-400" },
          { label: "Sunday Table",     value: metrics.sundayTableMembers, color: "text-amber-700" },
          { label: "New Today",        value: metrics.newUsersToday,     color: "text-green-700" },
        ].map((m) => (
          <div key={m.label} className="bg-white border border-stone-100 rounded-xl p-4">
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-stone-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Suspended events */}
        {suspended.length > 0 && (
          <section className="bg-white border border-red-100 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-stone-900 mb-4">
              ⚠️ Suspended Events
            </h2>
            <ul className="space-y-3">
              {suspended.map((event) => (
                <li key={event.id} className="flex items-start justify-between gap-3 p-3 bg-red-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-stone-900">{event.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Host: {event.host.displayName} · {event._count.rsvps} confirmed guests
                    </p>
                    {event.suspendReason && (
                      <p className="text-xs text-red-700 mt-1">{event.suspendReason}</p>
                    )}
                  </div>
                  <Link
                    href={`/events/${event.id}/manage`}
                    className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 shrink-0"
                  >
                    Review →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Report queue */}
        <section className="bg-white border border-stone-100 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-stone-900 mb-4">
            Report Queue ({metrics.openReports})
          </h2>
          <AdminReportQueue reports={reports} />
        </section>
      </div>

      {/* User search */}
      <section className="mt-6 bg-white border border-stone-100 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-stone-900 mb-4">User Management</h2>
        <AdminUserSearch />
      </section>
    </main>
  );
}
