import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/config/env";

export type SupabaseBrowserConfiguration = {
  url: string;
  publishableKey: string;
};

export function createSupabaseBrowserClient(configuration?:SupabaseBrowserConfiguration){
  const env=configuration??(()=>{
    const runtime=requireSupabasePublicEnv();
    return {
      url:runtime.NEXT_PUBLIC_SUPABASE_URL,
      publishableKey:runtime.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };
  })();
  return createBrowserClient(env.url,env.publishableKey);
}
