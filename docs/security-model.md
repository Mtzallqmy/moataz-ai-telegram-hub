# Security model

RLS is enabled on every application table. Users can update only their own profile and settings. Administrative reads require permission codes. Audit events are append-only from trusted server paths. `user_api_keys` has no client policy. Provider configuration rejects common secret fields; encrypted secrets live separately and require a KMS/Vault-backed `SecretCrypto` implementation.

The application validates input with Zod, uses safe relative redirects, redacts internal errors, sends defensive headers, and never logs session tokens or OAuth/provider secrets. Production should use distributed rate limiting and a managed KMS or Vault with rotation and audit trails.
