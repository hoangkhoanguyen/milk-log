# Kế hoạch build web log lịch sử bú sữa

## 1. Mục tiêu sản phẩm

Web app cá nhân, tối giản, để ghi lại từng lần bú sữa của bé. Trải nghiệm cốt lõi: **mở app → bấm 1 nút → nhập ml → xong**. Hệ thống tự động đính kèm timestamp.

Không cần đăng ký phức tạp, không cần nhiều form, không cần nhiều trường dữ liệu. Dùng được cả trên điện thoại lúc đang bế bé một tay.

## 2. Tech stack đã chọn

- **Frontend**: Next.js 16 / latest (App Router) + React + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (component đẹp sẵn, dark mode)
- **Database**: Supabase (Postgres managed, free tier, có realtime + auth sẵn)
- **Chart**: Recharts (đơn giản, hợp với React)
- **Hosting**: Vercel (deploy từ GitHub, free, tích hợp tốt với Next.js)
- **Auth**: Supabase Auth bằng magic link email (không cần nhớ password)

## 3. Mô hình dữ liệu

**Mô hình chia sẻ**: chỉ theo dõi 1 bé duy nhất. Mọi user trong danh sách allowlist đều thấy và thao tác trên **cùng một tập dữ liệu**. Cột `logged_by` chỉ để ghi nhận ai nhập (audit trail, sau này có thể hiện "mẹ đã ghi" / "bố đã ghi"), **không** dùng để cô lập dữ liệu.

### Bảng `feedings`

| cột | kiểu | mô tả |
|---|---|---|
| `id` | uuid | primary key, default `gen_random_uuid()` |
| `volume_ml` | int | dung tích sữa (ml) |
| `fed_at` | timestamptz | thời điểm bú, default `now()` |
| `logged_by` | uuid | FK → `auth.users.id`, người nhập (nullable để phòng trường hợp user bị xoá) |
| `created_at` | timestamptz | bản ghi tạo lúc nào |

Index: `(fed_at DESC)` để truy vấn list mới nhất nhanh.

### Bảng `allowed_emails`

Danh sách email được phép đăng nhập. Chỉnh tay qua Supabase SQL Editor khi muốn thêm/bớt người.

| cột | kiểu | mô tả |
|---|---|---|
| `email` | text | primary key, lowercase |
| `note` | text | ghi chú: "bố", "mẹ", "bà ngoại"… |
| `added_at` | timestamptz | default `now()` |

### Policy RLS

Bật RLS trên `feedings`, policy duy nhất:

```sql
create policy "authenticated users can do anything"
  on feedings for all
  to authenticated
  using (true) with check (true);
```

Bất kỳ user nào **đăng nhập thành công** (nghĩa là đã vượt qua allowlist) đều có full quyền. Đơn giản, phù hợp bối cảnh dùng nội bộ gia đình.

### Chặn email không nằm trong allowlist

Dùng Postgres trigger trên `auth.users`:

```sql
create or replace function public.enforce_email_allowlist()
returns trigger as $$
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
$$ language plpgsql security definer;

create trigger enforce_allowlist_before_user_insert
  before insert on auth.users
  for each row execute function public.enforce_email_allowlist();
```

Trigger chạy ở tầng DB → bảo đảm kể cả khi ai đó gọi thẳng API Supabase cũng không tạo được account ngoài allowlist. Người dùng thấy lỗi rõ ràng ở bước xin magic link.

## 4. Các màn hình

### Trang chính `/`
- Nút lớn ở giữa: **+ Thêm lần bú**
- Bên dưới hiển thị: **lần bú gần nhất** (cách đây bao lâu, bao nhiêu ml)
- Tổng ml của ngày hôm nay
- Link sang trang lịch sử và biểu đồ

### Modal "Thêm lần bú"
- 1 ô input số: dung tích (ml)
- Nút quick-pick: 60, 90, 120, 150, 180 ml (bấm 1 phát chọn nhanh)
- Mặc định thời gian = bây giờ. Có nút nhỏ "chỉnh thời gian" nếu muốn nhập lùi.
- Nút **Lưu** → insert vào DB → đóng modal → toast "Đã lưu 120ml"

### Trang lịch sử `/history`
- Danh sách các lần bú, nhóm theo ngày
- Mỗi item: thời gian (HH:mm), dung tích, khoảng cách so với lần bú trước (ví dụ: "+ 2h 15m")
- Cuối mỗi ngày: tổng ml + số lần bú
- Vuốt ngang / nhấn item để **edit hoặc xoá**
- Thời gian chú ý timezone của tôi là +7 (Việt Nam)

