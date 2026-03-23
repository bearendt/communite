import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-1">Welcome back, {user.displayName}</h1>
      <p className="text-sm text-gray-500 mb-8">{user.tier === "SUNDAY_TABLE" ? "Sunday Table Member" : "Free tier"}</p>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/map" className="p-4 bg-white border rounded-xl text-center text-sm font-medium">Find events</Link>
        <Link href="/events/new" className="p-4 bg-white border rounded-xl text-center text-sm font-medium">Host a gathering</Link>
      </div>
    </main>
  );
}
