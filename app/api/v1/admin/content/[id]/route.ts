import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, hasCurrentPermission } from "@/lib/auth/guards";
import { contentUpdateSchema } from "@/schemas/content";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !await hasCurrentPermission("content.edit")) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const parsed = contentUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors } }, { status: 422 });
  if (parsed.data.status === "published" && !await hasCurrentPermission("content.publish")) return Response.json({ error: { code: "PUBLISH_FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin.from("content_items").select("*").eq("id", id).maybeSingle();
  if (currentError || !current) return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const { data: latestRevision } = await admin.from("content_revisions").select("revision_number").eq("content_item_id", id).order("revision_number", { ascending: false }).limit(1).maybeSingle();
  await admin.from("content_revisions").insert({
    content_item_id: id,
    editor_id: user.id,
    revision_number: (latestRevision?.revision_number ?? 0) + 1,
    snapshot: current,
    change_summary: parsed.data.changeSummary ?? null,
  });

  const value = parsed.data;
  const patch: Record<string, unknown> = {};
  if (value.kind !== undefined) patch.kind = value.kind;
  if (value.slug !== undefined) patch.slug = value.slug;
  if (value.titleAr !== undefined) patch.title_ar = value.titleAr;
  if (value.titleEn !== undefined) patch.title_en = value.titleEn;
  if (value.excerptAr !== undefined) patch.excerpt_ar = value.excerptAr;
  if (value.excerptEn !== undefined) patch.excerpt_en = value.excerptEn;
  if (value.bodyAr !== undefined) patch.body_ar = value.bodyAr;
  if (value.bodyEn !== undefined) patch.body_en = value.bodyEn;
  if (value.categoryId !== undefined) patch.category_id = value.categoryId;
  if (value.featured !== undefined) patch.featured = value.featured;
  if (value.tags !== undefined) patch.tags = value.tags;
  if (value.seoTitleAr !== undefined) patch.seo_title_ar = value.seoTitleAr;
  if (value.seoDescriptionAr !== undefined) patch.seo_description_ar = value.seoDescriptionAr;
  if (value.status !== undefined) {
    patch.status = value.status;
    if (value.status === "published" && !current.published_at) patch.published_at = new Date().toISOString();
  }

  const { data, error } = await admin.from("content_items").update(patch).eq("id", id).select("id,kind,slug,title_ar,status,featured,published_at,updated_at").single();
  if (error) return Response.json({ error: { code: error.code === "23505" ? "SLUG_EXISTS" : "CONTENT_UPDATE_FAILED", message: "تعذر تحديث المحتوى." } }, { status: error.code === "23505" ? 409 : 500 });
  await admin.from("audit_logs").insert({ actor_user_id: user.id, action: "content.updated", resource_type: "content_item", resource_id: id, metadata: { fields: Object.keys(patch), status: value.status } });
  return Response.json({ data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !await hasCurrentPermission("content.delete")) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("content_items").delete().eq("id", id);
  if (error) return Response.json({ error: { code: "CONTENT_DELETE_FAILED" } }, { status: 500 });
  await admin.from("audit_logs").insert({ actor_user_id: user.id, action: "content.deleted", resource_type: "content_item", resource_id: id, metadata: {} });
  return new Response(null, { status: 204 });
}
