alter table public.destination_suggestions
  add column if not exists category text not null default 'Naturaleza',
  add column if not exists district text,
  add column if not exists description text not null default '',
  add column if not exists price_national_crc numeric(10,2) not null default 0 check (price_national_crc >= 0),
  add column if not exists difficulty text not null default 'Moderada',
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.destination_suggestions alter column status set default 'published';

update public.destination_suggestions set status = 'published' where status = 'pending';

drop policy if exists "Users can submit destination suggestions" on public.destination_suggestions;
create policy "Users publish their own destinations"
on public.destination_suggestions for insert
to authenticated
with check ((select auth.uid()) = user_id and status = 'published');

create policy "Published destination suggestions are public"
on public.destination_suggestions for select
to anon, authenticated
using (status = 'published');

create index if not exists destination_suggestions_user_id_idx on public.destination_suggestions (user_id);
create index if not exists destination_suggestions_status_province_idx on public.destination_suggestions (status, province);
