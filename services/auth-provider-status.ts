import "server-only";
import { z } from "zod";
import { requireSupabasePublicEnv } from "@/config/env";

const authSettingsSchema = z.object({
  external: z.object({
    github: z.boolean().default(false),
    google: z.boolean().default(false),
    email: z.boolean().default(false),
  }).passthrough(),
  disable_signup: z.boolean().optional(),
});

export type AuthProviderStatus = {
  available: boolean;
  github: boolean;
  google: boolean;
  email: boolean;
  signupEnabled: boolean;
};

export async function getAuthProviderStatus(): Promise<AuthProviderStatus> {
  try {
    const env = requireSupabasePublicEnv();
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error("Auth settings request failed");
    const settings = authSettingsSchema.parse(await response.json());
    return {
      available: true,
      github: settings.external.github,
      google: settings.external.google,
      email: settings.external.email,
      signupEnabled: settings.disable_signup !== true,
    };
  } catch {
    return {
      available: false,
      github: false,
      google: false,
      email: false,
      signupEnabled: false,
    };
  }
}
