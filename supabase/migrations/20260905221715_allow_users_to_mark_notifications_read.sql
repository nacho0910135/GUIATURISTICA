create policy "Usuarios marcan sus notificaciones"
on public.notifications
for update
to authenticated
using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);

notify pgrst, 'reload schema';
