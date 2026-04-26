-- ============================================================================
-- 0001_init.sql — Milk Logger initial schema
-- ============================================================================

-- Cleanup (safe re-run)
drop view if exists public.feedings_with_email;
drop trigger if exists enforce_allowlist_before_user_insert on auth.users;
drop function if exists public.enforce_email_allowlist();

-- ----------------------------------------------------------------------------
-- allowed_emails
-- ----------------------------------------------------------------------------
create table if not exists public.allowed_emails (
  email      text primary key,
  note       text,
  added_at   timestamptz not null default now()
);

alter table public.allowed_emails enable row level security;

-- Authenticated users can read the allowlist (handy for an admin UI later).
drop policy if exists "allowlist read" on public.allowed_emails;
create policy "allowlist read"
  on public.allowed_emails for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- enforce allowlist on auth.users insert
-- ----------------------------------------------------------------------------
create or replace function public.enforce_email_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_emails
    where email = lower(new.email)
  ) then
    raise exception 'Email % không được phép đăng nhập', new.email
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger enforce_allowlist_before_user_insert
  before insert on auth.users
  for each row execute function public.enforce_email_allowlist();

-- ----------------------------------------------------------------------------
-- feedings
-- ----------------------------------------------------------------------------
create table if not exists public.feedings (
  id          uuid primary key default gen_random_uuid(),
  volume_ml   integer not null check (volume_ml > 0 and volume_ml <= 2000),
  fed_at      timestamptz not null default now(),
  logged_by   uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists feedings_fed_at_idx on public.feedings (fed_at desc);

alter table public.feedings enable row level security;

-- Single shared dataset: any authenticated user has full access.
drop policy if exists "authenticated users can do anything" on public.feedings;
create policy "authenticated users can do anything"
  on public.feedings for all
  to authenticated
  using (true) with check (true);

-- ----------------------------------------------------------------------------
-- feedings_with_email — convenience view that joins author email
-- ----------------------------------------------------------------------------
create or replace view public.feedings_with_email
with (security_invoker = true) as
select
  f.id,
  f.volume_ml,
  f.fed_at,
  f.logged_by,
  f.created_at,
  u.email as logged_by_email
from public.feedings f
left join auth.users u on u.id = f.logged_by;

grant select on public.feedings_with_email to authenticated;
