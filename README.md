# Milk Logger

Web app cá nhân để ghi lại lịch sử bú sữa của bé. Đơn giản, mở app → chọn ml → xong.

## Stack

Next.js 15 (App Router) · React · TypeScript · Tailwind · shadcn primitives ·
Supabase (Postgres + Auth) · Recharts · Playwright + Vitest.

## Cài đặt

```bash
npm install
```

Tạo `.env.local` (đã có sẵn nếu clone từ workspace):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=postgres://...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Migration database

Chạy 1 lần (hoặc khi có migration mới):

```bash
npm run db:apply
```

Script đọc `SUPABASE_DB_URL` từ env và apply mọi file `.sql` trong
`supabase/migrations/` theo thứ tự.

## Dev

```bash
npm run dev
```

Mở http://localhost:3000.

## Test

Unit (Vitest) — pure logic helpers:

```bash
npm test
```

E2E (Playwright) — 15 flow theo PLAN.md Bước 8:

```bash
npx playwright install --with-deps chromium  # 1 lần
npm run test:e2e
```

`playwright.config.ts` tự khởi động `npm run dev` và đọc `.env.test`.

## Cấu trúc

```
src/
  app/                 Next.js App Router
    (auth)/login       trang đăng nhập magic link
    (app)/             các trang yêu cầu auth (home, history, stats)
    auth/callback      OAuth callback từ Supabase
  components/          UI components (incl. shadcn primitives)
  lib/
    supabase/          client/server/middleware Supabase clients
    actions/feedings   server actions: add/update/delete/list
    format.ts          pure helpers (timezone VN, formatGap…)
  middleware.ts        Next.js middleware (auth gate)
supabase/migrations/   SQL migration files (apply via npm run db:apply)
tests/
  unit/                Vitest tests cho lib/format
  e2e/                 Playwright specs (15 flow)
  helpers/             supabase-admin, login bypass
```

> Alias `@/*` trong `tsconfig.json` trỏ vào `src/*`, nên import vẫn viết
> `import { x } from '@/lib/format'` như bình thường.

## Notes

- Timezone của bé là VN (UTC+7). Toàn bộ format hiển thị đã offset.
- Allowlist email được enforce qua trigger Postgres trên `auth.users` —
  email không có trong `allowed_emails` không tạo được account.
- RLS policy "all authenticated users can do anything" → cả nhà thấy chung
  1 tập dữ liệu (theo plan section 3).
- PWA manifest có sẵn → "Add to Home Screen" trên iOS/Android.

## Deploy (sau)

Push lên GitHub, import vào Vercel, gắn 4 env vars là chạy.
Trỏ `baby.erosnguyen.com` về Vercel.

## Verify nhanh (lần đầu sau khi clone)

```bash
npm install
npx tsc --noEmit          # type-check toàn project — đã pass
npm test                  # 13 unit tests — đã pass
npm run db:apply          # apply 2 migration vào Supabase (cần SUPABASE_DB_URL)
npm run dev &             # khởi động dev server
npx playwright install --with-deps chromium
npm run test:e2e          # 15 E2E flow
```

> Ghi chú: `npm run db:apply` và `npm run test:e2e` cần network tới Supabase
> nên cần chạy trên máy local (sandbox CI có thể bị chặn outbound).
