import { LoginForm } from "@/components/login-form";
import { SiteHeader } from "@/components/site-header";
import { requireSupabasePublicEnv } from "@/config/env";
import { safeRelativePath } from "@/lib/safe-redirect";
import { getAuthProviderStatus } from "@/services/auth-provider-status";

export default async function LoginPage({searchParams}:{searchParams:Promise<{returnTo?:string;error?:string}>}){
  const [query,providers]=await Promise.all([searchParams,getAuthProviderStatus()]);
  const env=requireSupabasePublicEnv();
  return <div className="site-page"><SiteHeader/><main className="page-shell"><section className="auth-card"><span className="state-icon">⌾</span><h1>مرحبًا بك</h1><p>سجّل الدخول للوصول إلى محادثاتك وملفاتك وإعدادات حسابك.</p><LoginForm configuration={{url:env.NEXT_PUBLIC_SUPABASE_URL,publishableKey:env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}} providers={{github:providers.github,google:providers.google,email:providers.email}} returnTo={safeRelativePath(query.returnTo)}/>{query.error&&<p className="notice">تعذر إكمال المصادقة أو رُفض الإذن. حاول مرة أخرى.</p>}</section></main></div>;
}
