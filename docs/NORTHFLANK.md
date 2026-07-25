# Northflank production deployment

This repository is prepared to build and run as a Docker service on Northflank.

## What is automated

- Docker build from the repository root.
- Deployment source fixed to the `main` branch.
- Public HTTP port `3000`.
- Container health endpoint at `/api/health`.
- A managed PostgreSQL addon is created by `northflank.json`.
- The Northflank template is configured with GitOps autorun and queued updates.

## Important architecture note

The current application uses Supabase-specific authentication, storage, Row Level Security, RPC functions, and database APIs. The PostgreSQL addon created on Northflank is therefore provisioned for a staged database migration, but it does not replace Supabase automatically. Replacing Supabase requires a separate application refactor for authentication, storage, RLS-equivalent authorization, migrations, and server data access.

## First deployment

1. In Northflank, connect the GitHub account that can access `Mtzallqmy/moataz-ai-telegram-hub`.
2. Create a template and enable GitOps.
3. Select repository `Mtzallqmy/moataz-ai-telegram-hub`, branch `main`, and path `/northflank.json`.
4. Store sensitive values as secure argument overrides, not in Git:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `PROVIDER_ENCRYPTION_KEY`
   - `PLATFORM_OWNER_EMAILS`
5. Enable **run automatically when updated**.
6. Run the template once.
7. Add a Northflank HTTP readiness/liveness check for port `3000`, path `/api/health`.
8. Attach and verify `moatazalalqami.online` and `www.moatazalalqami.online` to the public HTTP port.

## Updating from GitHub

The combined service follows only `main`. Every new commit merged into `main` triggers a new Northflank build/deployment when continuous deployment is enabled. The GitOps template also follows `main`; changes to `northflank.json` update the infrastructure template and run it automatically.

## Local Docker verification

```bash
docker build -t moatazai26 .
docker run --rm -p 3000:3000 --env-file .env.local moatazai26
```

Then open:

```text
http://localhost:3000/api/health
```

## Database migration phase

To move fully from Supabase to Northflank PostgreSQL, complete these items before switching production traffic:

1. Export and import the PostgreSQL schema/data.
2. Replace Supabase Auth with a supported authentication service or custom auth.
3. Replace Supabase Storage with Northflank MinIO or another S3-compatible store.
4. Replace Supabase client/RPC calls with server-side PostgreSQL access.
5. Reimplement authorization policies currently enforced by Supabase RLS.
6. Run migration and integration tests before changing DNS.
