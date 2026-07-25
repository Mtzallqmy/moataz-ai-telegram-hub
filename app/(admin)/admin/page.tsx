import Link from "next/link";
import { getSupabaseServerClient, requirePermission } from "@/lib/auth/guards";
import { getAuthProviderStatus } from "@/services/auth-provider-status";

type HealthStatus="healthy"|"degraded"|"unavailable"|"unknown";

function number(value:number|null|undefined){return new Intl.NumberFormat("ar").format(value??0)}
function date(value:string|null|undefined){return value?new Intl.DateTimeFormat("ar",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value)):"لم يحدث بعد"}
function healthLabel(value:HealthStatus){return({healthy:"سليم",degraded:"متذبذب",unavailable:"متوقف",unknown:"غير مفحوص"})[value]}

export default async function AdminPage(){
  await requirePermission("admin.access");
  const supabase=await getSupabaseServerClient();
  const [users,providers,models,conversations,files,recentProviders,recentLogs,authProviders]=await Promise.all([
    supabase.from("profiles").select("id",{count:"exact",head:true}),
    supabase.from("ai_providers").select("id",{count:"exact",head:true}),
    supabase.from("ai_models").select("id",{count:"exact",head:true}),
    supabase.from("conversations").select("id",{count:"exact",head:true}),
    supabase.from("files").select("id",{count:"exact",head:true}),
    supabase.from("ai_providers").select("id,name,provider_type,enabled,health_status,last_health_check_at,last_latency_ms").order("updated_at",{ascending:false}).limit(5),
    supabase.from("audit_logs").select("id,action,resource_type,created_at").order("created_at",{ascending:false}).limit(6),
    getAuthProviderStatus(),
  ]);
  const connected=!users.error&&!providers.error&&!models.error;
  const metrics=[
    {label:"المستخدمون",value:number(users.count),hint:"حساب مسجل",href:"/admin/users",tone:"violet"},
    {label:"المزودات",value:number(providers.count),hint:"تكامل معرف",href:"/admin/providers",tone:"cyan"},
    {label:"النماذج",value:number(models.count),hint:"نموذج مسجل",href:"/admin/models",tone:"blue"},
    {label:"المحادثات",value:number(conversations.count),hint:"محادثة محفوظة",href:"/chat",tone:"amber"},
    {label:"الملفات",value:number(files.count),hint:"ملف في المكتبة",href:"/admin/media",tone:"rose"},
  ];
  return <div className="dashboard">
    <section className="dashboard-hero">
      <div><span className="dashboard-kicker">مرصد المنصة</span><h2>لوحة القيادة</h2><p>صورة مباشرة عن المستخدمين والمزودات والنماذج ونشاط النظام.</p></div>
      <div className={`connection-pill ${connected?"online":"offline"}`}><span/>{connected?"قاعدة البيانات متصلة":"تعذر جلب بعض البيانات"}</div>
    </section>
    <section className="metric-grid" aria-label="مؤشرات المنصة">
      {metrics.map((metric,index)=><Link href={metric.href} className={`metric-card ${metric.tone}`} key={metric.label}><div className="metric-top"><span>{metric.label}</span><b>{String(index+1).padStart(2,"0")}</b></div><strong>{metric.value}</strong><small>{metric.hint}</small><i aria-hidden="true">↗</i></Link>)}
    </section>
    <section className="dashboard-columns">
      <article className="dashboard-panel">
        <header><div><span className="panel-kicker">AI INFRASTRUCTURE</span><h3>حالة المزودات</h3></div><Link href="/admin/providers">إدارة المزودات</Link></header>
        {recentProviders.error?<p className="dashboard-empty">تعذر تحميل حالة المزودات.</p>:recentProviders.data?.length?<div className="provider-health-list">{recentProviders.data.map(provider=><div className="provider-health" key={provider.id}><div className={`provider-orb ${provider.health_status}`}>{provider.name.slice(0,1).toUpperCase()}</div><div><b>{provider.name}</b><small>{provider.provider_type} · {provider.enabled?"مفعّل":"معطّل"}</small></div><span className={`health-tag ${provider.health_status}`}>{healthLabel(provider.health_status as HealthStatus)}</span><div className="latency"><b>{provider.last_latency_ms??"—"}</b><small>ms</small></div></div>)}</div>:<div className="dashboard-empty"><b>لا توجد مزودات بعد</b><span>أضف أول مزود ثم اختبر الاتصال من لوحة الإدارة.</span><Link className="button primary" href="/admin/providers">إضافة مزود</Link></div>}
      </article>
      <article className="dashboard-panel">
        <header><div><span className="panel-kicker">AUDIT TRAIL</span><h3>آخر النشاطات</h3></div><Link href="/admin/logs">عرض السجل</Link></header>
        {recentLogs.error?<p className="dashboard-empty">لا تملك صلاحية قراءة سجل التدقيق.</p>:recentLogs.data?.length?<div className="activity-list">{recentLogs.data.map(log=><div className="activity-item" key={log.id}><span className="activity-icon">✓</span><div><b>{log.action}</b><small>{log.resource_type}</small></div><time>{date(log.created_at)}</time></div>)}</div>:<div className="dashboard-empty"><b>لا توجد أحداث مسجلة</b><span>ستظهر هنا عمليات الإدارة واختبارات الاتصال.</span></div>}
      </article>
    </section>
    <section className="quick-actions">
      <div><span className="panel-kicker">QUICK ACTIONS</span><h3>وصول سريع</h3></div>
      <nav><Link href="/admin/providers">إضافة مزود <span>←</span></Link><Link href="/admin/models">إدارة النماذج <span>←</span></Link><Link href="/admin/users">إدارة المستخدمين <span>←</span></Link><Link href="/admin/settings">إعدادات المنصة <span>←</span></Link></nav>
    </section>
    <section className="auth-health-panel">
      <div><span className="panel-kicker">IDENTITY STATUS</span><h3>تسجيل الدخول</h3><p>فحص حي لإعدادات المصادقة التي تستخدمها واجهة الموقع.</p></div>
      <div className="auth-provider-grid">
        <div><span className={`status-dot ${authProviders.github?"enabled":"disabled"}`}/><b>GitHub</b><small>{authProviders.github?"مفعّل":"غير مفعّل"}</small></div>
        <div><span className={`status-dot ${authProviders.google?"enabled":"disabled"}`}/><b>Google</b><small>{authProviders.google?"مفعّل":"غير مفعّل"}</small></div>
        <div><span className={`status-dot ${authProviders.signupEnabled?"enabled":"disabled"}`}/><b>التسجيل</b><small>{authProviders.signupEnabled?"مسموح":"متوقف"}</small></div>
        <div><span className={`status-dot ${authProviders.available?"enabled":"disabled"}`}/><b>خدمة الهوية</b><small>{authProviders.available?"متصلة":"تعذر الفحص"}</small></div>
      </div>
    </section>
  </div>
}
