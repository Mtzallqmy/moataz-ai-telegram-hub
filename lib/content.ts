import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabasePublicEnv } from "@/config/env";

export type ContentKind = "article" | "post" | "book_summary";

export type ContentCategory = {
  slug: string;
  name_ar: string;
  name_en: string | null;
};

export type ContentSummary = {
  id: string;
  kind: ContentKind;
  slug: string;
  title_ar: string;
  title_en: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  cover_image_url: string | null;
  tags: string[];
  featured: boolean;
  published_at: string;
  content_categories: ContentCategory | null;
};

export type ContentItem = ContentSummary & {
  body_ar: string;
  body_en: string | null;
  seo_title_ar: string | null;
  seo_title_en: string | null;
  seo_description_ar: string | null;
  seo_description_en: string | null;
};

const summaryFields = "id,kind,slug,title_ar,title_en,excerpt_ar,excerpt_en,cover_image_url,tags,featured,published_at,content_categories(slug,name_ar,name_en)";
const detailFields = `${summaryFields},body_ar,body_en,seo_title_ar,seo_title_en,seo_description_ar,seo_description_en`;

function createPublicContentClient() {
  try {
    const env = requireSupabasePublicEnv();
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch {
    console.error("Public content backend is not configured");
    return null;
  }
}

export async function listPublishedContent(kind: ContentKind, limit = 12): Promise<ContentSummary[]> {
  const client = createPublicContentClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("content_items")
      .select(summaryFields)
      .eq("kind", kind)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));

    if (error) {
      console.error("Published content query failed", { code: error.code });
      return [];
    }
    return (data ?? []) as unknown as ContentSummary[];
  } catch {
    console.error("Published content backend is temporarily unavailable");
    return [];
  }
}

export async function listFeaturedContent(limit = 3): Promise<ContentSummary[]> {
  const client = createPublicContentClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from("content_items")
      .select(summaryFields)
      .eq("status", "published")
      .eq("featured", true)
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 12));

    if (error) {
      console.error("Featured content query failed", { code: error.code });
      return [];
    }
    return (data ?? []) as unknown as ContentSummary[];
  } catch {
    console.error("Featured content backend is temporarily unavailable");
    return [];
  }
}

export async function getPublishedContentBySlug(slug: string, kind?: ContentKind): Promise<ContentItem | null> {
  const client = createPublicContentClient();
  if (!client) return null;

  try {
    let query = client
      .from("content_items")
      .select(detailFields)
      .eq("slug", slug)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString());

    if (kind) query = query.eq("kind", kind);
    const { data, error } = await query.maybeSingle();
    if (error) {
      console.error("Content detail query failed", { code: error.code });
      return null;
    }
    return data as unknown as ContentItem | null;
  } catch {
    console.error("Content detail backend is temporarily unavailable");
    return null;
  }
}
