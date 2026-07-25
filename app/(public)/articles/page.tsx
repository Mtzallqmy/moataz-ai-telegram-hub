import { ContentGrid } from "@/components/content-grid";
import { listPublishedContent } from "@/lib/content";

export const revalidate = 60;

export default async function ArticlesPage() {
  const items = await listPublishedContent("article");
  return (
    <main className="content-page shell">
      <header className="content-page-header">
        <span className="eyebrow">المعرفة التقنية</span>
        <h1>المقالات</h1>
        <p>مقالات عربية عملية في الذكاء الاصطناعي والبرمجة والصيدلة والأتمتة.</p>
      </header>
      <ContentGrid items={items} basePath="/articles" />
    </main>
  );
}
