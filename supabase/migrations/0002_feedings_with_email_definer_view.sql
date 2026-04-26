-- ============================================================================
-- 0002_feedings_with_email_definer_view.sql
--
-- Fix: allow authenticated users to query feedings_with_email.
-- The previous view was created with `security_invoker = true`, which makes the
-- join against `auth.users` run with the caller's privileges and fails with:
--   permission denied for table users
--
-- Recreate the view as a definer view (default behavior) so it runs with the
-- view owner's privileges while still only exposing the selected columns.
-- ============================================================================

drop view if exists public.feedings_with_email;

create or replace view public.feedings_with_email as
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

