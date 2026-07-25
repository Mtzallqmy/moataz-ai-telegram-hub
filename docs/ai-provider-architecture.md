# AI provider architecture

The chat domain consumes only `AIProviderAdapter`. `ProviderRegistry` selects the protocol adapter; `loadProviderConfiguration` resolves non-secret database configuration and a server-only credential. Requests are normalized to `UnifiedChatRequest`, while adapters normalize completion, streaming, usage and errors.

Implemented protocols: OpenAI-compatible (OpenAI, OpenRouter, Groq, Mistral, DeepSeek, xAI and Azure-compatible endpoints), Anthropic Messages, Google Gemini, and Cohere v2. Amazon Bedrock is registered as an explicit extension point and refuses requests until a server-side AWS SigV4 credential provider is implemented.

Flow: authorize → validate model capabilities → enforce quota → select/decrypt credential → stream through adapter → persist assistant response/run/usage. Provider raw errors and secrets never reach the browser.
