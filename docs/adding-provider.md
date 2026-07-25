# Adding a provider

1. Implement `AIProviderAdapter` in `providers/` for protocols that are not OpenAI-compatible.
2. Register it in `providers/provider-registry.ts`.
3. Add the provider type to `schemas/provider.ts`.
4. Add a provider through `POST /api/v1/admin/providers`; the base URL passes SSRF validation.
5. Add credentials through the credential endpoint. Only a masked hint is returned.
6. Run the connection test, import models, review capabilities, then explicitly enable models and the provider.

Never add keys to provider configuration JSON, source code, logs or client state.
