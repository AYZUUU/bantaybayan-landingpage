alter table public.reports
  add column if not exists backup_requested_at timestamptz,
  add column if not exists backup_note text;

alter table public.reports
  drop constraint if exists reports_accident_level_valid;
alter table public.reports
  add constraint reports_accident_level_valid
  check (
    accident_level is null
    or accident_level in ('Low', 'Medium', 'High', 'Critical')
  ) not valid;

create or replace function public.request_report_backup(
  report_id bigint,
  note text default null
)
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
  set backup_requested_at = now(),
      backup_note = nullif(left(trim(coalesce(note, '')), 500), '')
  where id = report_id
    and assigned_responder_id = (select auth.uid())
    and lower(status) not like '%resolved%';

  return found;
end;
$$;

revoke all on function public.request_report_backup(bigint, text)
  from public, anon, authenticated;
grant execute on function public.request_report_backup(bigint, text)
  to authenticated;

create or replace function public.clear_report_backup_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if lower(new.status) like '%resolved%'
    or new.assigned_responder_id is distinct from old.assigned_responder_id then
    new.backup_requested_at := null;
    new.backup_note := null;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_clear_backup_request on public.reports;
create trigger reports_clear_backup_request
before update of status, assigned_responder_id on public.reports
for each row execute function public.clear_report_backup_request();
