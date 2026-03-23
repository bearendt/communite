// apps/web/app/(app)/recipes/[id]/edit/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import RecipeForm from "../../new/page";

type Props = { params: { id: string } };

export const metadata = { title: "Edit Recipe" };

type Ingredient = { name: string; amount: string; unit?: string };
type Step = { order: number; instruction: string };

export default async function EditRecipePage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: { user: { select: { clerkId: true } } },
  });

  if (!recipe || recipe.user.clerkId !== userId) return notFound();

  const ingredients = recipe.ingredients as Ingredient[];
  const steps = recipe.steps as Step[];

  return (
    <RecipeForm
      recipeId={recipe.id}
      initialValues={{
        title: recipe.title,
        description: recipe.description ?? "",
        culturalNote: recipe.culturalNote ?? "",
        originCountry: recipe.originCountry ?? "",
        servings: recipe.servings?.toString() ?? "",
        tags: recipe.tags.join(", "),
        isPublic: recipe.isPublic,
        ingredients: ingredients.map((i) => ({
          name: i.name,
          amount: i.amount,
          unit: i.unit ?? "",
        })),
        steps: steps.map((s) => ({ order: s.order, instruction: s.instruction })),
      }}
    />
  );
}
