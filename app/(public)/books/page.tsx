import { ContentGrid } from "@/components/content-grid";
import { listPublishedContent } from "@/lib/content";

export const revalidate = 60;

export default async function BooksPage() {
  const items = await listPublishedContent("book_summary");
  return (
    <main className="content-page shell">
      <header className="content-page-header">
        <span className="eyebrow">معرفة قابلة للتطبيق</span>
        <h1>ملخصات الكتب</h1>
        <p>خلاصات مركزة لأهم الأفكار، مع ربطها بالتطبيق العملي.</p>
      </header>
      <ContentGrid items={items} basePath="/books" />
    </main>
  );
}
