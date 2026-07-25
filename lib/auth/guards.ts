import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSupabasePublicEnv } from "@/config/env";

export async function getSupabaseServerClient() {
  const env = requireSupabasePublicEnv();
  const store = await cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; proxy.ts persists refreshes.
        }
      },
    },
  });
}

const client = getSupabaseServerClient;
export async function getCurrentUser(){const {data:{user}}=await (await client()).auth.getUser();return user;}
export async function requireUser(returnTo="/chat"){const user=await getCurrentUser();if(!user)redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);return user;}
export async function requireGuest(){if(await getCurrentUser())redirect("/chat");}
export async function requirePermission(code:string){const user=await requireUser();const {data}=await (await client()).rpc("has_permission",{permission_code:code,target_user:user.id});if(!data)redirect("/403");return user;}
export async function requireRole(role:string){const user=await requireUser();const {data}=await (await client()).from("user_roles").select("roles!inner(name)").eq("user_id",user.id).eq("roles.name",role).maybeSingle();if(!data)redirect("/403");return user;}
export async function isOwner(){const user=await getCurrentUser();if(!user)return false;const {data}=await (await client()).rpc("is_owner",{target_user:user.id});return Boolean(data);}
export async function canAccessAdmin(){const user=await getCurrentUser();if(!user)return false;const {data}=await (await client()).rpc("has_permission",{permission_code:"admin.access",target_user:user.id});return Boolean(data);}
export async function hasCurrentPermission(code:string){const user=await getCurrentUser();if(!user)return false;const {data}=await (await client()).rpc("has_permission",{permission_code:code,target_user:user.id});return Boolean(data);}
export async function getCurrentProfile(){const user=await requireUser();const {data}=await (await client()).from("profiles").select("*").eq("id",user.id).single();return data;}
