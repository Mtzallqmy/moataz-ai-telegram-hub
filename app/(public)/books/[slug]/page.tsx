import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentDetail } from "@/components/content-detail";
import { getPublishedContentBySlug } from "@/lib/content";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedContentBySlug(slug, "book_summary");
  return item ? {
    title: item.seo_title_ar ?? item.title_ar,
    description: item.seo_description_ar ?? item.excerpt_ar ?? undefined,
    alternates: { canonical: `/books/${item.slug}` },
  } : { title: "ملخص الكتاب غير موجود" };
}

export default async function BookSummaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublishedContentBySlug(slug, "book_summary");
  if (!item) notFound();
  return <ContentDetail item={item} backHref="/books" backLabel="العودة إلى ملخصات الكتب" />;
}
