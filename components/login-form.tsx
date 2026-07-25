"use client";
import { useState } from "react";
import { createSupabaseBrowserClient, type SupabaseBrowserConfiguration } from "@/lib/supabase/browser";

type LoginFormProps={
  configuration:SupabaseBrowserConfiguration;
  returnTo?:string;
  providers:{github:boolean;google:boolean;email:boolean};
};

export function LoginForm({configuration,providers,returnTo="/chat"}:LoginFormProps){
  const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState<string|null>(null);const [email,setEmail]=useState("");const [password,setPassword]=useState("");
  async function signIn(provider:"google"|"github"){
    setBusy(provider);setError(null);
    try{
      const supabase=createSupabaseBrowserClient(configuration);
      const callback=new URL("/auth/callback",window.location.origin);
      callback.searchParams.set("next",returnTo);
      const {data,error}=await supabase.auth.signInWithOAuth({
        provider,
        options:{
          redirectTo:callback.toString(),
          ...(provider==="github"?{scopes:"read:user user:email"}:{}),
        },
      });
      if(error)throw error;
      if(!data.url)throw new Error("OAuth redirect URL is unavailable");
      window.location.assign(data.url);
    }catch(cause){
      setError(cause instanceof Error?cause.message:"تعذر بدء تسجيل الدخول");
      setBusy(null);
    }
  }
  async function passwordLogin(event:React.FormEvent){event.preventDefault();setBusy("password");setError(null);try{const {error}=await createSupabaseBrowserClient(configuration).auth.signInWithPassword({email,password});if(error)throw error;window.location.assign(returnTo);}catch(cause){setError(cause instanceof Error?cause.message:"بيانات الدخول غير صحيحة");setBusy(null);}}
  return <><div className="auth-actions"><button className="button oauth-button" disabled={!providers.google||busy!==null} onClick={()=>void signIn("google")}><span className="oauth-mark">G</span><span>{busy==="google"?"جارٍ التحويل…":"المتابعة بواسطة Google"}</span></button><button className="button oauth-button github" disabled={!providers.github||busy!==null} onClick={()=>void signIn("github")}><span className="oauth-mark">GH</span><span>{busy==="github"?"جارٍ التحويل…":"المتابعة بواسطة GitHub"}</span></button></div>{providers.email&&<form className="password-form" onSubmit={passwordLogin}><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="البريد الإلكتروني"/><input type="password" required minLength={8} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور"/><button className="button primary" disabled={busy!==null}>تسجيل الدخول</button><a href="/forgot-password">نسيت كلمة المرور؟</a></form>}{!providers.github&&!providers.google&&!providers.email&&<p className="notice">لا يوجد مزود تسجيل دخول مفعّل حاليًا.</p>}{error&&<p className="notice" role="alert">تعذر بدء تسجيل الدخول. أعد المحاولة، وإن استمرت المشكلة فتأكد من إعداد مزود GitHub.</p>}</>;
}
