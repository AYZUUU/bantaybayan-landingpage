-- Fill the reporter's contact number from their profile on every new report.
create or replace function public.fill_report_contact_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and coalesce(btrim(new.contact_number), '') = '' then
    select nullif(btrim(p.contact_number), '')
      into new.contact_number
      from public.profiles p
     where p.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_fill_contact_number on public.reports;
create trigger reports_fill_contact_number
before insert on public.reports
for each row execute function public.fill_report_contact_number();

-- Backfill existing reports that have no contact number.
update public.reports r
   set contact_number = nullif(btrim(p.contact_number), '')
  from public.profiles p
 where p.id = r.user_id
   and coalesce(btrim(r.contact_number), '') = ''
   and nullif(btrim(p.contact_number), '') is not null;
