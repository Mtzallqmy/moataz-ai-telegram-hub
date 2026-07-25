create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public;
grant execute on function public.touch_updated_at() to authenticated, service_role;

create table if not exists public.content_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,80}$'),
  name_ar text not null check (char_length(name_ar) between 2 and 120),
  name_en text check (name_en is null or char_length(name_en) between 2 and 120),
  description_ar text,
  description_en text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('article','post','book_summary')),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,140}$'),
  title_ar text not null check (char_length(title_ar) between 3 and 220),
  title_en text check (title_en is null or char_length(title_en) between 3 and 220),
  excerpt_ar text check (excerpt_ar is null or char_length(excerpt_ar) <= 600),
  excerpt_en text check (excerpt_en is null or char_length(excerpt_en) <= 600),
  body_ar text not null check (char_length(body_ar) >= 20),
  body_en text,
  cover_image_url text,
  category_id uuid references public.content_categories(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  featured boolean not null default false,
  tags text[] not null default '{}',
  seo_title_ar text check (seo_title_ar is null or char_length(seo_title_ar) <= 70),
  seo_title_en text check (seo_title_en is null or char_length(seo_title_en) <= 70),
  seo_description_ar text check (seo_description_ar is null or char_length(seo_description_ar) <= 180),
  seo_description_en text check (seo_description_en is null or char_length(seo_description_en) <= 180),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_publish_state check (
    (status = 'published' and published_at is not null)
    or (status <> 'published')
  )
);

create table if not exists public.content_revisions (
  id bigint generated always as identity primary key,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  editor_id uuid references auth.users(id) on delete set null,
  revision_number integer not null check (revision_number > 0),
  snapshot jsonb not null,
  change_summary text,
  created_at timestamptz not null default now(),
  unique (content_item_id, revision_number)
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 320),
  subject text not null check (char_length(subject) between 3 and 180),
  message text not null check (char_length(message) between 10 and 5000),
  status text not null default 'new' check (status in ('new','in_progress','resolved','spam','archived')),
  ip_hash text,
  user_agent text,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_kind_status_published_idx on public.content_items(kind, status, published_at desc);
create index if not exists content_items_category_idx on public.content_items(category_id, published_at desc);
create index if not exists content_items_featured_idx on public.content_items(featured, published_at desc) where status = 'published';
create index if not exists content_items_author_idx on public.content_items(author_id, updated_at desc);
create index if not exists content_items_tags_gin_idx on public.content_items using gin(tags);
create index if not exists content_revisions_item_idx on public.content_revisions(content_item_id, revision_number desc);
create index if not exists contact_messages_status_created_idx on public.contact_messages(status, created_at desc);
create index if not exists contact_messages_ip_created_idx on public.contact_messages(ip_hash, created_at desc) where ip_hash is not null;

drop trigger if exists content_categories_touch_updated_at on public.content_categories;
create trigger content_categories_touch_updated_at before update on public.content_categories for each row execute function public.touch_updated_at();
drop trigger if exists content_items_touch_updated_at on public.content_items;
create trigger content_items_touch_updated_at before update on public.content_items for each row execute function public.touch_updated_at();
drop trigger if exists contact_messages_touch_updated_at on public.contact_messages;
create trigger contact_messages_touch_updated_at before update on public.contact_messages for each row execute function public.touch_updated_at();

alter table public.content_categories enable row level security;
alter table public.content_items enable row level security;
alter table public.content_revisions enable row level security;
alter table public.contact_messages enable row level security;

revoke all on public.content_categories from anon, authenticated;
revoke all on public.content_items from anon, authenticated;
revoke all on public.content_revisions from anon, authenticated;
revoke all on public.contact_messages from anon, authenticated;
grant select on public.content_categories to anon, authenticated;
grant select on public.content_items to anon, authenticated;
grant insert, update, delete on public.content_categories to authenticated;
grant insert, update, delete on public.content_items to authenticated;
grant select, insert on public.content_revisions to authenticated;
grant usage, select on sequence public.content_revisions_id_seq to authenticated;

