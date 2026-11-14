create table if not exists public.quick_report_rate_limits (
  request_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);

alter table public.quick_report_rate_limits enable row level security;
revoke all on public.quick_report_rate_limits from public, anon, authenticated;

create or replace function public.consume_quick_report_rate_limit(
  p_request_key text,
  p_limit integer default 5,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_window timestamptz := now();
  updated_count integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service role required';
  end if;
  if p_request_key is null
    or length(p_request_key) <> 64
    or p_limit < 1
    or p_window_seconds < 1
  then
    raise exception 'invalid rate limit request';
  end if;

  insert into public.quick_report_rate_limits (
    request_key,
    window_started_at,
    request_count
  )
  values (p_request_key, current_window, 1)
  on conflict (request_key) do update
  set
    window_started_at = case
      when public.quick_report_rate_limits.window_started_at
        <= current_window - make_interval(secs => p_window_seconds)
      then current_window
      else public.quick_report_rate_limits.window_started_at
    end,
    request_count = case
      when public.quick_report_rate_limits.window_started_at
        <= current_window - make_interval(secs => p_window_seconds)
      then 1
      else public.quick_report_rate_limits.request_count + 1
    end
  returning request_count into updated_count;

  delete from public.quick_report_rate_limits
  where window_started_at < current_window - interval '24 hours';

  return updated_count <= p_limit;
end;
$$;

revoke all on function public.consume_quick_report_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_quick_report_rate_limit(text, integer, integer)
  to service_role;
