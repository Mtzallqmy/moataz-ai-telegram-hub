create extension if not exists pgcrypto;

create table if not exists public.telegram_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  telegram_user_id bigint not null unique,
  telegram_chat_id bigint not null,
  telegram_username text,
  first_name text,
  last_name text,
  linked_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true
);

create table if not exists public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_codes_user_id_idx
  on public.telegram_link_codes(user_id);
create index if not exists telegram_link_codes_expires_at_idx
  on public.telegram_link_codes(expires_at);

create table if not exists public.telegram_user_features (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, feature_key)
);

alter table public.telegram_links enable row level security;
alter table public.telegram_link_codes enable row level security;
alter table public.telegram_user_features enable row level security;

create policy "users can read their telegram link"
  on public.telegram_links for select
  using (auth.uid() = user_id);

create policy "users can delete their telegram link"
  on public.telegram_links for delete
  using (auth.uid() = user_id);

create policy "users can read their telegram feature permissions"
  on public.telegram_user_features for select
  using (auth.uid() = user_id);

create or replace function public.consume_telegram_link_code(
  p_code_hash text,
  p_telegram_user_id bigint,
  p_telegram_chat_id bigint,
  p_telegram_username text default null,
  p_first_name text default null,
  p_last_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.telegram_link_codes%rowtype;
begin
  select * into v_code
  from public.telegram_link_codes
  where code_hash = p_code_hash
    and consumed_at is null
    and expires_at > now()
  for update skip locked;

  if v_code.id is null then
    return null;
  end if;

  update public.telegram_link_codes
  set consumed_at = now()
  where id = v_code.id;

  insert into public.telegram_links (
    user_id,
    telegram_user_id,
    telegram_chat_id,
    telegram_username,
    first_name,
    last_name,
    linked_at,
    last_seen_at,
    is_active
  ) values (
    v_code.user_id,
    p_telegram_user_id,
    p_telegram_chat_id,
    p_telegram_username,
    p_first_name,
    p_last_name,
    now(),
    now(),
    true
  )
  on conflict (user_id) do update set
    telegram_user_id = excluded.telegram_user_id,
    telegram_chat_id = excluded.telegram_chat_id,
    telegram_username = excluded.telegram_username,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    linked_at = now(),
    last_seen_at = now(),
    is_active = true;

  delete from public.telegram_links
  where telegram_user_id = p_telegram_user_id
    and user_id <> v_code.user_id;

  return v_code.user_id;
end;
$$;

revoke all on function public.consume_telegram_link_code(text, bigint, bigint, text, text, text) from public;
grant execute on function public.consume_telegram_link_code(text, bigint, bigint, text, text, text) to service_role;
