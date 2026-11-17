create table public.responder_location_sharing (
  report_id bigint primary key references public.reports (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade
);

create table public.responder_live_locations (
  report_id bigint primary key references public.reports (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

alter table public.responder_live_locations enable row level security;
alter table public.responder_location_sharing enable row level security;
revoke all on public.responder_live_locations from public, anon, authenticated;
revoke all on public.responder_location_sharing from public, anon, authenticated;

create function public.start_responder_location_sharing()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(array['responder']) then
    raise exception 'active responder account required';
  end if;
  perform 1 from public.reports
    where assigned_responder_id = (select auth.uid())
      and user_id is not null
      and lower(trim(status)) = 'en route'
    for share;
  if not found then
    return false;
  end if;
  insert into public.responder_location_sharing (report_id, responder_id)
  select id, (select auth.uid()) from public.reports
  where assigned_responder_id = (select auth.uid())
    and user_id is not null
    and lower(trim(status)) = 'en route'
  on conflict do nothing;
  return true;
end;
$$;

create function public.update_responder_live_location(
  p_latitude double precision,
  p_longitude double precision
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  if not public.has_role(array['responder']) then
    raise exception 'active responder account required';
  end if;
  if p_latitude is null or p_latitude not between -90 and 90
    or p_longitude is null or p_longitude not between -180 and 180 then
    raise exception 'invalid coordinates';
  end if;

  perform 1 from public.reports r
  join public.responder_location_sharing s on s.report_id = r.id
  where s.responder_id = (select auth.uid())
    and r.assigned_responder_id = (select auth.uid())
    and r.user_id is not null
    and lower(trim(r.status)) = 'en route'
  for share of r;
  if not found then
    return 0;
  end if;

  perform 1 from public.responder_location_sharing
  where responder_id = (select auth.uid()) for update;
  if not found then
    return 0;
  end if;

  with active_reports as (
    select r.id
    from public.reports r
    join public.responder_location_sharing s on s.report_id = r.id
    where s.responder_id = (select auth.uid())
      and r.assigned_responder_id = (select auth.uid())
      and r.user_id is not null
      and lower(trim(r.status)) = 'en route'
  )
  insert into public.responder_live_locations
    (report_id, responder_id, latitude, longitude, updated_at)
  select id, (select auth.uid()), p_latitude, p_longitude, now()
  from active_reports
  on conflict (report_id) do update
  set responder_id = excluded.responder_id,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      updated_at = excluded.updated_at;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create function public.get_responder_live_location(p_report_id bigint)
returns table (latitude double precision, longitude double precision, updated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.latitude, l.longitude, l.updated_at
  from public.responder_live_locations l
  join public.reports r on r.id = l.report_id
  where r.id = p_report_id
    and r.user_id = (select auth.uid())
    and public.has_role(array['citizen'])
    and exists (
      select 1 from public.profiles p
      where p.id = l.responder_id and p.role = 'responder' and p.status = 'active'
    )
    and r.assigned_responder_id = l.responder_id
    and lower(trim(r.status)) = 'en route'
    and l.updated_at > now() - interval '2 minutes';
$$;

create function public.clear_my_responder_live_locations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.responder_location_sharing
  where responder_id = (select auth.uid());
  delete from public.responder_live_locations
  where responder_id = (select auth.uid());
end;
$$;

create function public.clear_responder_live_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_responder_id is distinct from old.assigned_responder_id
    or lower(trim(new.status)) <> 'en route' then
    delete from public.responder_location_sharing where report_id = new.id;
    delete from public.responder_live_locations where report_id = new.id;
  end if;
  return new;
end;
$$;

create trigger clear_responder_live_location_on_report_change
after update of status, assigned_responder_id on public.reports
for each row execute function public.clear_responder_live_location();

revoke all on function public.update_responder_live_location(double precision, double precision)
  from public, anon, authenticated;
revoke all on function public.start_responder_location_sharing()
  from public, anon, authenticated;
revoke all on function public.get_responder_live_location(bigint)
  from public, anon, authenticated;
revoke all on function public.clear_my_responder_live_locations()
  from public, anon, authenticated;
revoke all on function public.clear_responder_live_location()
  from public, anon, authenticated;
grant execute on function public.update_responder_live_location(double precision, double precision)
  to authenticated;
grant execute on function public.start_responder_location_sharing() to authenticated;
grant execute on function public.get_responder_live_location(bigint) to authenticated;
grant execute on function public.clear_my_responder_live_locations() to authenticated;
