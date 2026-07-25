begin;

create extension if not exists vector with schema extensions;

alter table public.ai_providers
  add column if not exists auth_type text not null default 'bearer' check (auth_type in ('bearer','api_key_header','query','basic','custom_headers','oauth_client_credentials','none')),
  add column if not exists chat_endpoint text not null default 'chat/completions',
  add column if not exists models_endpoint text not null default 'models',
  add column if not exists embeddings_endpoint text,
  add column if not exists upload_endpoint text,
  add column if not exists api_version text,
  add column if not exists timeout_ms integer not null default 90000 check (timeout_ms between 1000 and 600000),
  add column if not exists retry_count integer not null default 2 check (retry_count between 0 and 5),
  add column if not exists rate_limit_per_minute integer check (rate_limit_per_minute is null or rate_limit_per_minute > 0),
  add column if not exists max_concurrent_requests integer not null default 10 check (max_concurrent_requests between 1 and 1000),
  add column if not exists priority integer not null default 100,
  add column if not exists health_check_interval_seconds integer not null default 300 check (health_check_interval_seconds >= 30),
  add column if not exists fallback_provider_id uuid references public.ai_providers(id) on delete set null,
  add column if not exists allowed_roles text[] not null default '{}',
  add column if not exists allowed_regions text[] not null default '{}',
  add column if not exists health_status text not null default 'unknown' check (health_status in ('unknown','healthy','degraded','unavailable')),
  add column if not exists last_health_check_at timestamptz,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_latency_ms integer;

create table if not exists public.ai_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.ai_providers(id) on delete cascade,
  encrypted_secret text not null,
  key_hint text not null check (char_length(key_hint) between 4 and 32),
  auth_metadata jsonb not null default '{}',
  status text not null default 'active' check (status in ('active','disabled','expired','invalid')),
  priority integer not null default 100,
  usage_limit bigint check (usage_limit is null or usage_limit > 0),
  usage_count bigint not null default 0 check (usage_count >= 0),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_models
  add column if not exists model_alias text unique,
  add column if not exists icon_url text,
  add column if not exists sort_order integer not null default 100,
  add column if not exists visible_to_users boolean not null default true,
  add column if not exists is_default boolean not null default false,
  add column if not exists allowed_roles text[] not null default '{}',
  add column if not exists daily_request_limit integer,
  add column if not exists monthly_request_limit integer,
  add column if not exists max_message_chars integer not null default 100000 check (max_message_chars > 0),
  add column if not exists max_output_tokens integer,
  add column if not exists release_stage text not null default 'stable' check (release_stage in ('stable','beta')),
  add column if not exists billing_tier text not null default 'paid' check (billing_tier in ('free','paid','premium')),
  add column if not exists fallback_priority integer not null default 100;

