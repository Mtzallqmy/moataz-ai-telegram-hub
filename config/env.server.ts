import "server-only";
import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

const booleanEnv = z.preprocess(
  emptyToUndefined,
  z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
);

const schema = z.object({
  SUPABASE_SECRET_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(20).optional(),
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(20).optional(),
  ),
  PLATFORM_OWNER_EMAILS: z.string().default(""),
  PASSWORD_AUTH_ENABLED: booleanEnv,
  PROVIDER_ENCRYPTION_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(40).optional(),
  ),
  ALLOW_PRIVATE_PROVIDER_URLS: booleanEnv,
  MAX_UPLOAD_BYTES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().max(524288000).default(104857600),
  ),
});

export const serverEnv = schema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  PLATFORM_OWNER_EMAILS: process.env.PLATFORM_OWNER_EMAILS,
  PASSWORD_AUTH_ENABLED: process.env.PASSWORD_AUTH_ENABLED,
  PROVIDER_ENCRYPTION_KEY: process.env.PROVIDER_ENCRYPTION_KEY,
  ALLOW_PRIVATE_PROVIDER_URLS: process.env.ALLOW_PRIVATE_PROVIDER_URLS,
  MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
});

export const supabaseAdminKey =
  serverEnv.SUPABASE_SECRET_KEY ?? serverEnv.SUPABASE_SERVICE_ROLE_KEY;

export const ownerEmails = new Set(
  serverEnv.PLATFORM_OWNER_EMAILS.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
