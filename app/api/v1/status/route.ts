import { featureFlags } from "@/config/feature-flags";
export async function GET(){return Response.json({status:"ok",version:"v1",features:featureFlags},{headers:{"Cache-Control":"no-store"}});}
