import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabasePublicEnv } from "@/config/env";
import { ownerEmails, supabaseAdminKey } from "@/config/env.server";

export function createAdminClient(){if(!supabaseAdminKey)throw new Error("Supabase server secret is not configured");const env=requireSupabasePublicEnv();return createClient(env.NEXT_PUBLIC_SUPABASE_URL,supabaseAdminKey,{auth:{persistSession:false,autoRefreshToken:false}});}
function adminClient(){try{return createAdminClient();}catch{return null;}}
export async function finalizeAuthenticatedUser(user:{id:string;email?:string|null;app_metadata?:{provider?:string}}){
  const admin=adminClient();if(!admin)return;
  const email=user.email?.trim().toLowerCase();
  if(email&&ownerEmails.has(email)){const {data:role}=await admin.from("roles").select("id").eq("name","owner").single();if(role)await admin.from("user_roles").upsert({user_id:user.id,role_id:role.id,assigned_by:user.id},{onConflict:"user_id,role_id"});}
  await admin.from("login_events").insert({user_id:user.id,provider:user.app_metadata?.provider??"unknown",status:"success",metadata:{source:"oauth_callback"}});
}