### Trang biểu đồ `/stats`
- Bar chart tổng ml theo ngày (7 ngày gần nhất, 30 ngày)
- Line chart số lần bú / ngày
- Khoảng cách trung bình giữa các lần bú

## 5. Các bước triển khai

### Bước 1 — Setup project (30 phút)
1. `npx create-next-app@latest milk-log --typescript --tailwind --app`
2. Cài: `@supabase/supabase-js`, `@supabase/ssr`, `recharts`, `date-fns`, `lucide-react`
3. Cài shadcn: `npx shadcn@latest init`, add `button`, `dialog`, `input`, `toast`, `card`

### Bước 2 — Setup Supabase (30 phút)
1. Tạo project trên supabase.com (free)
2. SQL Editor — chạy migration theo thứ tự:
   - Tạo bảng `allowed_emails`
   - Insert các email được phép (xem Section 8.2)
   - Tạo function + trigger `enforce_email_allowlist` trên `auth.users`
   - Tạo bảng `feedings` + index
   - Bật RLS, tạo policy "authenticated users can do anything"
3. Lấy `SUPABASE_URL` + `SUPABASE_ANON_KEY` → bỏ vào `.env.local`
4. Bật Email Auth, dùng Magic Link. **Tắt** "Enable email signups" ở mức Supabase nếu muốn double-lock (allowlist trigger đã đủ, nhưng tắt thêm cũng không sao).

### Bước 3 — Auth (1 giờ)
- Trang `/login` chỉ có 1 input email + nút "Gửi magic link"
- Khi email không nằm trong `allowed_emails`, Supabase raise exception → UI hiển thị: "Email này không được phép đăng nhập. Liên hệ admin để được thêm vào."
- Middleware Next.js redirect chưa login → `/login`
- Callback route xử lý token từ email
- Refresh token có thời hạn 7 ngày

### Bước 4 — CRUD lần bú (2 giờ)
- Server action `addFeeding(volumeMl, fedAt)` → insert với `logged_by = auth.uid()`
- Server action `deleteFeeding(id)`, `updateFeeding(id, ...)` — không filter theo user, ai đăng nhập cũng sửa/xoá được (hợp với mô hình chia sẻ gia đình)
- Component `<AddFeedingDialog />` với form tối giản
- Trang chính fetch `last feeding` + `today's total` (chung cho cả nhà)

### Bước 5 — Trang lịch sử (1.5 giờ)
- Query: `select f.*, u.email as logged_by_email from feedings f left join auth.users u on u.id = f.logged_by order by fed_at desc limit 100`
- Hiển thị thêm badge nhỏ "ghi bởi <tên/email>" nếu có từ 2 người dùng trở lên
- Group theo ngày (dùng `date-fns` `startOfDay`)
- Component `<FeedingItem />` với swipe-to-delete (mobile)

### Bước 6 — Trang stats (1.5 giờ)
- Query aggregate theo ngày
- Recharts: BarChart + LineChart
- Stat cards: TB ml/ngày, TB lần/ngày, khoảng cách TB

### Bước 7 — Polish (1 giờ)
- PWA manifest + icon → "Add to Home Screen" trên iPhone
- Dark mode
- Empty state cho user mới
- Loading skeleton
- Optimistic update (bấm lưu là thấy ngay, không đợi network)

### Bước 8 — Integration tests (2 giờ)

**Stack test**: Playwright (E2E) + Vitest (unit test cho helper). Playwright chạy browser thật, cover được toàn bộ flow từ UI → server action → Supabase.

**Môi trường test**:
- Tạo **Supabase project riêng cho test** (không dùng chung với prod) để có thể xoá dữ liệu thoải mái.
- Seed 2 user test vào `allowed_emails`: `test-a@milklog.local`, `test-b@milklog.local` (để test flow chia sẻ dữ liệu giữa 2 người). Một email ngoài allowlist `blocked@milklog.local` **không** insert để test flow chặn.
- Bypass magic link bằng Supabase Admin API (`auth.admin.generateLink`) trong `globalSetup` của Playwright.
- Mỗi test bắt đầu bằng `TRUNCATE feedings` → state sạch.

**Các flow phải test**:

