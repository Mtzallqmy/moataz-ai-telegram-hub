begin;

-- Keep permission checks callable by signed-in users, but never allow callers to
-- inspect another user's authorization state through the RPC argument.
create or replace function public.has_permission(permission_code text, target_user uuid default auth.uid())
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

create or replace function public.is_owner(target_user uuid default auth.uid())
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
      where ur.user_id = target_user and r.name = 'owner'
    );
$$;

revoke all on function public.has_permission(text, uuid) from public, anon, authenticated;
revoke all on function public.is_owner(uuid) from public, anon, authenticated;
grant execute on function public.has_permission(text, uuid) to authenticated;
grant execute on function public.is_owner(uuid) to authenticated;

-- Trigger-only functions must not be exposed as Data API RPC endpoints.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_owner_role() from public, anon, authenticated;
revoke all on function public.audit_user_role_change() from public, anon, authenticated;

-- Public settings and flags do not invoke privileged functions for anonymous
-- visitors. Signed-in administrators retain their permission-backed view.
drop policy if exists flags_public_read on public.feature_flags;
drop policy if exists flags_anon_read on public.feature_flags;
drop policy if exists flags_authenticated_read on public.feature_flags;
create policy flags_anon_read on public.feature_flags
  for select to anon using (enabled);
create policy flags_authenticated_read on public.feature_flags
  for select to authenticated
  using (enabled or (select public.has_permission('settings.manage')));

drop policy if exists settings_public_read on public.platform_settings;
drop policy if exists settings_anon_read on public.platform_settings;
drop policy if exists settings_authenticated_read on public.platform_settings;
create policy settings_anon_read on public.platform_settings
  for select to anon using (is_public);
create policy settings_authenticated_read on public.platform_settings
  for select to authenticated
  using (is_public or (select public.has_permission('settings.manage')));

-- Cache auth lookups once per statement and avoid overlapping FOR ALL policies.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.has_permission('users.read')));
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists user_roles_authorized_read on public.user_roles;
create policy user_roles_authorized_read on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('users.read')));
drop policy if exists user_roles_authorized_write on public.user_roles;
drop policy if exists user_roles_authorized_insert on public.user_roles;
drop policy if exists user_roles_authorized_update on public.user_roles;
drop policy if exists user_roles_authorized_delete on public.user_roles;
create policy user_roles_authorized_insert on public.user_roles
  for insert to authenticated
  with check ((select public.has_permission('roles.manage')));
create policy user_roles_authorized_update on public.user_roles
  for update to authenticated
  using ((select public.has_permission('roles.manage')))
  with check ((select public.has_permission('roles.manage')));
create policy user_roles_authorized_delete on public.user_roles
  for delete to authenticated
  using ((select public.has_permission('roles.manage')));

drop policy if exists settings_self on public.user_settings;
create policy settings_self on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists limits_admin_write on public.usage_limits;
drop policy if exists limits_admin_insert on public.usage_limits;
drop policy if exists limits_admin_update on public.usage_limits;
drop policy if exists limits_admin_delete on public.usage_limits;
create policy limits_admin_insert on public.usage_limits
  for insert to authenticated
  with check ((select public.has_permission('providers.manage')));
create policy limits_admin_update on public.usage_limits
  for update to authenticated
  using ((select public.has_permission('providers.manage')))
  with check ((select public.has_permission('providers.manage')));
create policy limits_admin_delete on public.usage_limits
  for delete to authenticated
  using ((select public.has_permission('providers.manage')));

-- Storage upserts/resumable replacement require SELECT + INSERT + UPDATE.
do $$
declare bucket text;
begin
  foreach bucket in array array['user-uploads','user-files','chat-attachments','temporary-files','avatars'] loop
    execute format('drop policy if exists %I on storage.objects', bucket || '_owner_update');
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text) with check (bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text)',
      bucket || '_owner_update', bucket, bucket
    );
  end loop;
end
$$;

-- Cover foreign keys used by deletes, joins and administrative filters.
create index if not exists ai_provider_credentials_created_by_idx on public.ai_provider_credentials(created_by);
create index if not exists ai_provider_credentials_updated_by_idx on public.ai_provider_credentials(updated_by);
create index if not exists ai_providers_created_by_idx on public.ai_providers(created_by);
create index if not exists ai_providers_fallback_idx on public.ai_providers(fallback_provider_id);
create index if not exists chat_runs_user_message_idx on public.chat_runs(user_message_id);
create index if not exists chat_runs_assistant_message_idx on public.chat_runs(assistant_message_id);
create index if not exists chat_runs_provider_idx on public.chat_runs(provider_id);
create index if not exists chat_runs_model_idx on public.chat_runs(model_id);
create index if not exists conversations_selected_model_idx on public.conversations(selected_model_id);
create index if not exists file_processing_jobs_file_idx on public.file_processing_jobs(file_id);
create index if not exists message_attachments_file_idx on public.message_attachments(file_id);
create index if not exists messages_parent_idx on public.messages(parent_message_id);
create index if not exists messages_provider_idx on public.messages(provider_id);
create index if not exists messages_user_idx on public.messages(user_id);
create index if not exists user_api_keys_provider_idx on public.user_api_keys(provider_id);
create index if not exists user_roles_assigned_by_idx on public.user_roles(assigned_by);
create index if not exists user_settings_default_model_idx on public.user_settings(default_model_id);
create index if not exists usage_limits_model_idx on public.usage_limits(model_id);

commit;
