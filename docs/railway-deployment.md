# Railway deployment

This project keeps two independent production targets:

- ChatGPT Sites uses the existing `npm run build` and `npm start` commands.
- Railway uses `npm run build:railway` and `npm run start:railway`.

`railway.json` configures Nixpacks, the production build, the start command,
the `/api/v1/status` health check, and bounded restart retries. Railway injects
`PORT`; do not create or override it. The server binds to `0.0.0.0` so
Railway's public proxy and health checker can reach it.

## Required variables

Add the following variables to the Railway service. Mark all server-only
variables as sealed/private and never paste them into source control:

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Browser-safe publishable key |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical HTTPS origin |
| `SUPABASE_SECRET_KEY` | Secret | Server administration operations only |
| `PROVIDER_ENCRYPTION_KEY` | Secret | Encrypts provider credentials at rest |
| `PLATFORM_OWNER_EMAILS` | Server | Comma-separated owner emails |
| `ALLOWED_ORIGINS` | Server | Comma-separated trusted HTTPS origins |

The application also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY` during
migration, but new deployments should use `SUPABASE_SECRET_KEY`. Never set
either server key with a `NEXT_PUBLIC_` prefix.

## Feature and security variables

| Variable | Recommended initial value |
| --- | --- |
| `PASSWORD_AUTH_ENABLED` | `false` |
| `NEXT_PUBLIC_PASSWORD_AUTH_ENABLED` | `false` |
| `ALLOW_PRIVATE_PROVIDER_URLS` | `false` |
| `MAX_UPLOAD_BYTES` | `104857600` |
| `AI_CHAT_ENABLED` | `false` until a tested provider/model/key exists |
| `FILE_UPLOADS_ENABLED` | `false` until the server key and Storage policies are verified |
| `CONTENT_EDITOR_ENABLED` | `false` |
| `TELEGRAM_INTEGRATION_ENABLED` | `false` |
| `SCHEDULED_PUBLISHING_ENABLED` | `false` |

Enable a feature only after its database migration and operational dependency
are verified. A false flag is an explicit unavailable state, not a simulated
feature.

Generate `PROVIDER_ENCRYPTION_KEY` outside the repository with at least 40
characters, for example `openssl rand -base64 48`, and paste it directly into
Railway's Variables UI.

## Supabase and OAuth

Use the Railway production origin as the Supabase Auth Site URL. Add
`https://YOUR_DOMAIN/auth/callback` to the allowed redirect URLs.

For GitHub OAuth, the GitHub application's Authorization callback URL points
to Supabase, not Railway:

`https://PROJECT_REF.supabase.co/auth/v1/callback`

Store the GitHub Client ID and Client Secret in the Supabase Auth provider
settings. They are not Railway application variables.

## Deployment sequence

1. Create a Railway service from the GitHub repository and select `main`.
2. Add the variables above before the first production deployment.
3. Deploy and wait for `/api/v1/status` to return HTTP 200.
4. Attach the custom domain and update `NEXT_PUBLIC_SITE_URL` and
   `ALLOWED_ORIGINS` to the final HTTPS origin.
5. Update Supabase Auth URL Configuration and OAuth provider callback settings.
6. Verify login, session refresh, admin authorization, uploads, and one mock
   provider request before enabling feature flags.
