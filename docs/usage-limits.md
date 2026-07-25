# Usage limits

`usage_limits` supports platform, role, user and provider scopes with optional model specificity. Daily/monthly request, token and cost limits are checked on the server before provider dispatch. Storage, file-count and concurrency columns are included for enforcement by upload and scheduling workers.

`provider_usage_records` is server-write-only. Costs are estimates based on administrator-supplied per-million token metadata and are not billing records.
