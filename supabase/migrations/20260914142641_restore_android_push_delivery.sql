create or replace function public.unregister_push_token(p_expo_push_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.user_push_tokens
  where user_id = (select auth.uid()) and expo_push_token = p_expo_push_token;
$$;

revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.unregister_push_token(text) to authenticated;

create or replace function private.deliver_notification_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  activity_label text;
  push_messages jsonb;
begin
  select coalesce(nullif(btrim(full_name), ''), nullif(btrim(username), ''), 'Descubriendo CR')
    into actor_name from public.users where id = new.actor_id;
  select label_es into activity_label
    from public.app_options where kind = 'notification_type' and id = new.type and active;

  select jsonb_agg(jsonb_build_object(
    'to', token.expo_push_token,
    'title', coalesce(actor_name, 'Descubriendo CR'),
    'body', coalesce(activity_label, 'Tenés una actividad nueva'),
    'sound', 'default',
    'channelId', 'default',
    'data', jsonb_build_object('type', new.type, 'targetId', new.target_id, 'actorId', new.actor_id)
  )) into push_messages
  from public.user_push_tokens token
  where token.user_id = new.recipient_id and token.active;

  if push_messages is not null then
    begin
      perform net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        body := push_messages,
        headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

revoke all on function private.deliver_notification_push() from public, anon, authenticated;
drop trigger if exists deliver_notification_push on public.notifications;
create trigger deliver_notification_push
after insert on public.notifications
for each row execute function private.deliver_notification_push();
