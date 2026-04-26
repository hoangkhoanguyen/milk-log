-- ============================================================================
-- 0002_seed_allowlist.sql — Seed các email được phép đăng nhập (Section 8.2)
-- ============================================================================

-- Không seed email cá nhân trong repo (tránh lộ khi push public).
-- Thêm email thật của gia đình trong Supabase SQL Editor (hoặc migration local không commit).
insert into public.allowed_emails (email, note) values
  -- E2E / dev (khớp .env.test)
  ('test-a@milklog.local', 'test user A'),
  ('test-b@milklog.local', 'test user B')
on conflict (email) do update set note = excluded.note;
