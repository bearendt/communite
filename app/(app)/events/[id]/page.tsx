// apps/web/app/(app)/events/[id]/page.tsx
// Event detail page — address only shown to confirmed RSVPs
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import RSVPButton from "./_components/RSVPButton";
import DishList from "./_components/DishList";
import SafetyPanel from "./_components/SafetyPanel";
import EventChat from "@/components/chat/EventChat";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    select: { title: true, description: true },
  });
  return { title: event?.title ?? "Event" };
}

export default async function EventDetailPage({ params }: Props) {
  const { userId } = await auth();

  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: {
      host: { select: { id: true, displayName: true, avatarUrl: true, trustScore: true, role: true } },
      rsvps: {
        where: { status: "CONFIRMED" },
        include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      },
      dishAssignments: {
        include: { user: { select: { id: true, displayName: true } } },
      },
      _count: { select: { rsvps: { where: { status: "CONFIRMED" } } } },
    },
  });

  if (!event || event.status === "CANCELLED") return notFound();

  // Resolve viewer
  const viewer = userId
    ? await prisma.user.findUnique({ where: { clerkId: userId } })
    : null;

  const isHost = viewer?.id === event.hostId;
  const viewerRSVP = viewer
    ? event.rsvps.find((r) => r.userId === viewer.id) ?? null
    : null;
  const isConfirmed = viewerRSVP?.status === "CONFIRMED";

  // Address only revealed to confirmed guests and the host
  const showAddress = isHost || isConfirmed;

  const spotsLeft = event.maxGuests - event._count.rsvps;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Status banner */}
      {event.status === "SUSPENDED" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 text-red-700 text-sm font-medium">
          ⚠️ This event has been suspended by our safety team.
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <span className="text-xs font-medium uppercase tracking-wide text-[#7A9E7E] mb-2 block">
          {event.eventType.replace(/_/g, " ")}
        </span>
        <h1 className="text-3xl font-semibold mb-2">{event.title}</h1>
        {event.theme && (
          <p className="text-gray-500 text-sm mb-3">Theme: {event.theme}</p>
        )}
        <p className="text-gray-700">{event.description}</p>
      </div>

      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white rounded-2xl p-5 mb-6 shadow-sm text-sm">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Date</p>
          <p className="font-medium">
            {new Date(event.startsAt).toLocaleDateString("en-US", {
              weekday: "short", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Time</p>
          <p className="font-medium">
            {new Date(event.startsAt).toLocaleTimeString("en-US", {
              hour: "numeric", minute: "2-digit",
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Spots</p>
          <p className={`font-medium ${spotsLeft <= 2 ? "text-amber-600" : ""}`}>
            {spotsLeft <= 0 ? "Full" : `${spotsLeft} left`}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide">Location</p>
          <p className="font-medium">
            {showAddress
              ? `${event.addressLine1}, ${event.city}, ${event.state}`
              : `${event.city}, ${event.state}`}
          </p>
          {!showAddress && (
            <p className="text-xs text-gray-400">Full address shown after confirmation</p>
          )}
        </div>
      </div>

      {/* Host info */}
      <div className="flex items-center gap-3 mb-8">
        {event.host.avatarUrl && (
          <img src={event.host.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
        )}
        <div>
          <p className="text-sm font-medium">{event.host.displayName}</p>
          <p className="text-xs text-gray-400">
            Trust score: {event.host.trustScore.toFixed(1)} ·{" "}
            {event.host.role === "SUPER_HOST" ? "⭐ Super Host" : "Host"}
          </p>
        </div>
      </div>

      {/* RSVP */}
      {viewer && !isHost && (
        <RSVPButton
          eventId={event.id}
          existingStatus={viewerRSVP?.status ?? null}
          spotsLeft={spotsLeft}
          requiresIdVerif={event.requiresIdVerif}
          viewerIdVerified={viewer.idVerified}
        />
      )}

      {/* Dish assignments */}
      <DishList
        eventId={event.id}
        dishes={event.dishAssignments}
        isHost={isHost}
        viewerId={viewer?.id ?? null}
      />

      {/* Confirmed guests */}
      {(isHost || isConfirmed) && event.rsvps.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-3">
            Confirmed Guests ({event._count.rsvps})
          </h2>
          <div className="flex flex-wrap gap-3">
            {event.rsvps.map(({ user }) => (
              <div key={user.id} className="flex items-center gap-2 text-sm">
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                )}
                <span>{user.displayName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Safety panel — visible to host and confirmed guests during active event */}
      {(isHost || isConfirmed) && event.status === "ACTIVE" && (
        <SafetyPanel eventId={event.id} isHost={isHost} />
      )}

      {/* Event chat — visible to confirmed guests and host */}
      {viewer && (isHost || isConfirmed) && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Event Chat</h2>
          <div style={{ height: "480px" }}>
            <EventChat
              eventId={event.id}
              userId={viewer.id}
              channelLabel={event.title}
            />
          </div>
        </section>
      )}
    </main>
  );
}
