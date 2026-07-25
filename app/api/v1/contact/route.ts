import { createAdminClient } from "@/lib/supabase/admin";
import { contactMessageSchema } from "@/schemas/contact";

export const dynamic = "force-dynamic";

async function hashValue(value: string) {
  const bytes = new TextEncoder().encode(value || "unknown");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const parsed = contactMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "تحقق من البيانات المدخلة.", details: parsed.error.flatten().fieldErrors } }, { status: 422 });
  }

  if (parsed.data.website) return Response.json({ data: { accepted: true } }, { status: 202 });

  try {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const sourceIp = forwarded || request.headers.get("cf-connecting-ip") || "unknown";
    const ipHash = await hashValue(sourceIp);
    const admin = createAdminClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if (countError) return Response.json({ error: { code: "DATABASE_ERROR" } }, { status: 500 });
    if ((count ?? 0) >= 5) {
      return Response.json({ error: { code: "RATE_LIMITED", message: "تم تجاوز عدد الرسائل المسموح مؤقتًا. حاول لاحقًا." } }, { status: 429 });
    }

    const { error } = await admin.from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      ip_hash: ipHash,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
    });

    if (error) return Response.json({ error: { code: "MESSAGE_SAVE_FAILED", message: "تعذر حفظ الرسالة الآن." } }, { status: 500 });
    return Response.json({ data: { accepted: true } }, { status: 201 });
  } catch {
    return Response.json({ error: { code: "CONTACT_UNAVAILABLE", message: "خدمة التواصل غير متاحة مؤقتًا." } }, { status: 503 });
  }
}
