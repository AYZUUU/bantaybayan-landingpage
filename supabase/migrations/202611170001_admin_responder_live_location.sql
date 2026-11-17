create or replace function public.get_responder_live_location(p_report_id bigint)
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
    and (
      (
        r.user_id = (select auth.uid())
        and public.has_role(array['citizen'])
      )
      or public.has_role(array['admin', 'superadmin'])
    )
    and exists (
      select 1 from public.profiles p
      where p.id = l.responder_id and p.role = 'responder' and p.status = 'active'
    )
    and r.assigned_responder_id = l.responder_id
    and lower(trim(r.status)) = 'dispatched'
    and l.updated_at > now() - interval '2 minutes';
$$;

-- "Dispatched" is the single status for an assigned responder.
update public.reports
set status = 'Dispatched'
where lower(trim(status)) in ('rescuer en route', 'en route');

create or replace function public.respond_to_report(report_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role(array['responder']) then
    raise exception 'active responder account required';
  end if;

  update public.reports
  set assigned_responder_id = (select auth.uid()),
      status = 'Dispatched'
  where id = report_id
    and (
      assigned_responder_id is null
      or assigned_responder_id = (select auth.uid())
    )
    and lower(status) in ('pending', 'dispatched', 'assigned');

  return found;
end;
$$;

revoke all on function public.respond_to_report(bigint)
  from public, anon, authenticated;
grant execute on function public.respond_to_report(bigint) to authenticated;

revoke all on function public.get_responder_live_location(bigint)
  from public, anon, authenticated;
grant execute on function public.get_responder_live_location(bigint) to authenticated;
