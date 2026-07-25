# Provider security

Provider secrets are AES-256-GCM encrypted with contextual authenticated data binding ciphertext to provider and credential IDs. `PROVIDER_ENCRYPTION_KEY` must be a base64-encoded 32-byte key stored only in server environment configuration. Rotate it through a documented re-encryption operation; never replace it without migrating ciphertext. KMS or Supabase Vault is recommended for mature production deployments.

Custom endpoints require HTTPS, reject URL credentials, localhost, link-local, RFC1918 and local IPv6 ranges unless `ALLOW_PRIVATE_PROVIDER_URLS=true`. Production should additionally perform DNS resolution checks on every connection to prevent DNS rebinding. Logs use hints/error IDs only.
