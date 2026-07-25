create index if not exists contact_messages_handled_by_idx
  on public.contact_messages(handled_by)
  where handled_by is not null;

create index if not exists content_revisions_editor_idx
  on public.content_revisions(editor_id)
  where editor_id is not null;

drop policy if exists content_items_authorized_insert on public.content_items;
create policy content_items_authorized_insert
on public.content_items for insert to authenticated
with check (
  public.has_permission('content.create')
  and author_id = (select auth.uid())
  and (status <> 'published' or public.has_permission('content.publish'))
);

drop policy if exists content_revisions_authorized_insert on public.content_revisions;
create policy content_revisions_authorized_insert
on public.content_revisions for insert to authenticated
with check (
  public.has_permission('content.edit')
  and editor_id = (select auth.uid())
);

drop policy if exists chat_runs_owner_read on public.chat_runs;
create policy chat_runs_owner_read
on public.chat_runs for select to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = chat_runs.conversation_id
      and c.user_id = (select auth.uid())
  )
);
