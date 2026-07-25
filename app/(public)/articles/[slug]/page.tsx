import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentDetail } from "@/components/content-detail";
import { getPublishedContentBySlug } from "@/lib/content";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedContentBySlug(slug, "article");
  if (!item) return { title: "المقال غير موجود" };
  return {
    title: item.seo_title_ar ?? item.title_ar,
    description: item.seo_description_ar ?? item.excerpt_ar ?? undefined,
    alternates: { canonical: `/articles/${item.slug}` },
    openGraph: {
      type: "article",
      title: item.seo_title_ar ?? item.title_ar,
      description: item.seo_description_ar ?? item.excerpt_ar ?? undefined,
      publishedTime: item.published_at,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublishedContentBySlug(slug, "article");
  if (!item) notFound();
  return <ContentDetail item={item} backHref="/articles" backLabel="العودة إلى المقالات" />;
}
