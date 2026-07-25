import Link from "next/link";
import { FeatureCard } from "@/components/feature-card";
import { FeaturedContent } from "@/components/featured-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listFeaturedContent } from "@/lib/content";

export const revalidate = 60;

export default async function Home() {
  const featured = await listFeaturedContent(3);
  return (
    <div className="site-page">
      <SiteHeader />
      <main>
        <section className="hero shell">
          <span className="eyebrow">منصة عربية للذكاء الاصطناعي والمعرفة</span>
          <h1>أدوات ذكية ومحتوى عملي، <em>في مساحة واحدة.</em></h1>
          <p>استخدم نماذج الذكاء الاصطناعي من خلال بنية متعددة المزودات، واقرأ محتوى عربيًا متخصصًا في التقنية والبرمجة والصيدلة والأتمتة.</p>
          <div className="actions"><Link className="button primary" href="/login">الدخول إلى المنصة</Link><Link className="button secondary" href="/articles">استكشف المحتوى</Link></div>
          <div className="status-line"><span>صلاحيات دقيقة</span><span>مفاتيح محمية خادميًا</span><span>محتوى مرتبط بقاعدة البيانات</span></div>
        </section>
        <section className="shell feature-grid" aria-label="قدرات المنصة">
          <FeatureCard icon="✦" title="دردشة متعددة المزودات" description="طبقة موحدة تتيح إضافة المزودات والنماذج واختبارها وإدارتها من لوحة التحكم." status="جاهزة عند إضافة مزود" />
          <FeatureCard icon="▤" title="نظام محتوى فعلي" description="مقالات ومنشورات وملخصات كتب بتصنيفات، مراجعات، نشر منظم وبيانات SEO." status="مفعّل" />
          <FeatureCard icon="⌾" title="إدارة وأمان" description="صلاحيات حسب الدور، سجل تدقيق، حماية للجلسات، وواجهات خادمية للبيانات الحساسة." status="محمي" />
        </section>
        <FeaturedContent items={featured} />
      </main>
      <SiteFooter />
    </div>
  );
}