drop policy if exists content_categories_anon_read on public.content_categories;
create policy content_categories_anon_read on public.content_categories for select to anon using (is_active);
drop policy if exists content_categories_authenticated_read on public.content_categories;
create policy content_categories_authenticated_read on public.content_categories for select to authenticated using (is_active or public.has_permission('content.edit'));
drop policy if exists content_categories_admin_insert on public.content_categories;
create policy content_categories_admin_insert on public.content_categories for insert to authenticated with check (public.has_permission('content.create'));
drop policy if exists content_categories_admin_update on public.content_categories;
create policy content_categories_admin_update on public.content_categories for update to authenticated using (public.has_permission('content.edit')) with check (public.has_permission('content.edit'));
drop policy if exists content_categories_admin_delete on public.content_categories;
create policy content_categories_admin_delete on public.content_categories for delete to authenticated using (public.has_permission('content.delete'));

drop policy if exists content_items_anon_read on public.content_items;
create policy content_items_anon_read on public.content_items for select to anon using (status = 'published' and published_at <= now());
drop policy if exists content_items_authenticated_read on public.content_items;
create policy content_items_authenticated_read on public.content_items for select to authenticated using ((status = 'published' and published_at <= now()) or public.has_permission('content.edit') or public.has_permission('content.publish'));
drop policy if exists content_items_authorized_insert on public.content_items;
create policy content_items_authorized_insert on public.content_items for insert to authenticated with check (public.has_permission('content.create') and author_id = auth.uid() and (status <> 'published' or public.has_permission('content.publish')));
drop policy if exists content_items_authorized_update on public.content_items;
create policy content_items_authorized_update on public.content_items for update to authenticated using (public.has_permission('content.edit')) with check (public.has_permission('content.edit') and (status <> 'published' or public.has_permission('content.publish')));
drop policy if exists content_items_authorized_delete on public.content_items;
create policy content_items_authorized_delete on public.content_items for delete to authenticated using (public.has_permission('content.delete'));

drop policy if exists content_revisions_authorized_read on public.content_revisions;
create policy content_revisions_authorized_read on public.content_revisions for select to authenticated using (public.has_permission('content.edit'));
drop policy if exists content_revisions_authorized_insert on public.content_revisions;
create policy content_revisions_authorized_insert on public.content_revisions for insert to authenticated with check (public.has_permission('content.edit') and editor_id = auth.uid());

drop policy if exists chat_runs_owner_read on public.chat_runs;
create policy chat_runs_owner_read on public.chat_runs for select to authenticated using (exists (select 1 from public.conversations c where c.id = chat_runs.conversation_id and c.user_id = auth.uid()));
grant select on public.chat_runs to authenticated;

insert into public.content_categories(slug, name_ar, name_en, description_ar, description_en, sort_order)
values
  ('technology','التقنية','Technology','الذكاء الاصطناعي والبرمجة والتقنيات الحديثة.','Artificial intelligence, software and modern technology.',10),
  ('medicine','الطب والصيدلة','Medicine & Pharmacy','محتوى طبي وصيدلاني توعوي موثوق.','Reliable medical and pharmacy awareness content.',20),
  ('automation','الأتمتة والإنتاجية','Automation & Productivity','أدوات وأساليب لرفع الإنتاجية وبناء الأنظمة الذكية.','Tools and methods for automation and productivity.',30),
  ('books','الكتب والمعرفة','Books & Knowledge','ملخصات كتب وأفكار قابلة للتطبيق.','Book summaries and practical ideas.',40)
on conflict (slug) do update set name_ar = excluded.name_ar, name_en = excluded.name_en, description_ar = excluded.description_ar, description_en = excluded.description_en, sort_order = excluded.sort_order, is_active = true;