| # | Flow | Bước kiểm tra |
|---|---|---|
| 1 | Auth — magic link (email hợp lệ) | Nhập `test-a@...` → gửi → giả lập callback → verify đã ở trang chính |
| 2 | Auth — email không trong allowlist | Nhập `blocked@...` → gửi → verify UI hiển thị lỗi "không được phép đăng nhập" + DB không tạo user |
| 3 | Middleware redirect | Truy cập `/` khi chưa login → phải redirect về `/login` |
| 4 | Thêm lần bú bằng quick-pick | Mở modal → bấm "120 ml" → Lưu → verify item xuất hiện ở "lần gần nhất" + tổng ngày +120 + `logged_by` = user A |
| 5 | Thêm lần bú nhập tay | Gõ `95` → Lưu → verify trong DB có bản ghi `volume_ml=95` |
| 6 | Thêm với thời gian lùi | Chỉnh thời gian 2h trước → Lưu → verify `fed_at` đúng, hiển thị đúng thứ tự ở list |
| 7 | Edit lần bú | Mở item → sửa `120 → 130` → Save → verify UI + DB update |
| 8 | Xoá lần bú | Swipe/bấm xoá → confirm → verify biến mất UI + biến mất trong DB |
| 9 | Chia sẻ dữ liệu giữa user | User A insert 1 lần bú → logout → login user B → verify user B **thấy được** bản ghi đó + hiển thị "ghi bởi test-a@…" |
| 10 | User B sửa/xoá dữ liệu của user A | Login user B → xoá bản ghi user A vừa tạo → login user A → verify thấy bản ghi đã biến mất (cùng 1 tập dữ liệu) |
| 11 | Lịch sử group theo ngày | Seed data 3 ngày → vào `/history` → verify group header + tổng ml/ngày đúng |
| 12 | Khoảng cách giữa lần bú | Seed 2 lần cách 2h15m → verify hiển thị "+ 2h 15m" |
| 13 | Stats chart | Seed 7 ngày data → vào `/stats` → verify bar chart có đúng 7 cột, tooltip value khớp |
| 14 | Optimistic update + rollback | Mock network fail → bấm Lưu → verify item hiện ra rồi biến mất + toast lỗi |
| 15 | Audit trail hiển thị khi 2+ user | Có feeding của cả A và B → verify UI hiện badge "ghi bởi" cho từng item |

**Cấu trúc file test**:
```
tests/
├── e2e/
│   ├── auth.spec.ts              # test 1, 2, 3 — login + allowlist
│   ├── add-feeding.spec.ts       # test 4, 5, 6, 7, 8
│   ├── sharing.spec.ts           # test 9, 10, 15 — shared data giữa user
│   ├── history.spec.ts           # test 11, 12
│   ├── stats.spec.ts             # test 13
│   └── resilience.spec.ts        # test 14
├── helpers/
│   ├── supabase-admin.ts    # seed/truncate helpers
│   └── login.ts             # bypass magic link
├── playwright.config.ts
└── .env.test                # credentials project test
```

**CI**: thêm GitHub Actions chạy `pnpm test:e2e` trên mỗi PR. Vercel chỉ deploy khi CI pass.

### Bước 9 — Deploy (15 phút)
- Push lên GitHub
- Import vào Vercel, gắn env vars
- Trỏ domain `baby.erosnguyen.com` → Vercel

**Tổng thời gian ước tính**: 9-10 giờ làm việc thực sự (có thể chia 3-4 buổi tối).

## 6. Cấu trúc thư mục đề xuất

```
milk-log/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── page.tsx              # Trang chính
│   │   ├── history/page.tsx
│   │   └── stats/page.tsx
│   ├── api/auth/callback/route.ts
│   └── layout.tsx
├── components/
│   ├── add-feeding-dialog.tsx
│   ├── feeding-item.tsx
│   ├── stat-card.tsx
│   └── ui/                        # shadcn
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # browser client
│   │   ├── server.ts              # server client
│   │   └── middleware.ts
│   ├── actions/feedings.ts        # server actions
│   └── utils.ts
├── proxy.ts
└── .env.local
```

## 7. Mở rộng tương lai (không làm bây giờ)

- Trang admin quản lý allowlist qua UI (thay vì phải vào Supabase SQL Editor)
- Hiển thị phân quyền: chỉ người ghi mới được xoá bản ghi của mình (hiện tại cả nhà ai cũng xoá được)
- Thêm log: tã, ngủ, chiều cao cân nặng
- Nhiều bé: thêm bảng `babies` + `baby_id` vào `feedings`, selector đầu trang để đổi bé
- Reminder push notification khi đến giờ bú
- Export CSV/PDF báo cáo cho bác sĩ
- App native (React Native) chia sẻ chung Supabase backend

## 8. Thông tin / credentials tôi cần bạn cung cấp

Điền các giá trị bên dưới vào một file riêng (ví dụ `SECRETS.md` — **không commit lên GitHub**) hoặc copy thẳng vào `.env.local` / `.env.test` khi tới lúc code.
Tài liệu này **không** chứa bất kỳ secret/token/password thật nào.

### 8.1. Supabase (bắt buộc)

