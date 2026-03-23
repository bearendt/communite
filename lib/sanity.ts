// apps/web/lib/sanity.ts
// Sanity client and GROQ query helpers for Communitē editorial content.
// Used in Server Components only — never import in client components.

import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2024-01-01",
  useCdn: true,
});

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

// ---- GROQ Queries ----
// Each query is typed and exported for use in Server Components.

export type SanityPost = {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  coverImage: SanityImageSource;
  author: string;
  publishedAt: string;
  category: string;
  featured: boolean;
};

export type SanityPartner = {
  _id: string;
  name: string;
  slug: { current: string };
  logo: SanityImageSource;
  description: string;
  type: string;
  url: string;
};

export type SanityCityPage = {
  _id: string;
  city: string;
  state: string;
  slug: { current: string };
  heroTagline: string;
  description: string;
  heroImage: SanityImageSource;
  isLive: boolean;
  launchStats: { hosts: number; events: number; members: number };
};

export type SanityFAQ = {
  _id: string;
  question: string;
  answer: unknown[];  // Portable Text blocks
  category: string;
  order: number;
};

// Featured posts for homepage
export async function getFeaturedPosts(): Promise<SanityPost[]> {
  return sanityClient.fetch(`
    *[_type == "post" && featured == true && defined(publishedAt)]
    | order(publishedAt desc)[0...3] {
      _id, title, slug, excerpt, coverImage, author, publishedAt, category
    }
  `);
}

// All posts, optionally filtered by category
export async function getPosts(category?: string): Promise<SanityPost[]> {
  const filter = category
    ? `_type == "post" && category == $category && defined(publishedAt)`
    : `_type == "post" && defined(publishedAt)`;

  return sanityClient.fetch(
    `*[${filter}] | order(publishedAt desc) { _id, title, slug, excerpt, coverImage, author, publishedAt, category }`,
    { category }
  );
}

// Single post by slug
export async function getPost(slug: string): Promise<(SanityPost & { body: unknown[] }) | null> {
  return sanityClient.fetch(
    `*[_type == "post" && slug.current == $slug][0] { _id, title, slug, excerpt, coverImage, author, publishedAt, category, body }`,
    { slug }
  );
}

// Featured partners (homepage)
export async function getFeaturedPartners(): Promise<SanityPartner[]> {
  return sanityClient.fetch(`
    *[_type == "partner" && featured == true] | order(name asc) {
      _id, name, slug, logo, description, type, url
    }
  `);
}

// Live cities
export async function getLiveCities(): Promise<SanityCityPage[]> {
  return sanityClient.fetch(`
    *[_type == "cityPage" && isLive == true] | order(city asc) {
      _id, city, state, slug, heroTagline, launchStats
    }
  `);
}

// City page by slug
export async function getCityPage(slug: string): Promise<SanityCityPage | null> {
  return sanityClient.fetch(
    `*[_type == "cityPage" && slug.current == $slug][0]`,
    { slug }
  );
}

// FAQs by category
export async function getFAQs(category?: string): Promise<SanityFAQ[]> {
  const filter = category
    ? `_type == "faq" && category == $category`
    : `_type == "faq"`;

  return sanityClient.fetch(
    `*[${filter}] | order(order asc) { _id, question, answer, category }`,
    { category }
  );
}
