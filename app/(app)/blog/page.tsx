// apps/web/app/(app)/blog/page.tsx
import { getPosts, urlFor } from "@/lib/sanity";
import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Community Stories · Communitē" };

const CATEGORY_LABELS: Record<string, string> = {
  community: "Community",
  food: "Food & Culture",
  hosting: "For Hosts",
  safety: "Safety",
  partnerships: "Partnerships",
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  let posts: any[] = [];
  try {
    posts = await getPosts(searchParams?.category);
  } catch {}

  const categories = Object.entries(CATEGORY_LABELS);

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-stone-900">Community Stories</h1>
        <p className="text-stone-500 mt-1">
          Recipes, gatherings, and the people rebuilding neighborhood life.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link
          href="/blog"
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !searchParams.category
              ? "bg-stone-900 text-white"
              : "border border-stone-200 text-stone-600 hover:border-stone-400"
          }`}
        >
          All
        </Link>
        {categories.map(([value, label]) => (
          <Link
            key={value}
            href={`/blog?category=${value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              searchParams.category === value
                ? "bg-stone-900 text-white"
                : "border border-stone-200 text-stone-600 hover:border-stone-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="text-3xl mb-3">✍️</p>
          <p className="text-sm">No stories yet. Check back soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post._id}
              href={`/blog/${post.slug.current}`}
              className="group bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
            >
              {post.coverImage && (
                <div className="aspect-video relative overflow-hidden bg-stone-100">
                  <Image
                    src={urlFor(post.coverImage).width(600).height(338).url()}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-5">
                {post.category && (
                  <span className="text-xs font-medium text-[#7A9E7E] uppercase tracking-wide">
                    {CATEGORY_LABELS[post.category] ?? post.category}
                  </span>
                )}
                <h2 className="font-semibold text-stone-900 mt-1 mb-2 line-clamp-2 group-hover:text-[#C2714F] transition-colors">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-stone-500 line-clamp-2">{post.excerpt}</p>
                )}
                <div className="flex items-center gap-3 mt-4 text-xs text-stone-400">
                  {post.author && <span>{post.author}</span>}
                  {post.publishedAt && (
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
