create index if not exists information_reports_reporter_idx
  on public.information_reports (reporter_id, created_at desc);
