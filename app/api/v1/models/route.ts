import { getCurrentUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function GET(){const user=await getCurrentUser();if(!user)return Response.json({error:{code:"UNAUTHORIZED"}},{status:401});const {data,error}=await createAdminClient().from("ai_models").select("id,model_alias,display_name,description,input_modalities,output_modalities,capabilities,context_window,max_output_tokens,billing_tier,release_stage,ai_providers!inner(id,name,slug,health_status,enabled)").eq("enabled",true).eq("visible_to_users",true).eq("ai_providers.enabled",true).order("sort_order");if(error)return Response.json({error:{code:"DATABASE_ERROR",message:"تعذر تحميل النماذج."}},{status:500});return Response.json({data});}
