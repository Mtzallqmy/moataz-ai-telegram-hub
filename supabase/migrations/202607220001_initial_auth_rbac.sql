begin;
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 120), username text unique check (username is null or username ~ '^[a-zA-Z0-9_]{3,32}$'),
  avatar_url text, bio text check (char_length(bio) <= 500), preferred_language text not null default 'ar' check (preferred_language in ('ar','en')),
  theme text not null default 'system' check (theme in ('system','light','dark','eye')),
  account_status text not null default 'active' check (account_status in ('active','suspended','disabled')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), last_seen_at timestamptz
);
create table if not exists public.roles (id uuid primary key default gen_random_uuid(), name text not null unique, description text, is_system_role boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.permissions (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, description text, created_at timestamptz not null default now());
create table if not exists public.user_roles (user_id uuid not null references auth.users(id) on delete cascade, role_id uuid not null references public.roles(id) on delete restrict, assigned_by uuid references auth.users(id) on delete set null, assigned_at timestamptz not null default now(), primary key(user_id,role_id));
create table if not exists public.role_permissions (role_id uuid not null references public.roles(id) on delete cascade, permission_id uuid not null references public.permissions(id) on delete cascade, primary key(role_id,permission_id));
create table if not exists public.user_settings (user_id uuid primary key references auth.users(id) on delete cascade, default_model_id uuid, language text not null default 'ar' check(language in ('ar','en')), theme text not null default 'system' check(theme in ('system','light','dark','eye')), notifications_enabled boolean not null default true, save_chat_history boolean not null default true, updated_at timestamptz not null default now());
create table if not exists public.audit_logs (id bigint generated always as identity primary key, actor_user_id uuid references auth.users(id) on delete set null, action text not null, resource_type text not null, resource_id text, metadata jsonb not null default '{}'::jsonb, ip_address inet, user_agent text, created_at timestamptz not null default now());
create table if not exists public.login_events (id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null, provider text not null, status text not null check(status in ('success','failure','logout')), failure_code text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.feature_flags (id uuid primary key default gen_random_uuid(), key text not null unique, enabled boolean not null default false, description text, conditions jsonb not null default '{}'::jsonb, updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now());
create table if not exists public.platform_settings (id uuid primary key default gen_random_uuid(), key text not null unique, value jsonb not null default '{}'::jsonb, is_public boolean not null default false, updated_by uuid references auth.users(id) on delete set null, updated_at timestamptz not null default now());
create table if not exists public.ai_providers (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, provider_type text not null, base_url text, enabled boolean not null default false, supports_streaming boolean not null default true, configuration jsonb not null default '{}'::jsonb, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint provider_configuration_has_no_secrets check(not(configuration ?| array['api_key','apiKey','secret','token'])));
create table if not exists public.ai_models (id uuid primary key default gen_random_uuid(), provider_id uuid not null references public.ai_providers(id) on delete cascade, model_key text not null, display_name text not null, description text, enabled boolean not null default false, context_window integer check(context_window is null or context_window > 0), input_modalities text[] not null default array['text'], output_modalities text[] not null default array['text'], capabilities jsonb not null default '{}'::jsonb, pricing_metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider_id,model_key));
alter table public.user_settings drop constraint if exists user_settings_default_model_id_fkey;
alter table public.user_settings add constraint user_settings_default_model_id_fkey foreign key(default_model_id) references public.ai_models(id) on delete set null;
create table if not exists public.user_api_keys (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, provider_id uuid not null references public.ai_providers(id) on delete cascade, encrypted_secret text not null, key_hint text not null check(char_length(key_hint)<=24), status text not null default 'active' check(status in ('active','revoked','invalid')), last_used_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,provider_id));

create index if not exists profiles_account_status_idx on public.profiles(account_status);
create index if not exists user_roles_role_idx on public.user_roles(role_id,user_id);
create index if not exists audit_logs_actor_created_idx on public.audit_logs(actor_user_id,created_at desc);
create index if not exists audit_logs_resource_idx on public.audit_logs(resource_type,resource_id,created_at desc);
create index if not exists login_events_user_created_idx on public.login_events(user_id,created_at desc);
create index if not exists ai_models_provider_enabled_idx on public.ai_models(provider_id,enabled);
create index if not exists user_api_keys_user_idx on public.user_api_keys(user_id,status);

insert into public.roles(name,description,is_system_role) values
('owner','Platform owner',true),('admin','Platform administrator',true),('editor','Content editor',true),('moderator','Content moderator',true),('author','Content author',true),('user','Standard user',true) on conflict(name) do update set description=excluded.description,is_system_role=true;
insert into public.permissions(code,name) select code,code from unnest(array['admin.access','users.read','users.manage','roles.manage','providers.read','providers.manage','models.manage','content.create','content.edit','content.publish','content.delete','media.manage','schedules.manage','integrations.manage','settings.manage','logs.read','audit.read','chat.use']) code on conflict(code) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.name='owner'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on p.code=any(array['admin.access','users.read','users.manage','roles.manage','providers.read','providers.manage','models.manage','content.create','content.edit','content.publish','media.manage','schedules.manage','integrations.manage','settings.manage','logs.read','audit.read','chat.use']) where r.name='admin'
on conflict do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r join public.permissions p on (r.name='editor' and p.code=any(array['admin.access','content.create','content.edit','content.publish','media.manage'])) or (r.name='moderator' and p.code=any(array['admin.access','content.edit','content.publish'])) or (r.name='author' and p.code=any(array['content.create','content.edit'])) or (r.name='user' and p.code='chat.use') on conflict do nothing;

