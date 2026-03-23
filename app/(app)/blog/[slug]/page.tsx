// apps/web/app/(app)/blog/[slug]/page.tsx
import { sanityClient, getPost, urlFor } from "@/lib/sanity";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PortableText } from "@portabletext/react";
import type { SanityPost } from "@/lib/sanity";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  let post = null;
  try { post = await getPost(params.slug); } catch {}
  if (!post) return { title: "Post not found" };
  return {
    title: `${post.title} · Communitē`,
    description: post.excerpt,
  };
}

export async function generateStaticParams() {
  let posts: Array<{ slug: { current: string } }> = [];
  try { posts = await sanityClient.fetch<Array<{ slug: { current: string } }>>(
    `*[_type == "post" && defined(slug.current)]{ slug }`
  ); } catch {}
  return posts.map((p) => ({ slug: p.slug.current }));
}

const CATEGORY_LABELS: Record<string, string> = {
  community: "Community",
  food: "Food & Culture",
  hosting: "For Hosts",
  safety: "Safety",
  partnerships: "Partnerships",
};

export default async function BlogPostPage({ params }: Props) {
  let post = null;
  try { post = await getPost(params.slug); } catch {}
  if (!post) return notFound();

  const coverUrl = post.coverImage
    ? urlFor(post.coverImage).width(1200).height(630).url()
    : null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <Link
        href="/blog"
        className="text-sm text-stone-400 hover:text-stone-600 mb-8 block"
      >
        ← Community Stories
      </Link>

      {/* Header */}
      <div className="mb-8">
        {post.category && (
          <span className="text-xs font-medium uppercase tracking-wide text-[#7A9E7E] mb-3 block">
            {CATEGORY_LABELS[post.category] ?? post.category}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 leading-tight mb-4">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="text-lg text-stone-500 leading-relaxed">{post.excerpt}</p>
        )}

        <div className="flex items-center gap-3 mt-5 text-sm text-stone-400">
          {post.author && <span>{post.author}</span>}
          {post.author && post.publishedAt && <span>·</span>}
          {post.publishedAt && (
            <span>
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Cover image */}
      {coverUrl && (
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10">
          <Image
            src={coverUrl}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Body */}
      {post.body && (
        <div className="prose prose-stone prose-lg max-w-none
          prose-headings:font-semibold
          prose-a:text-[#C2714F] prose-a:no-underline hover:prose-a:underline
          prose-img:rounded-2xl
          prose-blockquote:border-l-[#7A9E7E] prose-blockquote:text-stone-500">
          <PortableText value={post.body as any} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-stone-100 text-center">
        <p className="text-stone-500 text-sm mb-4">
          Find your next gathering →
        </p>
        <Link
          href="/events"
          className="bg-stone-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          Browse events
        </Link>
      </div>
    </main>
  );
}
