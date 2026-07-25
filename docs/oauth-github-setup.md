# GitHub OAuth setup

Create a GitHub OAuth App. Set its authorization callback URL to the exact Supabase callback displayed in the Supabase dashboard. Enter the GitHub client ID and secret in Supabase. Application redirects back to `/auth/callback`; production, preview, localhost, and custom site URLs must also be present in Supabase's allowlist.
