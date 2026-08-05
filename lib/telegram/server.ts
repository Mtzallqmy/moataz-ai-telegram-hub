import { createClient } from "@supabase/supabase-js";
import { createHash, randomInt } from "node:crypto";

const LINK_CODE_TTL_MINUTES = 10;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function createTelegramAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function getTelegramBotToken() {
  return requireEnv("TELEGRAM_BOT_TOKEN");
}

export function getTelegramWebhookSecret() {
  return requireEnv("TELEGRAM_WEBHOOK_SECRET");
}

export function generateTelegramLinkCode() {
  return randomInt(100_000, 1_000_000).toString();
}

export function hashTelegramLinkCode(code: string) {
  return createHash("sha256")
    .update(`${code}:${requireEnv("TELEGRAM_LINK_CODE_SECRET")}`)
    .digest("hex");
}

export function telegramLinkCodeExpiresAt() {
  return new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60_000).toISOString();
}

export async function sendTelegramMessage(chatId: number, text: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${getTelegramBotToken()}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with ${response.status}`);
  }
}

export async function isTelegramFeatureEnabled(userId: string, featureKey: string) {
  const supabase = createTelegramAdminClient();
  const { data, error } = await supabase
    .from("telegram_user_features")
    .select("enabled")
    .eq("user_id", userId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  if (error) throw error;
  return data?.enabled === true;
}
