"use client";
// apps/web/app/(app)/tables/[id]/_components/JoinLeaveButton.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinLeaveButton({
  tableId, isMember, isOwner,
}: {
  tableId: string;
  isMember: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (isOwner) return; // owners can't leave — must transfer or delete
    setLoading(true);

    const res = await fetch(`/api/tables/${tableId}/membership`, {
      method: isMember ? "DELETE" : "POST",
    });

    setLoading(false);
    if (res.ok) router.refresh();
  }

  if (isOwner) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-sm px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 ${
        isMember
          ? "border border-stone-200 text-stone-600 hover:bg-stone-50"
          : "bg-stone-900 text-white hover:bg-stone-700"
      }`}
    >
      {loading ? "…" : isMember ? "Leave" : "Join table"}
    </button>
  );
}