create or replace function public.has_permission(permission_code text, target_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id join public.permissions p on p.id=rp.permission_id join public.profiles pr on pr.id=ur.user_id where ur.user_id=target_user and pr.account_status='active' and p.code=permission_code); $$;
revoke all on function public.has_permission(text,uuid) from public; grant execute on function public.has_permission(text,uuid) to authenticated;
create or replace function public.is_owner(target_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles ur join public.roles r on r.id=ur.role_id where ur.user_id=target_user and r.name='owner'); $$;
revoke all on function public.is_owner(uuid) from public; grant execute on function public.is_owner(uuid) to authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare user_role_id uuid; begin
  insert into public.profiles(id,display_name,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'avatar_url') on conflict(id) do nothing;
  insert into public.user_settings(user_id) values(new.id) on conflict(user_id) do nothing;
  select id into user_role_id from public.roles where name='user';
  insert into public.user_roles(user_id,role_id) values(new.id,user_role_id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.guard_owner_role() returns trigger language plpgsql security definer set search_path=public as $$
declare owner_role uuid; owner_count integer; begin
  select id into owner_role from public.roles where name='owner';
  if tg_op='DELETE' and old.role_id=owner_role then select count(*) into owner_count from public.user_roles where role_id=owner_role; if owner_count<=1 then raise exception 'cannot_remove_last_owner'; end if; end if;
  if tg_op='INSERT' and new.role_id=owner_role and not public.is_owner(auth.uid()) and auth.role()<>'service_role' then raise exception 'owner_role_requires_owner'; end if;
  if tg_op='DELETE' and not public.has_permission('roles.manage') and auth.role()<>'service_role' then raise exception 'roles_manage_required'; end if;
  return coalesce(new,old);
end $$;
drop trigger if exists guard_owner_role_changes on public.user_roles;
create trigger guard_owner_role_changes before insert or delete on public.user_roles for each row execute function public.guard_owner_role();
create or replace function public.audit_user_role_change() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata) values(auth.uid(),case when tg_op='INSERT' then 'role.assigned' else 'role.removed' end,'user_role',coalesce(new.user_id,old.user_id)::text,jsonb_build_object('role_id',coalesce(new.role_id,old.role_id))); return coalesce(new,old); end $$;
drop trigger if exists audit_user_role_changes on public.user_roles;
create trigger audit_user_role_changes after insert or delete on public.user_roles for each row execute function public.audit_user_role_change();

alter table public.profiles enable row level security; alter table public.roles enable row level security; alter table public.permissions enable row level security; alter table public.user_roles enable row level security; alter table public.role_permissions enable row level security; alter table public.user_settings enable row level security; alter table public.audit_logs enable row level security; alter table public.login_events enable row level security; alter table public.feature_flags enable row level security; alter table public.platform_settings enable row level security; alter table public.ai_providers enable row level security; alter table public.ai_models enable row level security; alter table public.user_api_keys enable row level security;
drop policy if exists profiles_self_select on public.profiles; create policy profiles_self_select on public.profiles for select to authenticated using(id=auth.uid() or public.has_permission('users.read'));
drop policy if exists profiles_self_update on public.profiles; create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists roles_authorized_read on public.roles; create policy roles_authorized_read on public.roles for select to authenticated using(public.has_permission('roles.manage'));
drop policy if exists permissions_authorized_read on public.permissions; create policy permissions_authorized_read on public.permissions for select to authenticated using(public.has_permission('roles.manage'));
drop policy if exists user_roles_authorized_read on public.user_roles; create policy user_roles_authorized_read on public.user_roles for select to authenticated using(user_id=auth.uid() or public.has_permission('users.read'));
drop policy if exists user_roles_authorized_write on public.user_roles; create policy user_roles_authorized_write on public.user_roles for all to authenticated using(public.has_permission('roles.manage')) with check(public.has_permission('roles.manage'));
drop policy if exists role_permissions_authorized on public.role_permissions; create policy role_permissions_authorized on public.role_permissions for select to authenticated using(public.has_permission('roles.manage'));
drop policy if exists settings_self on public.user_settings; create policy settings_self on public.user_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists audit_authorized_read on public.audit_logs; create policy audit_authorized_read on public.audit_logs for select to authenticated using(public.has_permission('audit.read'));
drop policy if exists login_events_authorized_read on public.login_events; create policy login_events_authorized_read on public.login_events for select to authenticated using(public.has_permission('logs.read'));
drop policy if exists flags_public_read on public.feature_flags; create policy flags_public_read on public.feature_flags for select to anon,authenticated using(enabled or public.has_permission('settings.manage'));
drop policy if exists settings_public_read on public.platform_settings; create policy settings_public_read on public.platform_settings for select to anon,authenticated using(is_public or public.has_permission('settings.manage'));
drop policy if exists providers_read on public.ai_providers; create policy providers_read on public.ai_providers for select to authenticated using(enabled or public.has_permission('providers.read'));
drop policy if exists models_read on public.ai_models; create policy models_read on public.ai_models for select to authenticated using(enabled or public.has_permission('providers.read'));
-- user_api_keys intentionally has no client policies. Access is server-only through audited handlers.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('user-uploads','user-uploads',false,52428800,array['image/jpeg','image/png','image/webp','application/pdf','text/plain','video/mp4']) on conflict(id) do update set public=false;
drop policy if exists user_uploads_owner_read on storage.objects; create policy user_uploads_owner_read on storage.objects for select to authenticated using(bucket_id='user-uploads' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists user_uploads_owner_insert on storage.objects; create policy user_uploads_owner_insert on storage.objects for insert to authenticated with check(bucket_id='user-uploads' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists user_uploads_owner_delete on storage.objects; create policy user_uploads_owner_delete on storage.objects for delete to authenticated using(bucket_id='user-uploads' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