| Key | Lấy ở đâu | Dùng để làm gì | Giá trị |
|---|---|---|---|
| `SUPABASE_URL` (prod) | Supabase Dashboard → Project Settings → API → Project URL | Client + server gọi DB | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` (prod) | Project Settings → API → anon public | Client SDK (public, an toàn vì có RLS) | `<anon-jwt>` |
| `SUPABASE_SERVICE_ROLE_KEY` (prod) | Project Settings → API → service_role | Server action cần bypass RLS (hiếm dùng, nhưng giữ kín) | `<service-role-jwt>` |
| `SUPABASE_DB_PASSWORD` (prod) | Lúc tạo project (hoặc reset trong Settings → Database) | Chạy migration / direct DB | `<db-password>` |
| `SUPABASE_PROJECT_REF` (prod) | URL dạng `xxxxx.supabase.co` → phần `xxxxx` | Dùng với `supabase link` CLI | `<project-ref>` |
| `SUPABASE_URL` (test) | Project test riêng | Env test | ☐ |
| `SUPABASE_ANON_KEY` (test) | Project test riêng | Env test | ☐ |
| `SUPABASE_SERVICE_ROLE_KEY` (test) | Project test riêng | Seed / truncate trong Playwright | ☐ |

Hiện tại mới nên dùng production để test luôn đi

### 8.2. Allowlist email (bắt buộc)

Danh sách email được phép đăng nhập. Insert vào bảng `allowed_emails` ngay sau khi tạo bảng. Có thể thêm/bớt bất cứ lúc nào qua SQL Editor.

| Email | Ghi chú (note) | Đã có chưa |
|---|---|---|
| `<email-bố>` | bố (admin) | ☐ xác nhận |
| `<email-mẹ>` | mẹ | ☐ cần bạn cung cấp |


Ví dụ SQL sẽ chạy:

```sql
insert into public.allowed_emails (email, note) values
  ('<email-bố>', 'bố'),
  ('<email-mẹ>',        'mẹ');
```

### 8.3. Email auth

| Key | Mô tả | Đã có chưa |
|---|---|---|
| Email test A | Ví dụ `test-a@milklog.local` — phải insert vào `allowed_emails` của project test | ☐ (Claude tự tạo) |
| Email test B | `test-b@milklog.local` — dùng để test flow chia sẻ dữ liệu giữa 2 người | ☐ (Claude tự tạo) |
| Email test bị chặn | `blocked@milklog.local` — **không** insert vào allowlist, để test flow từ chối | ☐ (Claude tự tạo) |
| SMTP custom (tuỳ chọn) | Mặc định Supabase gửi mail giùm, giới hạn 4/giờ. Nếu muốn không bị giới hạn thì gắn SMTP riêng (Resend, SendGrid, Gmail SMTP). Có thể skip ở v1. | ☐ (skip được) |

### 8.4. Hosting / Domain

| Key | Mô tả | Đã có chưa |
|---|---|---|
| GitHub account | Để push repo + trigger Vercel | ☐ |
| Vercel account | Login bằng GitHub là xong | ☐ |
| Domain `erosnguyen.com` DNS access | Để thêm record `baby` → Vercel (CNAME hoặc A record) | ☐ |
| DNS provider (Cloudflare / Namecheap / …) | Biết provider để hướng dẫn thêm subdomain | ☐ |

### 8.5. Tuỳ chọn (có cũng tốt, không có cũng được)

| Key | Mô tả |
|---|---|
| Icon / logo PNG cho PWA | Ít nhất 192x192 và 512x512. Nếu không có, Claude gen tạm bằng emoji 🍼 |
| Màu chủ đạo | Default: pastel xanh mint. Nói nếu muốn màu khác |
| Font tiếng Việt | Default: Inter + hệ thống. Có thể đổi sang Be Vietnam Pro |

### 8.6. Claude không cần bạn cung cấp

Để tham khảo — những cái sau Claude tự sinh hoặc lấy được:
- UUID của user (Supabase tự gen khi login lần đầu)
- `id` của bản ghi `feedings` (Postgres tự gen)
- JWT secret của Supabase Auth (Supabase quản lý)
- SSL cert cho domain (Vercel tự cấp Let's Encrypt)

## 9. Quyết định cần xác nhận trước khi code

- **Tên domain / tên app**: `baby.erosnguyen.com` — "Milk Logger" ✅
- **Đăng nhập**: có, magic link qua email ✅
- **Mô hình truy cập**: 1 bé duy nhất, dữ liệu chia sẻ giữa các user được whitelist. Dùng bảng `allowed_emails` + trigger trên `auth.users` để chặn email ngoài danh sách. ✅
- **Đơn vị**: ml ✅
- **Theo dõi**: 1 bé (tạm thời) ✅
- **Cần bạn cung cấp**: danh sách email được phép đăng nhập (Section 8.2) — ít nhất email của bố + mẹ.
