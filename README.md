# Moataz AI 26

Production-oriented foundation for an Arabic/English multi-provider AI and content platform. The first two phases establish the application architecture, provider abstraction, Supabase authentication, PostgreSQL schema, RBAC permissions, RLS policies, storage rules, and protected route groups.

## Local setup

1. Use Node.js 22 or newer and run `npm ci`.
2. Copy `.env.example` to `.env.local` and set the public Supabase URL and publishable key.
3. Apply migrations from `supabase/migrations` through the Supabase CLI or migration connector.
4. Configure OAuth redirect URLs as described in `docs/`.
5. Run `npm run dev`.

The service-role key, encryption keys, OAuth secrets, and provider keys are server-only. Never prefix them with `NEXT_PUBLIC_`.

## Railway deployment

Railway uses `npm run build:railway` and `npm run start:railway`; the existing
Sites build remains unchanged. Connect the `main` branch, add the variables
listed in `docs/railway-deployment.md`, and point the health check to
`/api/v1/status`. Railway supplies `PORT` automatically.

## Quality gates

`npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` are required. GitHub Actions runs the same gates on pushes and pull requests.

## Feature status

Unfinished capabilities are disabled through explicit feature flags. The application never presents a placeholder operation as successful. Full chat, article editing, Telegram integration, and scheduled publishing intentionally remain outside these phases.
## Stage 3

Stage 3 adds real provider protocol adapters, encrypted multi-key credentials, connection/model discovery APIs, persisted SSE chat, conversation APIs, private file uploads, inline text extraction/chunking, usage accounting and an RLS/Storage migration. See `docs/ai-provider-architecture.md`, `docs/chat-architecture.md`, and `docs/provider-security.md`.

The live Supabase project must be active and both migrations must be applied before enabling `AI_CHAT_ENABLED` or `FILE_UPLOADS_ENABLED`. Heavy document/media processing, embeddings/RAG retrieval and Amazon Bedrock SigV4 are explicit extension points and are not represented as operational.
