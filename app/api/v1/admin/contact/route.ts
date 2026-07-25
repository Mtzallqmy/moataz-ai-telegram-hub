import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, hasCurrentPermission } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "in_progress", "resolved", "spam", "archived"]),
});

export async function GET() {
  if (!await hasCurrentPermission("admin.access")) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const { data, error } = await createAdminClient().from("contact_messages").select("id,name,email,subject,message,status,handled_at,created_at,updated_at").order("created_at", { ascending: false }).limit(200);
  return error ? Response.json({ error: { code: "DATABASE_ERROR" } }, { status: 500 }) : Response.json({ data: data ?? [] });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || !await hasCurrentPermission("admin.access")) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR" } }, { status: 422 });
  const terminal = parsed.data.status === "resolved" || parsed.data.status === "archived" || parsed.data.status === "spam";
  const admin = createAdminClient();
  const { data, error } = await admin.from("contact_messages").update({ status: parsed.data.status, handled_by: user.id, handled_at: terminal ? new Date().toISOString() : null }).eq("id", parsed.data.id).select("id,status,handled_at,updated_at").single();
  if (error) return Response.json({ error: { code: "MESSAGE_UPDATE_FAILED" } }, { status: 500 });
  await admin.from("audit_logs").insert({ actor_user_id: user.id, action: "contact.status_updated", resource_type: "contact_message", resource_id: parsed.data.id, metadata: { status: parsed.data.status } });
  return Response.json({ data });
}
