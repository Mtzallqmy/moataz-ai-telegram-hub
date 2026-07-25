# Adding an AI provider

Implement `AIProviderAdapter` from `providers/types.ts`, keep network translation inside the adapter, map failures to `ProviderError`, and register it in `ProviderRegistry`. Never read credentials in client components. Add contract tests for configuration validation, model discovery, completion, streaming, timeouts, rate limits, and redacted errors. OpenAI-compatible vendors can reuse `OpenAICompatibleAdapter` with an administrator-supplied base URL.
