// apps/web/app/(app)/recipes/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import DeleteRecipeButton from "./_components/DeleteRecipeButton";

type Props = { params: { id: string } };

type Ingredient = { name: string; amount: string; unit?: string };
type Step = { order: number; instruction: string };

export async function generateMetadata({ params }: Props) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    select: { title: true },
  });
  return { title: recipe?.title ?? "Recipe" };
}

export default async function RecipeDetailPage({ params }: Props) {
  const { userId } = await auth();

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, displayName: true, clerkId: true } },
    },
  });

  if (!recipe) return notFound();

  // Private recipes only visible to their owner
  const isOwner = userId && recipe.user.clerkId === userId;
  if (!recipe.isPublic && !isOwner) return notFound();

  const ingredients = recipe.ingredients as Ingredient[];
  const steps = recipe.steps as Step[];

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            {recipe.originCountry && (
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-2">
                🌍 {recipe.originCountry}
              </p>
            )}
            <h1 className="text-3xl font-semibold text-stone-900">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-stone-500 mt-2">{recipe.description}</p>
            )}
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/recipes/${recipe.id}/edit`}
                className="text-sm border border-stone-200 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-50"
              >
                Edit
              </Link>
              <DeleteRecipeButton recipeId={recipe.id} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {!recipe.isPublic && (
            <span className="text-xs bg-stone-100 text-stone-500 px-2.5 py-1 rounded-full">
              🔒 Private
            </span>
          )}
          {recipe.servings && (
            <span className="text-xs bg-stone-50 text-stone-600 px-2.5 py-1 rounded-full">
              🍽 {recipe.servings} servings
            </span>
          )}
          {recipe.tags.map((tag) => (
            <span key={tag} className="text-xs bg-stone-50 text-stone-500 px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Cultural story */}
      {recipe.culturalNote && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700 mb-2">
            The Story Behind This Dish
          </p>
          <p className="text-stone-700 leading-relaxed italic">"{recipe.culturalNote}"</p>
          <p className="text-sm text-stone-500 mt-3">
            — {recipe.user.displayName}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Ingredients */}
        <div className="md:col-span-1">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Ingredients</h2>
          <ul className="space-y-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline gap-2 text-sm">
                <span className="text-stone-400 shrink-0">·</span>
                <span>
                  <span className="font-medium text-stone-800">
                    {ing.amount}{ing.unit ? ` ${ing.unit}` : ""}
                  </span>{" "}
                  <span className="text-stone-600">{ing.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Method</h2>
          <ol className="space-y-5">
            {steps.map((step) => (
              <li key={step.order} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {step.order}
                </span>
                <p className="text-stone-700 leading-relaxed pt-0.5">{step.instruction}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Author */}
      <div className="mt-10 pt-8 border-t border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <span>Preserved by</span>
          <Link
            href={`/profile/${recipe.user.id}`}
            className="font-medium text-stone-700 hover:text-stone-900"
          >
            {recipe.user.displayName}
          </Link>
        </div>
        <p className="text-xs text-stone-300">
          Last updated {new Date(recipe.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </main>
  );
}
