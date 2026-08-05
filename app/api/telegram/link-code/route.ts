import { NextRequest, NextResponse } from "next/server";
import {
  createTelegramAdminClient,
  generateTelegramLinkCode,
  hashTelegramLinkCode,
  telegramLinkCodeExpiresAt,
} from "@/lib/telegram/server";

export const runtime = "nodejs";

function bearerToken(request: NextRequest) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : null;
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createTelegramAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData.user;

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const code = generateTelegramLinkCode();
  const expiresAt = telegramLinkCodeExpiresAt();

  await supabase
    .from("telegram_link_codes")
    .delete()
    .eq("user_id", user.id)
    .is("consumed_at", null);

  const { error } = await supabase.from("telegram_link_codes").insert({
    user_id: user.id,
    code_hash: hashTelegramLinkCode(code),
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: "link_code_creation_failed" }, { status: 500 });
  }

  return NextResponse.json(
    {
      code,
      expires_at: expiresAt,
      instructions: "أرسل هذا الكود إلى بوت الموقع مرة واحدة لإكمال الربط.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
