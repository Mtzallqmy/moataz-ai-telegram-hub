begin;

create index if not exists feature_flags_updated_by_idx on public.feature_flags(updated_by);
create index if not exists message_attachments_extracted_text_idx on public.message_attachments(extracted_text_id);
create index if not exists platform_settings_updated_by_idx on public.platform_settings(updated_by);
create index if not exists provider_usage_chat_run_idx on public.provider_usage_records(chat_run_id);
create index if not exists provider_usage_conversation_idx on public.provider_usage_records(conversation_id);
create index if not exists provider_usage_model_idx on public.provider_usage_records(model_id);
create index if not exists role_permissions_permission_idx on public.role_permissions(permission_id);

commit;