create unique index if not exists ai_models_one_default_idx on public.ai_models(is_default) where is_default;
create index if not exists provider_credentials_active_idx on public.ai_provider_credentials(provider_id,status,priority,expires_at);
create index if not exists providers_health_idx on public.ai_providers(enabled,health_status,priority);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'محادثة جديدة' check (char_length(title) between 1 and 160), summary text,
  selected_model_id uuid references public.ai_models(id) on delete set null, system_prompt_id uuid,
  status text not null default 'active' check (status in ('active','archived','deleted')),
  is_pinned boolean not null default false, is_archived boolean not null default false,
  last_message_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null, role text not null check (role in ('system','user','assistant','tool')),
  content text not null default '', content_parts jsonb not null default '[]', model_id uuid references public.ai_models(id) on delete set null,
  provider_id uuid references public.ai_providers(id) on delete set null, parent_message_id uuid references public.messages(id) on delete set null,
  sequence_number integer not null check (sequence_number > 0), status text not null default 'completed' check (status in ('pending','streaming','completed','failed','cancelled')),
  error_code text, error_message text, input_tokens integer, output_tokens integer, total_tokens integer,
  cost_estimate numeric(18,8), latency_ms integer, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(conversation_id,sequence_number)
);
create table if not exists public.chat_runs (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_message_id uuid not null references public.messages(id) on delete cascade, assistant_message_id uuid references public.messages(id) on delete set null,
  provider_id uuid not null references public.ai_providers(id) on delete restrict, model_id uuid not null references public.ai_models(id) on delete restrict,
  request_metadata jsonb not null default '{}', response_metadata jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','streaming','completed','failed','cancelled')),
  started_at timestamptz not null default now(), completed_at timestamptz, error_code text, latency_ms integer,
  usage_metadata jsonb not null default '{}', estimated_cost numeric(18,8)
);
create table if not exists public.provider_usage_records (
  id bigint generated always as identity primary key, user_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references public.ai_providers(id) on delete restrict, model_id uuid references public.ai_models(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null, chat_run_id uuid references public.chat_runs(id) on delete set null,
  input_tokens integer not null default 0, output_tokens integer not null default 0, total_tokens integer not null default 0,
  estimated_cost numeric(18,8) not null default 0, request_count integer not null default 1, created_at timestamptz not null default now()
);
create table if not exists public.usage_limits (
  id uuid primary key default gen_random_uuid(), scope_type text not null check (scope_type in ('platform','role','user','provider')),
  scope_id text not null, model_id uuid references public.ai_models(id) on delete cascade,
  daily_request_limit integer, monthly_request_limit integer, daily_token_limit bigint, monthly_token_limit bigint,
  daily_cost_limit numeric(18,8), monthly_cost_limit numeric(18,8), max_storage_bytes bigint,
  max_files integer, max_concurrent_requests integer, enabled boolean not null default true, updated_at timestamptz not null default now(),
  unique(scope_type,scope_id,model_id)
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null, storage_path text not null unique, mime_type text not null, extension text,
  size_bytes bigint not null check (size_bytes >= 0), checksum text not null,
  status text not null default 'uploaded' check (status in ('uploading','uploaded','processing','ready','failed','deleted','quarantined')),
  visibility text not null default 'private' check (visibility in ('private','shared','public')),
  source text not null default 'chat' check (source in ('chat','library','content','avatar')),
  uploaded_at timestamptz not null default now(), deleted_at timestamptz, metadata jsonb not null default '{}'
);
create table if not exists public.file_processing_jobs (
  id uuid primary key default gen_random_uuid(), file_id uuid not null references public.files(id) on delete cascade,
  job_type text not null, status text not null default 'queued' check (status in ('queued','processing','completed','failed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100), attempts integer not null default 0,
  error_code text, error_message text, started_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.file_extracted_contents (
  id uuid primary key default gen_random_uuid(), file_id uuid not null unique references public.files(id) on delete cascade,
  text_content text not null, language text, page_count integer, word_count integer, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create table if not exists public.file_chunks (
  id uuid primary key default gen_random_uuid(), file_id uuid not null references public.files(id) on delete cascade,
  chunk_index integer not null, content text not null, token_count integer, metadata jsonb not null default '{}',
  embedding extensions.vector(1536), created_at timestamptz not null default now(), unique(file_id,chunk_index)
);
create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(), message_id uuid not null references public.messages(id) on delete cascade,
  file_id uuid not null references public.files(id) on delete restrict, attachment_type text not null,
  processing_status text not null default 'pending', extracted_text_id uuid references public.file_extracted_contents(id) on delete set null,
  metadata jsonb not null default '{}', created_at timestamptz not null default now(), unique(message_id,file_id)
);

create index if not exists conversations_user_activity_idx on public.conversations(user_id,is_archived,last_message_at desc nulls last);
create index if not exists messages_conversation_sequence_idx on public.messages(conversation_id,sequence_number);
create index if not exists messages_model_created_idx on public.messages(model_id,created_at desc);
create index if not exists chat_runs_conversation_status_idx on public.chat_runs(conversation_id,status,started_at desc);
create index if not exists usage_user_created_idx on public.provider_usage_records(user_id,created_at desc);
create index if not exists usage_provider_model_created_idx on public.provider_usage_records(provider_id,model_id,created_at desc);
create index if not exists files_owner_uploaded_idx on public.files(owner_user_id,status,uploaded_at desc);
create index if not exists jobs_status_created_idx on public.file_processing_jobs(status,created_at);
create index if not exists file_chunks_file_idx on public.file_chunks(file_id,chunk_index);
create index if not exists file_chunks_embedding_hnsw_idx on public.file_chunks using hnsw (embedding vector_cosine_ops) where embedding is not null;

alter table public.ai_provider_credentials enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.chat_runs enable row level security;
alter table public.provider_usage_records enable row level security;
alter table public.usage_limits enable row level security;
alter table public.files enable row level security;
alter table public.file_processing_jobs enable row level security;
alter table public.file_extracted_contents enable row level security;
alter table public.file_chunks enable row level security;

create policy conversations_owner_read on public.conversations for select to authenticated using (user_id=(select auth.uid()));
create policy conversations_owner_insert on public.conversations for insert to authenticated with check (user_id=(select auth.uid()));
create policy conversations_owner_update on public.conversations for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy conversations_owner_delete on public.conversations for delete to authenticated using (user_id=(select auth.uid()));
create policy messages_owner_read on public.messages for select to authenticated using (exists(select 1 from public.conversations c where c.id=conversation_id and c.user_id=(select auth.uid())));
create policy files_owner_read on public.files for select to authenticated using (owner_user_id=(select auth.uid()));
create policy files_owner_insert on public.files for insert to authenticated with check (owner_user_id=(select auth.uid()));
create policy files_owner_update on public.files for update to authenticated using (owner_user_id=(select auth.uid())) with check (owner_user_id=(select auth.uid()));
create policy files_owner_delete on public.files for delete to authenticated using (owner_user_id=(select auth.uid()));
create policy attachments_owner_read on public.message_attachments for select to authenticated using (exists(select 1 from public.messages m join public.conversations c on c.id=m.conversation_id where m.id=message_id and c.user_id=(select auth.uid())));
create policy jobs_owner_read on public.file_processing_jobs for select to authenticated using (exists(select 1 from public.files f where f.id=file_id and f.owner_user_id=(select auth.uid())));
create policy extracted_owner_read on public.file_extracted_contents for select to authenticated using (exists(select 1 from public.files f where f.id=file_id and f.owner_user_id=(select auth.uid())));
create policy chunks_owner_read on public.file_chunks for select to authenticated using (exists(select 1 from public.files f where f.id=file_id and f.owner_user_id=(select auth.uid())));
create policy usage_owner_read on public.provider_usage_records for select to authenticated using (user_id=(select auth.uid()));
create policy limits_admin_read on public.usage_limits for select to authenticated using (public.has_permission('providers.manage'));
create policy limits_admin_write on public.usage_limits for all to authenticated using (public.has_permission('providers.manage')) with check (public.has_permission('providers.manage'));
-- messages with assistant/system roles, chat_runs, usage records, processing data and credentials intentionally have no client write policies.

insert into public.permissions(code,name) values
 ('conversations.support_read','Read a conversation after explicit support grant'),
 ('usage.read','Read platform usage analytics')
on conflict(code) do nothing;
insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p where r.name='owner' and p.code in ('conversations.support_read','usage.read') on conflict do nothing;

insert into storage.buckets(id,name,public,file_size_limit) values
 ('user-files','user-files',false,104857600),('chat-attachments','chat-attachments',false,104857600),
 ('content-media','content-media',false,104857600),('temporary-files','temporary-files',false,104857600),('avatars','avatars',false,10485760)
on conflict(id) do update set public=false;

do $$ declare bucket text; begin
  foreach bucket in array array['user-files','chat-attachments','temporary-files','avatars'] loop
    execute format('create policy %I on storage.objects for select to authenticated using (bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text)', bucket||'_owner_select', bucket);
    execute format('create policy %I on storage.objects for insert to authenticated with check (bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text)', bucket||'_owner_insert', bucket);
    execute format('create policy %I on storage.objects for delete to authenticated using (bucket_id=%L and (storage.foldername(name))[1]=(select auth.uid())::text)', bucket||'_owner_delete', bucket);
  end loop;
exception when duplicate_object then null; end $$;

revoke all on public.ai_provider_credentials, public.chat_runs, public.provider_usage_records, public.file_processing_jobs, public.file_extracted_contents, public.file_chunks from anon, authenticated;
grant select,insert,update,delete on public.conversations to authenticated;
grant select on public.messages, public.message_attachments, public.files, public.provider_usage_records to authenticated;
grant insert,update,delete on public.files to authenticated;

commit;
