-- Small key/value settings readable by the apps, editable only by superadmins.
create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;

drop policy if exists "Settings are readable by everyone" on public.app_settings;
create policy "Settings are readable by everyone"
on public.app_settings for select to anon, authenticated
using (key = 'hotline_number');

drop policy if exists "Superadmins can add settings" on public.app_settings;
create policy "Superadmins can add settings"
on public.app_settings for insert to authenticated
with check (key = 'hotline_number' and public.has_role(array['superadmin']));

drop policy if exists "Superadmins can change settings" on public.app_settings;
create policy "Superadmins can change settings"
on public.app_settings for update to authenticated
using (key = 'hotline_number' and public.has_role(array['superadmin']))
with check (key = 'hotline_number' and public.has_role(array['superadmin']));

insert into public.app_settings (key, value)
values ('hotline_number', '')
on conflict (key) do nothing;
