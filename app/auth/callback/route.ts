import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireSupabasePublicEnv } from "@/config/env";
import { safeRelativePath } from "@/lib/safe-redirect";
import { finalizeAuthenticatedUser } from "@/lib/supabase/admin";

export async function GET(request:NextRequest){
  const url=new URL(request.url);const code=url.searchParams.get("code");const next=safeRelativePath(url.searchParams.get("next"));
  const response=NextResponse.redirect(new URL(next,url.origin));
  if(!code)return NextResponse.redirect(new URL("/login?error=missing_code",url.origin));
  const env=requireSupabasePublicEnv();
  const supabase=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(cookies)=>cookies.forEach(({name,value,options})=>response.cookies.set(name,value,options))}});
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(error)return NextResponse.redirect(new URL("/login?error=oauth_failed",url.origin));
  const {data:{user}}=await supabase.auth.getUser();if(user)await finalizeAuthenticatedUser(user);
  return response;
}
