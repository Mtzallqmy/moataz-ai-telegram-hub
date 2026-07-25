import Link from "next/link";

const userLinks = [["/chat","الدردشة"],["/account","الحساب"],["/account/files","ملفاتي"],["/account/settings","الإعدادات"]];
const adminLinks = [["/admin","نظرة عامة"],["/admin/users","المستخدمون"],["/admin/roles","الأدوار والصلاحيات"],["/admin/providers","المزودات"],["/admin/models","النماذج"],["/admin/content","المحتوى"],["/admin/contact","رسائل التواصل"],["/admin/categories","التصنيفات"],["/admin/media","الوسائط"],["/admin/schedules","الجدولة"],["/admin/integrations","التكاملات"],["/admin/settings","الإعدادات"],["/admin/logs","السجلات"]];

export function AppShell({ admin=false, title, children }: { admin?: boolean; title: string; children: React.ReactNode }) {
  const links = admin ? adminLinks : userLinks;
  return <div className="app-layout"><aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><i/>M</span><span><b>Moataz AI</b><small>منصة الذكاء المتعدد</small></span></Link><div className="workspace-chip"><span className="status-dot"/> {admin?"وضع الإدارة":"مساحتك الخاصة"}</div><nav className="side-nav" aria-label={admin?"التنقل الإداري":"تنقل الحساب"}>{links.map(([href,label],index)=><Link href={href} key={href}><span className="nav-index">{String(index+1).padStart(2,"0")}</span>{label}</Link>)}</nav><form className="sidebar-footer" action="/auth/logout" method="post"><button className="button secondary" type="submit">تسجيل الخروج</button></form></aside><main className="app-main"><header className="app-top"><div><small>{admin ? "CONTROL CENTER" : "PRIVATE WORKSPACE"}</small><h1>{title}</h1></div><Link className="button secondary" href="/">الموقع العام</Link></header>{children}</main></div>;
}
