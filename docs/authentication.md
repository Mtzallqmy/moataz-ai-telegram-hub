# Authentication

OAuth uses Supabase PKCE with secure cookies through `@supabase/ssr`. Browser and server clients are separate. `/auth/callback` exchanges the one-time code and redirects only to safe relative paths. Google and GitHub are the default providers. Password authentication remains disabled until `PASSWORD_AUTH_ENABLED=true` and recovery/update screens are enabled.

The proxy refreshes sessions; server guards call `getUser()` and database permission functions. UI visibility is never treated as authorization.
