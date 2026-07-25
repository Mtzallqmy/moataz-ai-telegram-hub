import Link from "next/link";
import type { ContentKind, ContentSummary } from "@/lib/content";

const kindLabels: Record<ContentKind, string> = {
  article: "مقال",
  post: "منشور",
  book_summary: "ملخص كتاب",
};

export function ContentGrid({ items, basePath }: { items: ContentSummary[]; basePath: string }) {
  if (items.length === 0) {
    return <div className="content-empty"><b>لا يوجد محتوى منشور في هذا القسم بعد.</b><span>سيظهر المحتوى هنا فور نشره من لوحة الإدارة.</span></div>;
  }

  return (
    <div className="content-grid">
      {items.map((item) => (
        <article className="content-card" key={item.id}>
          <div className="content-card-meta">
            <span>{kindLabels[item.kind]}</span>
            {item.content_categories?.name_ar && <span>{item.content_categories.name_ar}</span>}
          </div>
          <h2><Link href={`${basePath}/${item.slug}`}>{item.title_ar}</Link></h2>
          <p>{item.excerpt_ar ?? "اقرأ المحتوى كاملًا للاطلاع على التفاصيل."}</p>
          <div className="content-card-footer">
            <time dateTime={item.published_at}>{new Intl.DateTimeFormat("ar-YE", { dateStyle: "medium" }).format(new Date(item.published_at))}</time>
            <Link href={`${basePath}/${item.slug}`}>قراءة المزيد ←</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
