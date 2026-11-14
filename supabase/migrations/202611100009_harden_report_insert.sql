-- Signed-in users may only submit the reporter-facing fields of a new report.
-- Assignment, backup and bookkeeping columns can no longer be set on insert.
revoke insert on public.reports from authenticated;
grant insert (
  user_id,
  reporter_name,
  contact_number,
  emergency_type,
  accident_level,
  description,
  latitude,
  longitude,
  image_path,
  status,
  municipality,
  province
) on public.reports to authenticated;

drop policy if exists "Active users can submit their own reports" on public.reports;
create policy "Active users can submit their own reports"
on public.reports for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'Pending'
  and assigned_responder_id is null
  and public.has_role(array['citizen', 'responder', 'admin', 'superadmin'])
);

-- Keep the contact-number trigger consistent with the other definer functions.
create or replace function public.fill_report_contact_number()
returns trigger
language plpgsql
security definer
set search_path = ''
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
