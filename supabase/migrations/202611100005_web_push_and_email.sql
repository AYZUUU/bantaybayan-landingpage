create table if not exists public.web_push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon, authenticated;
grant select, insert, update, delete
  on public.web_push_subscriptions to authenticated;

create policy "Users manage their own web push subscriptions"
on public.web_push_subscriptions
for all
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant usage, select
  on sequence public.web_push_subscriptions_id_seq to authenticated;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_profile_email_after_auth_email_change on auth.users;
create trigger sync_profile_email_after_auth_email_change
after update of email on auth.users
for each row
when (new.email is distinct from old.email)
execute function public.sync_profile_email();

create or replace function public.has_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role = any (allowed_roles)
      and (
        (
          p.role not in ('admin', 'superadmin')
          or (select auth.jwt() ->> 'aal') = 'aal2'
        )
        and (
          not exists (
            select 1
            from auth.mfa_factors f
            where f.user_id = p.id
              and f.factor_type = 'totp'
              and f.status = 'verified'
          )
          or (select auth.jwt() ->> 'aal') = 'aal2'
        )
      )
  );
$$;
