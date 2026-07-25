import { corsHeaders } from "@/lib/cors";
export async function OPTIONS(request:Request){return new Response(null,{status:204,headers:corsHeaders(request)});}
