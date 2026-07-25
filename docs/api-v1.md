# API v1

Browser/session endpoints:

- `GET /api/v1/models`
- `GET /api/v1/conversations`
- `GET|PATCH|DELETE /api/v1/conversations/{id}`
- `POST /api/v1/chat` (SSE)
- `GET|POST /api/v1/files`

Permission-protected administration:

- `GET|POST /api/v1/admin/providers`
- `PATCH|DELETE /api/v1/admin/providers/{id}`
- `POST /api/v1/admin/providers/{id}/credentials`
- `POST /api/v1/admin/providers/{id}/test`
- `POST /api/v1/admin/providers/{id}/models/import`
- `GET|POST /api/v1/admin/models`

External Android, Telegram and n8n clients must not automate browser cookies. A later phase will add scoped, hashed Personal Access Tokens or OAuth 2.1 with revocation, expiry and audit trails.
