import Link from "next/link";
import type { ContentKind, ContentSummary } from "@/lib/content";

const paths: Record<ContentKind, string> = { article: "/articles", post: "/posts", book_summary: "/books" };
const labels: Record<ContentKind, string> = { article: "مقال", post: "منشور", book_summary: "ملخص كتاب" };

export function FeaturedContent({ items }: { items: ContentSummary[] }) {
  if (items.length === 0) return null;
  return (
    <section className="shell featured-section">
      <header><div><span className="eyebrow">مختارات حديثة</span><h2>من المحتوى المنشور</h2></div><Link href="/articles">عرض جميع المقالات ←</Link></header>
      <div className="content-grid">
        {items.map((item) => <article className="content-card" key={item.id}><div className="content-card-meta"><span>{labels[item.kind]}</span>{item.content_categories?.name_ar && <span>{item.content_categories.name_ar}</span>}</div><h3><Link href={`${paths[item.kind]}/${item.slug}`}>{item.title_ar}</Link></h3><p>{item.excerpt_ar ?? "اقرأ المحتوى كاملًا."}</p><div className="content-card-footer"><time dateTime={item.published_at}>{new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium" }).format(new Date(item.published_at))}</time><Link href={`${paths[item.kind]}/${item.slug}`}>قراءة ←</Link></div></article>)}
      </div>
    </section>
  );
}
