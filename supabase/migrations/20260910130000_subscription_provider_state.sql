alter table public.subscriptions
  add column if not exists provider_status text;

notify pgrst, 'reload schema';
