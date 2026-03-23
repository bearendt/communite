"use client";
// apps/web/app/(app)/tables/[id]/_components/TableChatWrapper.tsx
import EventChat from "@/components/chat/EventChat";

export default function TableChatWrapper({
  tableId, userId, tableName,
}: {
  tableId: string;
  userId: string;
  tableName: string;
}) {
  // EventChat is parameterised on channelType — reuse it for tables
  return (
    <div style={{ height: "550px" }}>
      <EventChat
        eventId={tableId}
        userId={userId}
        channelType="PRIVATE_TABLE"
        channelLabel={tableName}
      />
    </div>
  );
}
