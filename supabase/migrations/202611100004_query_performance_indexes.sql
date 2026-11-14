create index if not exists reports_created_at_idx
  on public.reports (created_at desc);

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

create index if not exists profiles_active_responders_idx
  on public.profiles (first_name)
  where role = 'responder' and status = 'active';
