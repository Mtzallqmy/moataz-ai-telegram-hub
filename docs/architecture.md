# Architecture

The App Router owns routing and composition. Components render UI; services contain use cases; repositories define persistence boundaries; schemas validate untrusted input; provider adapters isolate vendor protocols. Route handlers expose versioned APIs for web, Android, Telegram, and n8n clients. Supabase supplies identity, PostgreSQL, RLS, and private object storage.

Public, account, and admin route groups have independent layouts. Proxy middleware refreshes authenticated sessions and performs a coarse login gate. Server guards call database permission functions and remain the authoritative authorization layer.
