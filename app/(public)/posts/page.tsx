import { ContentGrid } from "@/components/content-grid";
import { listPublishedContent } from "@/lib/content";

export const revalidate = 60;

export default async function PostsPage() {
  const items = await listPublishedContent("post");
  return (
    <main className="content-page shell">
      <header className="content-page-header">
        <span className="eyebrow">تحديثات سريعة</span>
        <h1>المنشورات</h1>
        <p>أفكار قصيرة، تحديثات عملية، وأدوات تستحق التجربة.</p>
      </header>
      <ContentGrid items={items} basePath="/posts" />
    </main>
  );
}
