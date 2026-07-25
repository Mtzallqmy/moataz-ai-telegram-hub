# Environment variables

Public: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.

Server only: `SUPABASE_SECRET_KEY` (preferred), legacy `SUPABASE_SERVICE_ROLE_KEY`, `PLATFORM_OWNER_EMAILS`, provider encryption/KMS configuration, OAuth secrets, and integration tokens. The Supabase Vercel Marketplace integration synchronizes `SUPABASE_SECRET_KEY` automatically; neither server key may be exposed to browser code.

Feature flags default to disabled: `AI_CHAT_ENABLED`, `FILE_UPLOADS_ENABLED`, `CONTENT_EDITOR_ENABLED`, `TELEGRAM_INTEGRATION_ENABLED`, and `SCHEDULED_PUBLISHING_ENABLED`.
# Stage-three server variables

- `PROVIDER_ENCRYPTION_KEY`: base64 encoded 32-byte AES key. Server-only and required before storing provider credentials.
- `ALLOW_PRIVATE_PROVIDER_URLS`: keep `false` in public deployments. Enables trusted local endpoints only when explicitly required.
- `MAX_UPLOAD_BYTES`: per-file upload limit; defaults to 100 MiB.
- `AI_CHAT_ENABLED`: enable only after migrations, credentials and at least one reviewed model are ready.
- `FILE_UPLOADS_ENABLED`: enable only after private buckets and policies are applied; antivirus is still a production prerequisite.
