import { z } from "zod";

const flag = z.enum(["true", "false"]).default("false").transform((value) => value === "true");
const schema = z.object({
  AI_CHAT_ENABLED: flag,
  FILE_UPLOADS_ENABLED: flag,
  CONTENT_EDITOR_ENABLED: flag,
  TELEGRAM_INTEGRATION_ENABLED: flag,
  SCHEDULED_PUBLISHING_ENABLED: flag,
});

export const featureFlags = schema.parse({
  AI_CHAT_ENABLED: process.env.AI_CHAT_ENABLED,
  FILE_UPLOADS_ENABLED: process.env.FILE_UPLOADS_ENABLED,
  CONTENT_EDITOR_ENABLED: process.env.CONTENT_EDITOR_ENABLED,
  TELEGRAM_INTEGRATION_ENABLED: process.env.TELEGRAM_INTEGRATION_ENABLED,
  SCHEDULED_PUBLISHING_ENABLED: process.env.SCHEDULED_PUBLISHING_ENABLED,
});
export type FeatureFlag = keyof typeof featureFlags;
