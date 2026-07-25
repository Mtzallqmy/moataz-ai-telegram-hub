# Chat architecture

`POST /api/v1/chat` authenticates the user, validates the request, verifies model/provider state and capabilities, checks quota, persists the user message, then returns a real `text/event-stream`. Events are `meta`, `start`, `delta`, `usage`, `error`, and `done`.

The server is the only writer for assistant/system messages, chat runs and usage. Cancellation propagates through `Request.signal`. Partial output is retained only when the run finalizer succeeds; failures are stored with normalized codes and users receive a safe error ID.

Conversation list/detail/update/delete APIs are owner-scoped server-side. Deletes are soft deletes.
