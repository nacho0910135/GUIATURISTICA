-- The header shows the current reference exchange rate before sign-in.
grant select on table public.system_exchange_rates to anon;

drop policy if exists "Invitados leen tipos de cambio" on public.system_exchange_rates;
create policy "Invitados leen tipos de cambio"
on public.system_exchange_rates for select to anon
using (true);

notify pgrst, 'reload schema';
