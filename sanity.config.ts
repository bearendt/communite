// apps/web/sanity.config.ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { defineType, defineField } from "sanity";

// packages/sanity/schemas/index.ts
// Sanity schema definitions for Communitē editorial content.
// These are managed in the Sanity Studio (/studio) by non-technical staff.
// Data flows: Sanity Studio → Content Lake → Next.js via GROQ queries


// ---- Blog / Community Stories ----
export const postSchema = defineType({
  name: "post",
  title: "Community Story",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" }, validation: (R) => R.required() }),
    defineField({ name: "excerpt", title: "Excerpt", type: "text", rows: 3 }),
    defineField({ name: "coverImage", title: "Cover Image", type: "image", options: { hotspot: true } }),
    defineField({ name: "body", title: "Body", type: "array", of: [{ type: "block" }, { type: "image" }] }),
    defineField({ name: "author", title: "Author", type: "string" }),
    defineField({ name: "publishedAt", title: "Published At", type: "datetime" }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      options: {
        list: [
          { title: "Community Stories", value: "community" },
          { title: "Food & Culture", value: "food" },
          { title: "Host Resources", value: "hosting" },
          { title: "Safety", value: "safety" },
          { title: "Partnerships", value: "partnerships" },
        ],
      },
    }),
    defineField({ name: "featured", title: "Featured on homepage", type: "boolean", initialValue: false }),
  ],
  preview: {
    select: { title: "title", subtitle: "category", media: "coverImage" },
  },
});

// ---- Partnership Announcements ----
export const partnerSchema = defineType({
  name: "partner",
  title: "Partner Organization",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Organization Name", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "name" } }),
    defineField({ name: "logo", title: "Logo", type: "image" }),
    defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
    defineField({
      name: "type",
      title: "Partnership Type",
      type: "string",
      options: {
        list: [
          { title: "Community Org", value: "community" },
          { title: "Blue Zone", value: "bluezone" },
          { title: "Farm / Supplier", value: "farm" },
          { title: "Senior Services", value: "senior" },
        ],
      },
    }),
    defineField({ name: "url", title: "Website", type: "url" }),
    defineField({ name: "featured", title: "Show on homepage", type: "boolean", initialValue: false }),
  ],
  preview: {
    select: { title: "name", subtitle: "type", media: "logo" },
  },
});

// ---- Safety Guides ----
export const safetyGuideSchema = defineType({
  name: "safetyGuide",
  title: "Safety Guide",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (R) => R.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title" }, validation: (R) => R.required() }),
    defineField({ name: "audience", title: "Audience", type: "string", options: { list: ["hosts", "guests", "everyone"] } }),
    defineField({ name: "summary", title: "Summary", type: "text", rows: 2 }),
    defineField({ name: "body", title: "Body", type: "array", of: [{ type: "block" }] }),
    defineField({ name: "order", title: "Sort Order", type: "number", initialValue: 100 }),
  ],
});

// ---- City Launch Pages ----
export const cityPageSchema = defineType({
  name: "cityPage",
  title: "City Launch Page",
  type: "document",
  fields: [
    defineField({ name: "city", title: "City Name", type: "string", validation: (R) => R.required() }),
    defineField({ name: "state", title: "State (2-letter)", type: "string", validation: (R) => R.max(2) }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "city" } }),
    defineField({ name: "heroTagline", title: "Hero Tagline", type: "string" }),
    defineField({ name: "description", title: "City Description", type: "text", rows: 3 }),
    defineField({ name: "heroImage", title: "Hero Image", type: "image", options: { hotspot: true } }),
    defineField({ name: "isLive", title: "City is live (show in nav)", type: "boolean", initialValue: false }),
    defineField({
      name: "launchStats",
      title: "Launch Stats",
      type: "object",
      fields: [
        defineField({ name: "hosts", title: "Hosts recruited", type: "number" }),
        defineField({ name: "events", title: "Events hosted", type: "number" }),
        defineField({ name: "members", title: "Members", type: "number" }),
      ],
    }),
  ],
  preview: {
    select: { title: "city", subtitle: "state", media: "heroImage" },
  },
});

// ---- FAQ ----
export const faqSchema = defineType({
  name: "faq",
  title: "FAQ",
  type: "document",
  fields: [
    defineField({ name: "question", title: "Question", type: "string", validation: (R) => R.required() }),
    defineField({ name: "answer", title: "Answer", type: "array", of: [{ type: "block" }] }),
    defineField({ name: "category", title: "Category", type: "string", options: { list: ["general", "hosts", "guests", "safety", "billing"] } }),
    defineField({ name: "order", title: "Sort Order", type: "number", initialValue: 100 }),
  ],
});

export const schemaTypes = [postSchema, partnerSchema, safetyGuideSchema, cityPageSchema, faqSchema];


export default defineConfig({
  name: "communite-studio",
  title: "Communitē Studio",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  basePath: "/studio",
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
