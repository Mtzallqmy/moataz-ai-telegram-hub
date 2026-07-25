import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentDetail } from "@/components/content-detail";
import { getPublishedContentBySlug } from "@/lib/content";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedContentBySlug(slug, "post");
  return item ? {
    title: item.seo_title_ar ?? item.title_ar,
    description: item.seo_description_ar ?? item.excerpt_ar ?? undefined,
    alternates: { canonical: `/posts/${item.slug}` },
  } : { title: "المنشور غير موجود" };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublishedContentBySlug(slug, "post");
  if (!item) notFound();
  return <ContentDetail item={item} backHref="/posts" backLabel="العودة إلى المنشورات" />;
}
