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
      status = 'Rescuer En Route'
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

create or replace function public.get_report_status(p_report_id bigint)
returns table (
  id bigint,
  status text,
  assigned_responder_id uuid,
  assigned_responder_name text,
  assigned_responder_station text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.reports r
    where r.id = p_report_id
      and (
        r.user_id = (select auth.uid())
        or public.has_role(array['responder', 'admin', 'superadmin'])
      )
  ) then
    raise exception 'report not found or access denied';
  end if;

  return query
  select
    r.id,
    r.status,
    r.assigned_responder_id,
    nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    p.station
  from public.reports r
  left join public.profiles p on p.id = r.assigned_responder_id
  where r.id = p_report_id;
end;
$$;

revoke all on function public.get_report_status(bigint)
  from public, anon, authenticated;
grant execute on function public.get_report_status(bigint) to authenticated;
