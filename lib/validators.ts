// packages/validators/src/index.ts
// All input validation schemas for Communitē
// Import these in API routes — never trust raw request bodies

import { z } from "zod";

// ============================================================
// PRIMITIVES
// ============================================================

export const CuidSchema = z.string().cuid();

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// ============================================================
// USER
// ============================================================

export const CreateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(50).trim(),
  bio: z.string().max(500).trim().optional(),
  dietaryNotes: z.string().max(300).trim().optional(),
  culturalBg: z.string().max(100).trim().optional(),
});

export const UpdateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(50).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  dietaryNotes: z.string().max(300).trim().optional(),
  culturalBg: z.string().max(100).trim().optional(),
  avatarUrl: z.string().url().optional(),
});

// ============================================================
// EVENTS
// ============================================================

const EventTypeEnum = z.enum([
  "POTLUCK",
  "WINE_TASTING",
  "FARM_TO_TABLE",
  "BLUE_ZONE",
  "CULTURAL_EXCHANGE",
  "ETHICAL_DINING",
  "WELCOME_NEIGHBOR",
]);

export const CreateEventSchema = z
  .object({
    title: z.string().min(5).max(100).trim(),
    description: z.string().min(20).max(2000).trim(),
    eventType: EventTypeEnum,
    theme: z.string().max(100).trim().optional(),
    maxGuests: z.number().int().min(2).max(50),

    addressLine1: z.string().min(5).max(200).trim(),
    addressLine2: z.string().max(100).trim().optional(),
    city: z.string().min(2).max(100).trim(),
    state: z.string().length(2).toUpperCase(),
    zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),

    startsAt: z.coerce.date().min(new Date(), "Event must be in the future"),
    endsAt: z.coerce.date(),

    isPrivate: z.boolean().default(false),
    requiresIdVerif: z.boolean().default(false),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "End time must be after start time",
    path: ["endsAt"],
  });

export const UpdateEventSchema = z.object({
  title: z.string().min(3).max(100).trim().optional(),
  description: z.string().min(20).max(2000).trim().optional(),
  eventType: z.enum(["POTLUCK","WINE_TASTING","FARM_TO_TABLE","BLUE_ZONE","CULTURAL_EXCHANGE","ETHICAL_DINING","WELCOME_NEIGHBOR"]).optional(),
  theme: z.string().max(100).trim().optional(),
  maxGuests: z.number().int().min(2).max(100).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  requiresIdVerif: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
});

export const EventQuerySchema = z
  .object({
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radiusKm: z.coerce.number().min(1).max(100).default(25),
    eventType: EventTypeEnum.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .merge(PaginationSchema);

// ============================================================
// RSVPs
// ============================================================

export const CreateRSVPSchema = z.object({
  note: z.string().max(500).trim().optional(),
});

export const UpdateRSVPSchema = z.object({
  status: z.enum(["CONFIRMED", "DECLINED"]),
});

// ============================================================
// DISH ASSIGNMENTS
// ============================================================

export const CreateDishSchema = z.object({
  dishName: z.string().min(2).max(100).trim(),
  category: z.enum([
    "APPETIZER",
    "MAIN",
    "SIDE",
    "DESSERT",
    "DRINK",
    "NON_ALCOHOLIC",
    "BREAD",
    "CONDIMENT",
    "OTHER",
  ]),
  servings: z.number().int().min(1).max(100).optional(),
  notes: z.string().max(500).trim().optional(),
});

// ============================================================
// REPORTS
// ============================================================

export const CreateReportSchema = z.object({
  subjectId: CuidSchema.optional(),
  eventId: CuidSchema.optional(),
  type: z.enum([
    "INAPPROPRIATE_BEHAVIOR",
    "SAFETY_CONCERN",
    "HARASSMENT",
    "FAKE_PROFILE",
    "NO_SHOW",
    "POLICY_VIOLATION",
    "OTHER",
  ]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  description: z.string().min(20).max(2000).trim(),
}).refine(
  (data) => data.subjectId || data.eventId,
  "Report must reference a user or event"
);

// ============================================================
// REVIEWS
// ============================================================

export const CreateReviewSchema = z.object({
  subjectId: CuidSchema,
  eventId: CuidSchema.optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(10).max(1000).trim(),
  reflections: z
    .object({
      wouldAttendAgain: z.boolean().optional(),
      feltWelcome: z.boolean().optional(),
      dishQuality: z.number().min(1).max(5).optional(),
      hostResponsiveness: z.number().min(1).max(5).optional(),
    })
    .optional(),
  isPublic: z.boolean().default(true),
});

// ============================================================
// SAFETY
// ============================================================

export const SafetyEscalationSchema = z.object({
  eventId: CuidSchema,
  description: z.string().min(10).max(1000).trim(),
  severity: z.enum(["MEDIUM", "HIGH", "CRITICAL"]),
});

export const CheckInSchema = z.object({
  safetyCode: z.string().length(6).toUpperCase(),
});

// ============================================================
// RECIPES
// ============================================================

const IngredientSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.string().max(50),
  unit: z.string().max(30).optional(),
});

const StepSchema = z.object({
  order: z.number().int().min(1),
  instruction: z.string().min(5).max(500),
});

export const CreateRecipeSchema = z.object({
  title: z.string().min(3).max(150).trim(),
  description: z.string().max(1000).trim().optional(),
  ingredients: z.array(IngredientSchema).min(1).max(100),
  steps: z.array(StepSchema).min(1).max(50),
  servings: z.number().int().min(1).max(200).optional(),
  culturalNote: z.string().max(1000).trim().optional(),
  originCountry: z.string().max(100).trim().optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  isPublic: z.boolean().default(false),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
export type EventQueryInput = z.infer<typeof EventQuerySchema>;
export type CreateRSVPInput = z.infer<typeof CreateRSVPSchema>;
export type CreateReportInput = z.infer<typeof CreateReportSchema>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
export type CreateRecipeInput = z.infer<typeof CreateRecipeSchema>;
export type SafetyEscalationInput = z.infer<typeof SafetyEscalationSchema>;
export type CreateUserProfileInput = z.infer<typeof CreateUserProfileSchema>;
