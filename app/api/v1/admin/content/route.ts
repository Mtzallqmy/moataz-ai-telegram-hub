import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, hasCurrentPermission } from "@/lib/auth/guards";
import { contentCreateSchema } from "@/schemas/content";

export const dynamic = "force-dynamic";

async function canReadContent() {
  return await hasCurrentPermission("content.edit") || await hasCurrentPermission("content.create") || await hasCurrentPermission("content.publish");
}

export async function GET() {
  if (!await canReadContent()) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const admin = createAdminClient();
  const [{ data: items, error: itemsError }, { data: categories, error: categoriesError }] = await Promise.all([
    admin.from("content_items").select("id,kind,slug,title_ar,title_en,excerpt_ar,body_ar,category_id,status,featured,tags,published_at,created_at,updated_at,content_categories(id,slug,name_ar)").order("updated_at", { ascending: false }).limit(100),
    admin.from("content_categories").select("id,slug,name_ar,name_en,is_active,sort_order").order("sort_order"),
  ]);
  if (itemsError || categoriesError) return Response.json({ error: { code: "DATABASE_ERROR" } }, { status: 500 });
  return Response.json({ data: { items: items ?? [], categories: categories ?? [] } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !await hasCurrentPermission("content.create")) return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const parsed = contentCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors } }, { status: 422 });
  if (parsed.data.status === "published" && !await hasCurrentPermission("content.publish")) return Response.json({ error: { code: "PUBLISH_FORBIDDEN" } }, { status: 403 });

  const value = parsed.data;
  const admin = createAdminClient();
  const { data, error } = await admin.from("content_items").insert({
    kind: value.kind,
    slug: value.slug,
    title_ar: value.titleAr,
    title_en: value.titleEn ?? null,
    excerpt_ar: value.excerptAr ?? null,
    excerpt_en: value.excerptEn ?? null,
    body_ar: value.bodyAr,
    body_en: value.bodyEn ?? null,
    category_id: value.categoryId ?? null,
    author_id: user.id,
    status: value.status,
    featured: value.featured,
    tags: value.tags,
    seo_title_ar: value.seoTitleAr ?? value.titleAr.slice(0, 70),
    seo_description_ar: value.seoDescriptionAr ?? value.excerptAr?.slice(0, 180) ?? null,
    published_at: value.status === "published" ? new Date().toISOString() : null,
  }).select("id,kind,slug,title_ar,status,featured,published_at,created_at,updated_at").single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return Response.json({ error: { code: error.code === "23505" ? "SLUG_EXISTS" : "CONTENT_CREATE_FAILED", message: error.code === "23505" ? "المعرّف مستخدم من قبل." : "تعذر حفظ المحتوى." } }, { status });
  }
  await admin.from("audit_logs").insert({ actor_user_id: user.id, action: "content.created", resource_type: "content_item", resource_id: data.id, metadata: { kind: value.kind, status: value.status } });
  return Response.json({ data }, { status: 201 });
}
