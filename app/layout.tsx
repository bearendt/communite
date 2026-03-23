// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/nav/Navbar";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Communitē", template: "%s | Communitē" },
  description: "Where strangers become neighbors, and meals become community.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://communite.app"),
  openGraph: {
    siteName: "Communitē",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
