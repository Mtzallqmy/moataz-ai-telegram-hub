# Adding a model

Models may be discovered with `POST /api/v1/admin/providers/{providerId}/models/import` or added through `POST /api/v1/admin/models`. Imported models are disabled and hidden by default because provider metadata is not sufficient to safely infer every capability.

An administrator must review context/output limits, input modalities, streaming/tools/vision/audio/video/document support, pricing and billing tier before enabling the model. `model_alias` provides a stable application-facing name while `model_key` remains the provider identifier.
