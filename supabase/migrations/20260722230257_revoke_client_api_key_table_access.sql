begin;

-- User/provider secrets are only accessed by audited server-side handlers.
revoke all on table public.user_api_keys from anon, authenticated;
revoke all on table public.ai_provider_credentials from anon, authenticated;

commit;