insert into public.content_items(kind, slug, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, category_id, status, featured, tags, seo_title_ar, seo_description_ar, published_at)
select
  'article','welcome-to-moataz-ai','مرحبًا بكم في منصة معتز للذكاء الاصطناعي','Welcome to Moataz AI',
  'منصة عربية تجمع الدردشة متعددة المزودات والمحتوى التقني وإدارة الأدوات الذكية ضمن تجربة واحدة آمنة وقابلة للتوسع.',
  'An Arabic-first platform combining multi-provider AI chat, technical content and intelligent tool management in one secure, extensible experience.',
  E'بسم الله نبدأ.\n\nصُممت منصة معتز للذكاء الاصطناعي لتكون مساحة عملية تجمع بين استخدام نماذج الذكاء الاصطناعي، وإدارة المزودات، ونشر المحتوى التقني والمعرفي بصورة واضحة ومنظمة.\n\nتركّز المنصة على الخصوصية، وفصل الصلاحيات، وحماية مفاتيح الخدمات، مع بنية قابلة للتوسع نحو الأتمتة، والملفات، والبحث المعزز بالمصادر.\n\nسيُنشر هنا محتوى عربي في التقنية والبرمجة والصيدلة والإنتاجية، مع تطوير مستمر للتجربة والأدوات المتاحة.',
  E'Welcome.\n\nMoataz AI is designed as a practical space for using AI models, managing providers, and publishing technical knowledge through a clear and organized experience.\n\nThe platform prioritizes privacy, role-based access and server-side secret protection, with an architecture ready for automation, files and retrieval-augmented search.',
  c.id,'published',true,array['ذكاء اصطناعي','تقنية','أتمتة'],'منصة معتز للذكاء الاصطناعي','منصة عربية للدردشة متعددة المزودات والمحتوى التقني والأتمتة ضمن بنية آمنة وقابلة للتوسع.',now()
from public.content_categories c where c.slug = 'technology'
on conflict (slug) do update set title_ar = excluded.title_ar, title_en = excluded.title_en, excerpt_ar = excluded.excerpt_ar, excerpt_en = excluded.excerpt_en, body_ar = excluded.body_ar, body_en = excluded.body_en, category_id = excluded.category_id, status = 'published', featured = true, tags = excluded.tags, seo_title_ar = excluded.seo_title_ar, seo_description_ar = excluded.seo_description_ar, published_at = coalesce(public.content_items.published_at, excluded.published_at);

insert into public.feature_flags(key, enabled, description)
values
  ('CONTENT_EDITOR_ENABLED', true, 'Database-backed content publishing and editorial workflow.'),
  ('CONTACT_FORM_ENABLED', true, 'Server-validated contact message intake.')
on conflict (key) do update set enabled = excluded.enabled, description = excluded.description, updated_at = now();

insert into public.platform_settings(key, value, is_public)
values
  ('site_identity', jsonb_build_object('nameAr','معتز للذكاء الاصطناعي','nameEn','Moataz AI','owner','معتز العلقمي','defaultLanguage','ar'), true),
  ('content_defaults', jsonb_build_object('locale','ar','fallbackLocale','en','itemsPerPage',12), false)
on conflict (key) do update set value = excluded.value, is_public = excluded.is_public, updated_at = now();

revoke execute on function public.is_owner(uuid) from public, anon;
revoke execute on function public.has_permission(text, uuid) from public, anon;
revoke execute on function public.list_provider_credential_metadata() from public, anon;
revoke execute on function public.set_provider_credential_state(uuid, text, boolean, integer) from public, anon;
revoke execute on function public.store_provider_credential(uuid, text, text, jsonb, integer, bigint, timestamptz, boolean) from public, anon;
grant execute on function public.is_owner(uuid) to authenticated, service_role;
grant execute on function public.has_permission(text, uuid) to authenticated, service_role;
grant execute on function public.list_provider_credential_metadata() to authenticated, service_role;
grant execute on function public.set_provider_credential_state(uuid, text, boolean, integer) to authenticated, service_role;
grant execute on function public.store_provider_credential(uuid, text, text, jsonb, integer, bigint, timestamptz, boolean) to authenticated, service_role;

comment on table public.content_items is 'Published and editorial content for articles, posts and book summaries.';
comment on table public.contact_messages is 'Private contact submissions; accessible only through trusted server-side code.';
comment on function public.has_permission(text, uuid) is 'Intentional authenticated authorization helper. The target must equal auth.uid().';