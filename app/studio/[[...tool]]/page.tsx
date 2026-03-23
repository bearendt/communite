// apps/web/app/studio/[[...tool]]/page.tsx
// Embeds the Sanity Studio directly in the Next.js app.
// Protected: only users with Sanity credentials can access.
// Non-technical editors use this to manage blog posts, city pages, FAQs, etc.

"use client";

import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
