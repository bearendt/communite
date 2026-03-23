// apps/web/app/(app)/events/[id]/manage/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import RSVPQueue from "./_components/RSVPQueue";
import PotluckCoordinator from "./_components/PotluckCoordinator";
import EventControls from "./_components/EventControls";
import SafetyLog from "./_components/SafetyLog";

type Props = { params: { id: string }; searchParams: { created?: string } };

export async function generateMetadata({ params }: Props) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { title: true },
  });
  return { title: `Manage: ${event?.title ?? "Event"}` };
}

export default async function ManageEventPage({ params, searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const viewer = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!viewer) redirect("/onboarding");

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      rsvps: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
              trustScore: true,
              idVerified: true,
              phoneVerified: true,
              tier: true,
              dietaryNotes: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      dishAssignments: {
        include: { user: { select: { id: true, displayName: true } } },
        orderBy: [{ category: "asc" }, { createdAt: "asc" }],
      },
      safetyLogs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: {
          rsvps: { where: { status: "CONFIRMED" } },
        },
      },
    },
  });

  if (!event) return notFound();

  // Only host and admins can access management
  if (event.hostId !== viewer.id && viewer.role !== "ADMIN") {
    redirect(`/events/${params.id}`);
  }

  const confirmedCount = event._count.rsvps;
  const spotsLeft = event.maxGuests - confirmedCount;

  const rsvpsByStatus = {
    PENDING: event.rsvps.filter((r) => r.status === "PENDING"),
    CONFIRMED: event.rsvps.filter((r) => r.status === "CONFIRMED"),
    WAITLISTED: event.rsvps.filter((r) => r.status === "WAITLISTED"),
    DECLINED: event.rsvps.filter((r) => r.status === "DECLINED"),
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Success banner */}
      {searchParams.created === "true" && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6 text-sm text-green-800">
          ✓ Event saved as draft. Publish it when you're ready.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href={`/events/${event.id}`}
            className="text-sm text-stone-400 hover:text-stone-600 mb-1 block">
            ← Public view
          </Link>
          <h1 className="text-2xl font-semibold text-stone-900">{event.title}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {new Date(event.startsAt).toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
              hour: "numeric", minute: "2-digit",
            })} · {event.city}, {event.state}
          </p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Confirmed", value: confirmedCount, color: "text-green-700" },
          { label: "Pending", value: rsvpsByStatus.PENDING.length, color: "text-amber-700" },
          { label: "Waitlisted", value: rsvpsByStatus.WAITLISTED.length, color: "text-blue-700" },
          { label: "Spots left", value: Math.max(0, spotsLeft), color: spotsLeft <= 2 ? "text-amber-700" : "text-stone-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-stone-100 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {/* Event controls — publish, start, end, cancel */}
        <EventControls
          eventId={event.id}
          status={event.status}
          startsAt={event.startsAt.toISOString()}
        />

        {/* RSVP queue */}
        <RSVPQueue
          eventId={event.id}
          rsvpsByStatus={rsvpsByStatus}
          spotsLeft={spotsLeft}
        />

        {/* Potluck coordinator */}
        <PotluckCoordinator
          eventId={event.id}
          dishes={event.dishAssignments}
          confirmedGuestCount={confirmedCount}
          isHost
        />

        {/* Safety log */}
        {event.safetyLogs.length > 0 && (
          <SafetyLog logs={event.safetyLogs} />
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Draft", cls: "bg-stone-100 text-stone-600" },
    PUBLISHED: { label: "Published", cls: "bg-blue-50 text-blue-700" },
    ACTIVE: { label: "● Live", cls: "bg-green-50 text-green-700 animate-pulse" },
    COMPLETED: { label: "Completed", cls: "bg-stone-50 text-stone-500" },
    CANCELLED: { label: "Cancelled", cls: "bg-stone-100 text-stone-400" },
    SUSPENDED: { label: "⚠ Suspended", cls: "bg-red-50 text-red-700" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-stone-50 text-stone-500" };
  return (
    <span className={`text-sm font-medium px-3 py-1 rounded-full ${cls}`}>{label}</span>
  );
}
