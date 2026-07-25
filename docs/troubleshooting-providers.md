# Provider troubleshooting

1. Confirm server-only Supabase service role and provider encryption key are configured.
2. Confirm the provider has an active, unexpired credential and that its usage limit is not exhausted.
3. Run the administrative connection test and note the safe error code and latency.
4. Verify base URL and protocol adapter. OpenAI-compatible must expose the configured models and chat endpoints.
5. Import models, review capabilities, and enable both provider and model.
6. For HTTP 429, respect provider reset windows; retries are bounded and jittered.
7. For timeouts, verify the configured timeout and upstream latency. Do not expose raw upstream errors to users.

Amazon Bedrock remains disabled until AWS SigV4 credential resolution is implemented. Heavy file jobs remain queued until a worker is connected.
