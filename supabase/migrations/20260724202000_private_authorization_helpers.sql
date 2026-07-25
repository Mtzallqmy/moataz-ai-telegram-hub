create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated, service_role;

create or replace function app_private.has_permission(permission_code text, target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(target_user = auth.uid(), false)
    and exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.permissions p on p.id = rp.permission_id
      join public.profiles pr on pr.id = ur.user_id
      where ur.user_id = target_user
        and pr.account_status = 'active'
        and p.code = permission_code
    );
$$;
revoke all on function app_private.has_permission(text, uuid) from public, anon;
grant execute on function app_private.has_permission(text, uuid) to authenticated, service_role;

create or replace function public.has_permission(permission_code text, target_user uuid default auth.uid())
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select app_private.has_permission(permission_code, target_user); $$;
revoke all on function public.has_permission(text, uuid) from public, anon;
grant execute on function public.has_permission(text, uuid) to authenticated, service_role;

create or replace function app_private.is_owner(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(target_user = auth.uid(), false)
    and exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.profiles pr on pr.id = ur.user_id
      where ur.user_id = target_user
        and pr.account_status = 'active'
        and r.name = 'owner'
    );
$$;
revoke all on function app_private.is_owner(uuid) from public, anon;
grant execute on function app_private.is_owner(uuid) to authenticated, service_role;

create or replace function public.is_owner(target_user uuid default auth.uid())
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select app_private.is_owner(target_user); $$;
revoke all on function public.is_owner(uuid) from public, anon;
grant execute on function public.is_owner(uuid) to authenticated, service_role;

alter function public.list_provider_credential_metadata() set schema app_private;
alter function public.set_provider_credential_state(uuid, text, boolean, integer) set schema app_private;
alter function public.store_provider_credential(uuid, text, text, jsonb, integer, bigint, timestamptz, boolean) set schema app_private;

revoke all on function app_private.list_provider_credential_metadata() from public, anon;
revoke all on function app_private.set_provider_credential_state(uuid, text, boolean, integer) from public, anon;
revoke all on function app_private.store_provider_credential(uuid, text, text, jsonb, integer, bigint, timestamptz, boolean) from public, anon;
grant execute on function app_private.list_provider_credential_metadata() to authenticated, service_role;
grant execute on function app_private.set_provider_credential_state(uuid, text, boolean, integer) to authenticated, service_role;
grant execute on function app_private.store_provider_credential(uuid, text, text, jsonb, integer, bigint, timestamptz, boolean) to authenticated, service_role;

create or replace function public.list_provider_credential_metadata()
returns table(id uuid, provider_id uuid, key_hint text, status text, priority integer, usage_limit bigint, usage_count bigint, expires_at timestamptz, last_used_at timestamptz, is_default boolean, created_at timestamptz, updated_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from app_private.list_provider_credential_metadata(); $$;

create or replace function public.set_provider_credential_state(p_credential_id uuid, p_status text default null, p_is_default boolean default null, p_priority integer default null)
returns table(id uuid, provider_id uuid, key_hint text, status text, priority integer, is_default boolean, updated_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from app_private.set_provider_credential_state(p_credential_id, p_status, p_is_default, p_priority); $$;

create or replace function public.store_provider_credential(p_provider_id uuid, p_secret text, p_key_hint text, p_auth_metadata jsonb default '{}'::jsonb, p_priority integer default 100, p_usage_limit bigint default null, p_expires_at timestamptz default null, p_is_default boolean default true)
returns table(id uuid, provider_id uuid, key_hint text, status text, priority integer, usage_limit bigint, expires_at timestamptz, is_default boolean, created_at timestamptz)
language sql
security invoker
set search_path = ''
as $$ select * from app_private.store_provider_credential(p_provider_id, p_secret, p_key_hint, p_auth_metadata, p_priority, p_usage_limit, p_expires_at, p_is_default); $$;

revoke all on function public.list_provider_credential_metadata() from public, anon;
revoke all on function public.set_provider_credential_state(uuid, text, boolean, integer) from public, anon;
revoke all on function public.store_provider_credential(uuid, text, text, jsonb, integer, bigint, timestamptz, boolean) from public, anon;
grant execute on function public.list_provider_credential_metadata() to authenticated, service_role;
grant execute on function public.set_provider_credential_state(uuid, text, boolean, integer) to authenticated, service_role;
grant execute on function public.store_provider_credential(uuid, text, text, jsonb, integer, bigint, timestamptz, boolean) to authenticated, service_role;

drop policy if exists ai_provider_credentials_explicit_deny on public.ai_provider_credentials;
create policy ai_provider_credentials_explicit_deny on public.ai_provider_credentials for all to anon, authenticated using (false) with check (false);
drop policy if exists user_api_keys_explicit_deny on public.user_api_keys;
create policy user_api_keys_explicit_deny on public.user_api_keys for all to anon, authenticated using (false) with check (false);
drop policy if exists contact_messages_explicit_deny on public.contact_messages;
create policy contact_messages_explicit_deny on public.contact_messages for all to anon, authenticated using (false) with check (false);

comment on schema app_private is 'Internal authorization and privileged implementation functions. Not exposed through the Data API.';
comment on function public.has_permission(text, uuid) is 'Security-invoker API wrapper over an internal authorization function.';