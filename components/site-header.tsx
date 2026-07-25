import Link from "next/link";
export function SiteHeader() {
  return <header className="site-header"><div className="shell header-inner"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i/>M</span><span><b>Moataz AI</b><small>ذكاء بلا حدود</small></span></Link><nav className="nav" aria-label="التنقل العام"><Link href="/articles">المقالات</Link><Link href="/books">الكتب</Link><Link href="/posts">المنشورات</Link><Link href="/about">عن المنصة</Link><Link href="/contact">تواصل</Link></nav><Link className="button secondary" href="/login"><span className="status-dot"/> تسجيل الدخول</Link></div></header>;
}
