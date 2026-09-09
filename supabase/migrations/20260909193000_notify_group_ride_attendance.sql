-- Notify the ride organizer in Profile when someone confirms attendance.
insert into public.app_options
  (kind,id,label_es,label_en,icon,parent_id,allowed_targets,sort_order)
values
  ('notification_type','ride_attendance','confirmó que asistirá a tu rodada','confirmed attendance at your ride','calendar-check-outline',null,null,64)
on conflict (kind,id) do update set
  label_es=excluded.label_es,
  label_en=excluded.label_en,
  icon=excluded.icon,
  sort_order=excluded.sort_order,
  active=true;

create or replace function public.notify_group_ride_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  select organizer_id into recipient
  from public.group_rides
  where id = new.ride_id;

  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications(recipient_id, actor_id, type, target_id)
    values(recipient, new.user_id, 'ride_attendance', new.ride_id);
  end if;
  return new;
end
$$;

revoke all on function public.notify_group_ride_attendance() from public, anon, authenticated;

drop trigger if exists group_ride_attendance_notification on public.group_ride_attendees;
create trigger group_ride_attendance_notification
after insert on public.group_ride_attendees
for each row execute function public.notify_group_ride_attendance();
