import { NextRequest, NextResponse } from "next/server";
import {
  createTelegramAdminClient,
  getTelegramWebhookSecret,
  hashTelegramLinkCode,
  sendTelegramMessage,
} from "@/lib/telegram/server";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat: { id: number };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
};

function extractLinkCode(text: string) {
  const normalized = text.trim();
  const startMatch = normalized.match(/^\/start(?:@\w+)?\s+([0-9]{6})$/i);
  if (startMatch) return startMatch[1];
  return /^[0-9]{6}$/.test(normalized) ? normalized : null;
}

export async function POST(request: NextRequest) {
  if (
    request.headers.get("x-telegram-bot-api-secret-token") !==
    getTelegramWebhookSecret()
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;
  const sender = message?.from;
  const text = message?.text;

  if (!message || !sender || !text) {
    return NextResponse.json({ ok: true });
  }

  const code = extractLinkCode(text);
  if (!code) {
    await sendTelegramMessage(
      message.chat.id,
      "أرسل كود الربط المكوّن من 6 أرقام الظاهر في حسابك بالموقع.",
    );
    return NextResponse.json({ ok: true });
  }

  const supabase = createTelegramAdminClient();
  const { data: linkedUserId, error } = await supabase.rpc(
    "consume_telegram_link_code",
    {
      p_code_hash: hashTelegramLinkCode(code),
      p_telegram_user_id: sender.id,
      p_telegram_chat_id: message.chat.id,
      p_telegram_username: sender.username ?? null,
      p_first_name: sender.first_name ?? null,
      p_last_name: sender.last_name ?? null,
    },
  );

  if (error) {
    console.error("Telegram linking failed", error);
    await sendTelegramMessage(message.chat.id, "تعذر إكمال الربط حاليًا. حاول لاحقًا.");
    return NextResponse.json({ ok: true });
  }

  if (!linkedUserId) {
    await sendTelegramMessage(
      message.chat.id,
      "الكود غير صحيح أو منتهي الصلاحية. أنشئ كودًا جديدًا من الموقع.",
    );
    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage(
    message.chat.id,
    "تم ربط حساب تيليجرام بحسابك في الموقع بنجاح. لن تحتاج إلى إنشاء بوت جديد.",
  );

  return NextResponse.json({ ok: true });
}
