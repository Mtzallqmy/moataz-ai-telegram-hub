import { ContentManager } from "@/components/content-manager";

export default function ContentAdminPage() {
  return (
    <section className="page-section">
      <h1>إدارة المحتوى</h1>
      <p>إنشاء المقالات والمنشورات وملخصات الكتب، ثم مراجعتها ونشرها أو أرشفتها.</p>
      <ContentManager />
    </section>
  );
}
