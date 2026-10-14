# Kiến trúc hệ thống Tường Vi Mart

## 1. Nguyên tắc

- Server là nguồn sự thật duy nhất cho giá, tồn kho, điểm, trạng thái đơn và quyền hạn. Trình duyệt chỉ hiển thị và gửi yêu cầu.
- Mặc định từ chối: thiếu cấu hình, sai chữ ký, không rõ quyền thì từ chối, không "chạy tạm bằng mock".
- Mọi thay đổi liên quan tới tiền, kho, điểm diễn ra trong một transaction Postgres, và có thể gọi lặp lại an toàn (idempotent).
- Giữ đơn giản: một ứng dụng Next.js (monolith có phân module), một database. Không microservice.
- Dữ liệu sẵn sàng đa kho ngay từ đầu, nhưng giai đoạn này chỉ vận hành 1 kho online.

## 2. Hạ tầng đã chọn

| Thành phần | Lựa chọn | Ghi chú |
|---|---|---|
| Ứng dụng web | Vercel, gói Pro | Gói Hobby không dùng cho mục đích thương mại. Tự lo TLS, CDN, vá hệ điều hành. |
| Database | Supabase Postgres, gói Pro, region Singapore (ap-southeast-1) | Gói Free bị tạm dừng khi không hoạt động và không có backup tự động. |
| Đăng nhập | Supabase Auth | Đã có sẵn: băm mật khẩu, phiên, OTP qua SMS, TOTP MFA, CAPTCHA, rate limit. |
| Ảnh | Supabase Storage: bucket riêng tư `incoming` (upload bằng signed URL), bucket riêng tư `normalized` (bản chuẩn hóa), bucket công khai `media` (các bản WebP đã nén) | Bớt được một nhà cung cấp so với Cloudinary. Xử lý bằng `sharp` (cần duyệt dependency), xem mục 15. |
| Thanh toán | SePay (webhook HMAC + API đối soát v2) | |
| SMS OTP | Nhà cung cấp trong nước (eSMS, SpeedSMS hoặc Zalo ZNS) qua Supabase Send SMS Hook | Cần đăng ký brandname; chủ dự án chọn nhà cung cấp. |
| CAPTCHA | Cloudflare Turnstile | Supabase Auth hỗ trợ sẵn. |
| Job định kỳ | Vercel Cron | Gọi `/api/cron/*`, bảo vệ bằng `CRON_SECRET`. |
| Theo dõi lỗi | Sentry | Tắt gửi PII mặc định. |

Lý do chọn: chủ dự án không có đội vận hành máy chủ. Dịch vụ quản lý sẵn giảm rủi ro cấu hình sai, quên vá lỗ hổng, mất backup. Đây mới là các rủi ro bảo mật lớn nhất với cửa hàng nhỏ.

Chi phí nền ước tính (tham khảo, cần kiểm tra giá hiện tại): Vercel Pro khoảng 20 USD/tháng, Supabase Pro khoảng 25 USD/tháng. Chưa gồm phí SMS, phí SePay, tên miền.

Kế hoạch thoát (nếu tư vấn pháp lý yêu cầu lưu dữ liệu tại Việt Nam):
- Database là Postgres chuẩn, truy cập qua Drizzle, không dùng tính năng riêng của Supabase ngoài Auth và Storage. Chuyển sang Postgres đặt tại Việt Nam chỉ cần đổi `DATABASE_URL` và chạy migration.
- Auth nằm sau interface `AuthPort` (`src/server/auth/`). Khi cần thay Supabase Auth thì viết adapter mới; mật khẩu băm bcrypt trong `auth.users` có thể xuất ra để chuyển.
- Storage nằm sau interface `StoragePort`.
- Ứng dụng build được dạng `output: "standalone"` để chạy bằng Docker trên VPS.

## 3. Sơ đồ thành phần

```mermaid
flowchart LR
  subgraph Browser["Trình duyệt (không tin cậy)"]
    Shop["Storefront + Tài khoản"]
    Admin["Trang quản trị"]
  end
  subgraph Vercel["Vercel: Next.js"]
    MW["proxy.ts: CSP nonce, làm mới phiên"]
    RSC["Server Components + Server Actions"]
    API["Route Handlers: webhook, cron, status"]
    SVC["src/server/modules: nghiệp vụ"]
  end
  subgraph Supabase
    PG[("Postgres: schema app")]
    AUTH["Auth"]
    ST["Storage: ảnh SP"]
  end
  SePay["SePay"] -->|"webhook ký HMAC"| API
  API -->|"API v2 đối soát"| SePay
  AUTH -->|"Send SMS Hook"| API
  API --> SMS["Nhà cung cấp SMS"]
  Shop --> MW --> RSC
  Admin --> MW
  RSC --> SVC
  API --> SVC
  SVC --> PG
  SVC --> AUTH
  SVC --> ST
  Shop -.->|"chỉ tải ảnh"| ST
```

Trình duyệt không gọi trực tiếp Supabase (trừ tải ảnh public). Mọi thao tác đăng nhập đi qua Server Action, nhờ vậy rate limit, CAPTCHA và audit nằm ở server của mình.

## 4. Cấu trúc thư mục

```
.
├── CLAUDE.md
├── .github/workflows/ci.yml         # CI (T0.7): job tổng hợp "ci" là điều kiện bắt buộc khi merge
├── docs/
├── drizzle.config.ts                # cấu hình drizzle-kit (chỉ dùng ở máy dev và CI)
├── drizzle/                         # migration sinh bởi drizzle-kit (commit vào git)
├── supabase/config.toml             # cấu hình Supabase local (supabase start)
├── scripts/                         # chạy trực tiếp bằng Node; file .mts để Node hiểu là ESM
│   ├── lib/local-db-guard.mts       # chặn công cụ chạy nhầm vào database thật
│   ├── ci/check-vitest-report.mts   # CI: đỏ nếu bộ test rỗng hoặc có test bị skip/todo
│   ├── db-migrate.mts               # áp dụng migration bằng DATABASE_MIGRATION_URL
│   ├── db-set-local-password.mts    # đặt mật khẩu app_runtime ở local (chỉ APP_ENV=local)
│   ├── create-admin.ts              # tạo admin đầu tiên (chạy tay, hỏi mật khẩu qua prompt)
│   ├── seed-local.ts                # dữ liệu mẫu, từ chối chạy khi APP_ENV=production
│   ├── reprocess-images.ts          # pnpm images:reprocess: tạo lại mọi bản ảnh từ ảnh chuẩn hóa
│   └── import-admin-units.ts        # nạp danh mục 34 tỉnh/thành + phường/xã
├── src/
│   ├── proxy.ts
│   ├── app/
│   │   ├── (shop)/
│   │   │   ├── page.tsx                         # trang chủ
│   │   │   ├── danh-muc/[slug]/page.tsx
│   │   │   ├── san-pham/[slug]/page.tsx
│   │   │   ├── tim-kiem/page.tsx
│   │   │   ├── gio-hang/page.tsx
│   │   │   ├── thanh-toan/page.tsx              # checkout
│   │   │   ├── don-hang/[id]/page.tsx           # QR thanh toán, theo dõi, QR bàn giao
│   │   │   └── chinh-sach/[slug]/page.tsx       # điều khoản, quyền riêng tư, đổi trả
│   │   ├── (auth)/dang-nhap, dang-ky, quen-mat-khau
│   │   ├── tai-khoan/                           # hồ sơ, địa chỉ, đơn hàng, điểm, bảo mật
│   │   ├── admin/
│   │   │   ├── dang-nhap/page.tsx               # đăng nhập nhân viên + bước MFA
│   │   │   └── (protected)/                     # layout gọi requireStaff() phía server
│   │   │       ├── page.tsx                     # dashboard
│   │   │       ├── don-hang/  san-pham/  danh-muc/  kho/  khach-hang/
│   │   │       ├── nhan-vien/  thanh-toan/  hoan-tien/  bao-cao/
│   │   │       └── cai-dat/  nhat-ky/
│   │   └── api/
│   │       ├── webhooks/sepay/route.ts
│   │       ├── auth-hooks/send-sms/route.ts
│   │       ├── orders/[id]/status/route.ts
│   │       └── cron/[job]/route.ts              # expire-orders, reconcile-payments, retry-bank-tx, cleanup
│   ├── components/
│   │   ├── ui/                                  # Button, Input, Modal, Badge... (thuần hiển thị); AppImage (ảnh theo preset)
│   │   ├── shop/                                # ProductCard, CartDrawer, Header... (port từ code cũ)
│   │   └── admin/
│   ├── stores/                                  # Zustand, chỉ trạng thái UI
│   │   ├── cart.ts                              # [{sellUnitId, qty}] + persist localStorage
│   │   └── ui.ts
│   ├── lib/                                     # hàm thuần dùng chung client/server
│   │   ├── format.ts  slugify.ts  geo.ts  phone.ts
│   │   └── images/ presets.ts  loader.ts        # định nghĩa preset (chiều rộng, tỉ lệ, sizes) + custom loader cho next/image
│   └── server/                                  # mọi file: import "server-only"
│       ├── env.ts                               # Zod parse biến môi trường, fail-fast
│       ├── db/ client.ts  schema/*.ts  tx.ts
│       ├── auth/ port.ts  supabase.adapter.ts  session.ts  guards.ts
│       ├── lib/ errors.ts  logger.ts  rate-limit.ts  tokens.ts  money.ts  clock.ts  vietqr.ts  safe-equal.ts
│       ├── security/ headers.ts                 # hàm thuần dựng CSP + header bảo mật; proxy.ts gọi
│       ├── audit/ service.ts  actions.ts  payload.ts  request-context.ts  repo.ts
│       │                                        # record() dùng chung cho mọi module, xem mục 12
│       ├── adapters/                            # "Switchboard"
│       │   ├── payment/ index.ts  sepay.ts  fake.ts
│       │   ├── sms/ index.ts  console.ts  esms.ts (hoặc nhà cung cấp được chọn)
│       │   ├── storage/ index.ts  supabase.ts  memory.ts
│       │   ├── captcha/ index.ts  turnstile.ts  always-pass.ts
│       │   └── notifier/ index.ts  noop.ts  telegram.ts (tùy chọn)
│       └── modules/
│           ├── catalog/  pricing/  inventory/  fulfillment/
│           ├── checkout/  orders/  payments/  handover/  refunds/
│           ├── loyalty/  customers/  staff/  settings/
│           ├── reports/  analytics/  notifications/  media/
│           │   (fulfillment/ gồm strategy.ts và shipping/: port.ts  free.policy.ts  index.ts, xem mục 14;
│           │    media/ gồm service xử lý ảnh, xem mục 15)
│           └── (mỗi module: service.ts, repo.ts, schemas.ts, *.test.ts)
└── tests/
    ├── integration/   # chạy với Postgres local (supabase start)
    ├── e2e/           # Playwright
    └── factories/
```

## 5. Phân lớp và luồng request

```
UI (Server Component / Client Component)
  → Server Action hoặc Route Handler
      1. requireX()           xác thực + phân quyền (server/auth/guards.ts)
      2. rateLimit(key)       nếu là thao tác nhạy cảm
      3. schema.parse(input)  Zod
      4. service.doThing()
  → service (nghiệp vụ, gọi hàm thuần + repo, mở transaction)
  → repo (Drizzle)
```

Quy tắc:
- Server Action là endpoint công khai: ai cũng gọi được nếu biết ID. Mỗi action phải tự gọi guard, không dựa vào việc trang đã được bảo vệ.
- Guard: `requireCustomer()`, `requireStaff()`, `requireAdmin({ mfa: true })`, `requireOrderAccess(orderId, { viewToken? })`.
- Quyền đọc từ database mỗi request (bảng `staff_members`, `customers`), không tin claim do client gửi. Vô hiệu hóa nhân viên có hiệu lực ngay.
- Thao tác nhạy cảm của admin (hoàn tiền, xử lý giao dịch ngoại lệ, tạo/đổi quyền nhân viên, điều chỉnh điểm lớn, sửa cài đặt tiền) cần MFA step-up trong 10 phút gần nhất.

## 6. Đăng nhập và phiên

Khách hàng:
- Đăng ký: nhập họ tên, SĐT, mật khẩu (+ Turnstile) → Supabase `signUp({ phone, password })` gửi OTP → nhập OTP (`verifyOtp`, type `sms`) → tạo bản ghi `customers`.
- Đăng nhập: SĐT + mật khẩu (`signInWithPassword`). Sau 5 lần sai trong 15 phút, bắt buộc Turnstile.
- Quên mật khẩu: OTP qua SMS (`signInWithOtp` với `shouldCreateUser: false`) → xác thực → đặt mật khẩu mới → thu hồi các phiên khác.
- Đổi mật khẩu khi đang đăng nhập: yêu cầu mật khẩu hiện tại (hoặc reauthenticate bằng OTP).
- SĐT lưu dạng E.164 (`+84...`), chỉ chấp nhận đầu số di động Việt Nam hợp lệ.

Nhân viên và admin:
- Đăng nhập tại `/admin/dang-nhap` bằng username + mật khẩu. Username ánh xạ tới email nội bộ `username@staff.<tên-miền-của-shop>` trong Supabase Auth (không gửi email thật). Cách này tách danh tính nhân viên khỏi SĐT khách hàng.
- Admin tạo tài khoản nhân viên qua Admin API (service key, chỉ server), với mật khẩu tạm và cờ `must_change_password`.
- Admin bắt buộc TOTP MFA: chưa đăng ký MFA thì chỉ vào được trang đăng ký MFA; phiên admin phải ở mức AAL2.
- Nhân viên nghỉ việc: admin vô hiệu hóa → `staff_members.is_active = false` + thu hồi mọi phiên qua Admin API.
- Tài khoản nhân viên không dùng để mua hàng.

Cookie phiên: do `@supabase/ssr` quản lý, cấu hình `httpOnly`, `secure`, `sameSite=lax`, `path=/`. Proxy chỉ làm mới phiên, không quyết định quyền.

Thiết lập Supabase Auth cần bật: phone provider + Send SMS Hook, email provider (chỉ phục vụ đăng nhập nhân viên, tắt gửi email xác nhận vì tài khoản do admin tạo), độ dài mật khẩu tối thiểu 8, chặn mật khẩu đã bị lộ (nếu gói hỗ trợ), CAPTCHA Turnstile, MFA TOTP, rate limit OTP.

Lưu ý: API Auth của Supabase là công khai, nên về lý thuyết ai đó vẫn có thể tạo tài khoản Auth trực tiếp. Vì vậy guard luôn yêu cầu có bản ghi tương ứng trong `customers` hoặc `staff_members` (đang hoạt động); tài khoản Auth "mồ côi" không làm được gì. CAPTCHA giúp hạn chế tạo tài khoản rác.

## 7. Luồng đặt hàng và thanh toán

Chi tiết quy tắc nằm ở `BUSINESS_RULES.md` mục 4 và 5.

```mermaid
sequenceDiagram
  participant B as Trình duyệt
  participant S as Server (Next.js)
  participant DB as Postgres
  participant Bank as Ngân hàng
  participant SP as SePay
  B->>S: placeOrder(items[{sellUnitId, qty}], giao nhận, dùng điểm, expectedTotal, idempotencyKey)
  S->>DB: BEGIN: tính lại giá, chọn kho, giữ kho, giữ điểm, tạo đơn PENDING_PAYMENT, mã TVMxxxxxxxx, hết hạn 15'
  S-->>B: orderId + viewToken (khách vãng lai) + thông tin chuyển khoản + chuỗi VietQR
  B->>Bank: Khách quét QR, chuyển khoản
  Bank->>SP: Biến động số dư
  SP->>S: POST /api/webhooks/sepay (X-SePay-Signature, X-SePay-Timestamp)
  S->>S: Kiểm chữ ký HMAC trên raw body, kiểm timestamp ±5 phút
  S->>DB: INSERT bank_transactions (UNIQUE id SePay)
  S->>DB: BEGIN: khớp mã + số tiền + STK → PAID, trừ kho thật, chốt điểm dùng
  S-->>SP: 200 {"success": true}
  loop 3s → 10s, và ngay khi quay lại tab
    B->>S: GET /api/orders/{id}/status
    S-->>B: {status, expiresAt, secondsLeft}
  end
```

Lớp dự phòng:
- `cron/reconcile-payments` (5 phút/lần): gọi SePay API v2 `GET /v2/transactions` với `since_id`, đưa từng giao dịch qua cùng hàm xử lý với webhook.
- `cron/retry-bank-tx` (2 phút/lần): xử lý lại các dòng `bank_transactions` còn trạng thái `RECEIVED`.
- Nếu hai nguồn cùng ghi một giao dịch mà khóa chống trùng khác nhau, đơn vẫn không bị ghi PAID hai lần (UPDATE có điều kiện); giao dịch thứ hai thành ngoại lệ `DUPLICATE_OR_EXTRA` để admin kiểm tra.

## 8. Job định kỳ (Vercel Cron)

| Job | Tần suất | Việc |
|---|---|---|
| `expire-orders` | 1 phút | Đơn `PENDING_PAYMENT` quá `expires_at` + 5 phút ân hạn → `EXPIRED`, trả kho giữ, trả điểm giữ |
| `reconcile-payments` | 5 phút | Đối soát với SePay API |
| `retry-bank-tx` | 2 phút | Xử lý lại giao dịch kẹt |
| `cleanup` | 1 ngày | Xóa `rate_limits` cũ, xóa sự kiện analytics quá hạn lưu, dọn view token hết hạn |
| `daily-digest` | 1 ngày | Gửi chủ shop tóm tắt: doanh thu, ngoại lệ thanh toán, thao tác nhạy cảm của admin |

Mỗi route cron kiểm tra header `Authorization: Bearer ${CRON_SECRET}` bằng `safeEqual`, và phải chạy lặp an toàn.

## 9. Switchboard (adapter) theo kiểu đóng cửa khi lỗi

Mỗi dịch vụ ngoài có một interface (port) và nhiều adapter. `adapters/<port>/index.ts` chọn adapter dựa trên biến môi trường đã được `env.ts` kiểm tra.

```ts
// ví dụ: src/server/adapters/sms/index.ts
import "server-only";
import { env } from "@/server/env";
export const sms: SmsPort =
  env.SMS_PROVIDER === "console" ? consoleSms : createEsmsAdapter(env.ESMS_API_KEY!, env.ESMS_SECRET!);
```

Quy tắc:
- `env.ts` từ chối `SMS_PROVIDER=console`, `PAYMENT_PROVIDER=fake`, `CAPTCHA_PROVIDER=always-pass`, `STORAGE_PROVIDER=memory` khi `APP_ENV=production` hoặc `staging`.
- Adapter chưa làm xong phải `throw new NotImplementedError()`, không bao giờ trả `success: true` giả.
- Không có "tự động chuyển về mock khi thiếu key". Thiếu key ở production thì ứng dụng không khởi động.

Các port: `PaymentProviderPort` (verifyWebhook, parseWebhook, listTransactions), `SmsPort` (sendOtp, sendMessage), `StoragePort` (createSignedUpload cho bucket `incoming`, download, putPrivate, putPublic, getPublicUrl, delete), `CaptchaPort` (verify), `NotifierPort` (notifyOwner), `AuthPort` (bọc Supabase Auth).

## 10. Môi trường và biến môi trường

Môi trường: `local` (máy dev + `supabase start`; dùng được cả SePay Test mode qua tunnel), `test` (CI), `staging` (tùy chọn, trước mở bán: Supabase Free + SePay Test mode), `production`. Giai đoạn phát triển không cần tài khoản trả phí nào.

| Biến | Phạm vi | Ghi chú |
|---|---|---|
| `APP_ENV` | server | local, test, staging, production |
| `APP_URL` | server | URL gốc, dùng kiểm Origin và tạo link |
| `DATABASE_URL` | server | role `app_runtime`, qua pooler transaction mode (postgres-js `prepare: false`) |
| `DATABASE_MIGRATION_URL` | CI/local | role có quyền DDL, KHÔNG đặt trên Vercel runtime |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | server | không cần `NEXT_PUBLIC_` vì trình duyệt không gọi Supabase |
| `SUPABASE_SECRET_KEY` | server | service key, chỉ dùng trong `auth/supabase.adapter.ts` và `adapters/storage` |
| `SEPAY_WEBHOOK_SECRET` | server | HMAC secret |
| `SEPAY_API_TOKEN` | server | cho đối soát |
| `PAYEE_BANK_BIN`, `PAYEE_BANK_NAME`, `PAYEE_ACCOUNT_NO`, `PAYEE_ACCOUNT_NAME` | server | tài khoản nhận tiền; chỉ đổi bằng cách đổi env + redeploy |
| `PAYMENT_PROVIDER`, `SMS_PROVIDER`, `CAPTCHA_PROVIDER`, `STORAGE_PROVIDER` | server | chọn adapter |
| `SMS_HOOK_SECRET` | server | xác thực request từ Supabase Send SMS Hook |
| `TURNSTILE_SECRET_KEY` | server | |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | public | khóa công khai, được phép |
| `HANDOVER_SECRET` | server | khóa HMAC để tính token/PIN bàn giao (BUSINESS_RULES mục 6) |
| `VIEW_TOKEN_PEPPER` | server | khóa HMAC để băm view token của khách vãng lai |
| `CRON_SECRET` | server | |
| `SENTRY_DSN` | server + public | DSN không phải secret |
| `OWNER_ALERT_*` | server | kênh cảnh báo cho chủ shop (tùy chọn) |

`env.ts` phải có test: thiếu biến bắt buộc hoặc cấu hình mock ở production thì `parse` báo lỗi.

## 11. Hiển thị, SEO, hiệu năng

- Trang public (trang chủ, danh mục, sản phẩm) là Server Component, có `generateMetadata`, `sitemap.ts`, `robots.ts`, JSON-LD `Product`.
- CSP dùng nonce nên MỌI trang render động: root layout gọi `await connection()` để Next.js gắn nonce lúc render theo request (trang tĩnh dựng lúc build không có nonce, script của chính Next.js sẽ bị chặn). Hệ quả: HTML có `Cache-Control: private, no-cache, no-store`, CDN không cache HTML, mỗi lượt xem tốn một lần render; file `/_next/static` vẫn cache vĩnh viễn. Bù bằng cache dữ liệu (`unstable_cache` hoặc tương đương, có tag để invalidate khi admin sửa sản phẩm) để giảm tải database.
- Next.js 16 đổi tên convention `middleware` thành `proxy` (bản cũ deprecated). Dự án dùng `src/proxy.ts`, export hàm `proxy`, chạy trên Node.js runtime (xem N26).
- Ảnh nội dung qua component `AppImage` (bọc `next/image`) với custom loader trả bản WebP đã tạo sẵn gần nhất, không dùng bộ tối ưu ảnh của Next.js/Vercel (mục 15). `remotePatterns` vẫn chỉ cho phép domain Supabase Storage của dự án như lớp phòng thủ thứ hai.
- Tìm kiếm: Postgres full-text + `unaccent` + `pg_trgm` để gõ không dấu vẫn ra ("banh mi" → "Bánh mì").
- Viewport cho phép phóng to (không đặt `maximumScale`, `userScalable`).
- Giỏ hàng lưu ở client (chỉ `sellUnitId` + `qty`). Giá hiển thị trong giỏ lấy từ `quoteCart()` phía server.

## 12. Quan sát và vận hành

- Logger JSON có `requestId`, tự che SĐT, bỏ các trường nhạy cảm (`password`, `token`, `otp`, `secret`, `authorization`).
- Audit: `server/audit/service.ts` có `record({ actor, action, entity, before, after, request }, { tx })`. Nằm ngoài `modules/` vì mọi module đều gọi (giống `lib/`). Truyền `tx` của thao tác nghiệp vụ để dòng audit cùng commit, cùng rollback; ghi audit lỗi thì thao tác nghiệp vụ cũng lỗi (đóng cửa khi lỗi). Không có `tx` (chỉ cho sự kiện không kèm thay đổi dữ liệu, ví dụ `auth.login_failed`) thì ghi bằng `getDb()`. Tên action phải có trong `server/audit/actions.ts`. `before`/`after` được làm sạch bằng chính `sanitizeForLog` của logger rồi cắt nếu quá 16 KB. Ngữ cảnh request lấy bằng `getRequestContext(await headers())`; truyền cùng `requestId` vào `createLogger` để nối log với audit. Header IP chỉ đáng tin khi chạy sau proxy của Vercel (SECURITY mục 2, "Log và dữ liệu cá nhân").
- Sentry: `sendDefaultPii: false`, lọc header `cookie`/`authorization`.
- Cảnh báo cho chủ shop khi: có ngoại lệ thanh toán, chữ ký webhook sai quá 5 lần trong 10 phút, job cron lỗi, đơn PAID quá 30 phút chưa có người nhận đóng gói (trong giờ mở cửa).
- Backup: backup hằng ngày của Supabase Pro, cộng bản `pg_dump` hằng tuần (GitHub Action) mã hóa, lưu ở nơi khác. Mỗi tháng thử khôi phục vào project staging.

## 13. Mở rộng đa kho (sau này)

- Dữ liệu đã có `warehouses`, `stock_levels(warehouse_id, product_id)`, `orders.warehouse_id`.
- `fulfillment/strategy.ts` định nghĩa `chooseWarehouse(items, deliveryPoint): WarehouseId | NoWarehouse`.
  - Hiện tại: `SingleOnlineWarehouseStrategy` (luôn kho online mặc định, kiểm bán kính).
  - Sau này: `NearestWarehouseWithFullStockStrategy`: lọc các kho còn ĐỦ toàn bộ hàng của đơn, trong bán kính giao của kho đó, chọn kho gần nhất.
- Không bao giờ tách một đơn ra nhiều kho (quyết định D4).
- Khi mở thêm kho: thêm UI quản lý kho, phân quyền nhân viên theo kho (`staff_members.warehouse_id`), báo cáo theo kho.

## 14. Phí giao hàng (`ShippingFeePolicy`)

Phí giao hàng tách thành module riêng `src/server/modules/fulfillment/shipping/`, để đổi cách tính phí sau này không phải sửa `placeOrder`.

```
shipping/
  port.ts          # interface ShippingFeePolicy, ShippingQuoteInput, ShippingQuote
  free.policy.ts   # FreeShippingPolicy: luôn fee = 0
  index.ts         # chọn chính sách theo store_settings.shipping_policy
  *.test.ts
```

```ts
interface ShippingFeePolicy {
  quote(input: {
    deliveryType: "DELIVERY" | "PICKUP";
    subtotal: number;      // VND nguyên
    distanceKm?: number;   // chỉ có với DELIVERY
    provinceCode: string;  // với PICKUP: của kho
    wardCode: string;      // với PICKUP: của kho
    warehouseId: string;
    now: Date;             // lấy từ clock.ts
  }): { fee: number; policy: string; breakdown: Record<string, unknown> }; // fee là số nguyên >= 0
}
```

| Mã chính sách | Trạng thái | Ghi chú |
|---|---|---|
| `FREE` | Đã hiện thực, mặc định | `fee = 0` cho cả `DELIVERY` lẫn `PICKUP`, `breakdown = {"rule":"FREE"}` |
| `FLAT` | Chưa làm | Dùng `shipping_fee_flat` và `free_shipping_threshold` làm tham số |
| `BY_DISTANCE` | Chưa làm | Chờ quyết định Q16 |
| `BY_ZONE` | Chưa làm | Chờ quyết định Q16 |

Quy tắc:
- Chọn chính sách chưa hiện thực thì `index.ts` ném `NotImplementedError`. Không có đường tự rơi về 0 hay mức phí mặc định.
- Lưu `store_settings.shipping_policy` bằng chính sách chưa hiện thực bị từ chối ở service. Khi khởi động, server kiểm giá trị đang lưu; chưa hiện thực thì từ chối khởi động (hook khởi động của Next.js, ví dụ `instrumentation.ts`; chốt cách làm ở T3.2). Đổi chính sách cần MFA step-up và ghi audit.
- Hàm `quote` thuần (không đọc database); người gọi truyền đủ dữ liệu. Có unit test cho từng chính sách.
- Kết quả được chốt vào `orders.shipping_fee`, `shipping_policy`, `shipping_breakdown` lúc đặt; đổi chính sách không tính lại đơn đã đặt.
- Kiểm tra bán kính giao (`delivery_radius_km`, mặc định 40) nằm ở `fulfillment/strategy.ts`, độc lập với chính sách phí.

## 15. Xử lý ảnh tự động

Admin chỉ tải ảnh gốc. Việc nén, đổi kích thước và tạo các bản theo kích thước hiển thị do server làm, không có bước nén thủ công.

**Giới hạn ảnh gốc**: JPEG, PNG, WebP; tối đa 12 MB; tối đa 40 megapixel.

**Bucket Supabase Storage** (tên đề xuất):

| Bucket | Quyền | Nội dung |
|---|---|---|
| `incoming` | riêng tư | ảnh gốc vừa tải lên, xóa sau khi xử lý (cron `cleanup` xóa file mồ côi quá 24 giờ) |
| `normalized` | riêng tư | bản chuẩn hóa (tối đa 2400px, đã xóa metadata), dùng để tạo lại các bản nhỏ |
| `media` | công khai | các bản WebP theo preset, đặt tên theo `image id` và bản sửa đổi để cache vĩnh viễn |

**Luồng**:
1. Admin chọn ảnh; server cấp signed upload URL của bucket `incoming` (chỉ staff/admin, có rate limit). Trình duyệt tải thẳng lên Supabase, vì request qua hàm serverless bị giới hạn dung lượng body. Bucket giới hạn MIME và 12 MB.
2. Trình duyệt gọi route xử lý (chỉ staff/admin, rate limit, kiểm Origin). Route tải ảnh từ `incoming` về.
3. Kiểm tra: loại ảnh xác định bằng nội dung thật (không tin đuôi file hay Content-Type); từ chối SVG, ảnh động, ảnh quá lớn (dung lượng hoặc megapixel).
4. `sharp` với `limitInputPixels` đặt theo 40 megapixel; tự xoay theo EXIF rồi xóa toàn bộ metadata (EXIF, GPS).
5. Lưu bản chuẩn hóa (tối đa 2400px) vào `normalized`.
6. Tạo các bản WebP theo preset (bảng dưới), chất lượng khoảng 80, ghi vào `media`; tạo `blur_data_url` (ảnh mờ 16–24px base64).
7. Ghi `width`, `height`, `bytes`, `variants`, `blur_data_url` vào database (DATA_MODEL mục 10.1) và xóa file trong `incoming`. Lỗi giữa chừng thì dọn các file đã ghi, không để bản ghi trỏ vào file thiếu.

**Preset**:

| Preset | Chiều rộng (px) | Dạng | Dùng ở |
|---|---|---|---|
| `product-thumb` | 160 | vuông, `contain`, nền trắng | ảnh nhỏ trong giỏ, danh sách đơn, bảng admin |
| `product-card` | 320, 480 | vuông, `contain`, nền trắng | thẻ sản phẩm (UI_SPEC 4.4) |
| `product-detail` | 800, 1200 | vuông, `contain`, nền trắng | gallery trang sản phẩm, lightbox |
| `banner-desktop` | 1560, 1040 | 3,9:1, `cover` | banner desktop |
| `banner-mobile` | 750, 480 | 16:9, `cover` | banner mobile |
| `category-icon` | 120, 240 | vuông, `contain`, nền trong | sidebar, mega menu, khối danh mục con |

Ảnh sản phẩm dùng `contain` trên nền trắng nên không bao giờ cắt mất sản phẩm. Ảnh banner dùng `cover`, giao diện admin hiện bản xem trước vùng bị cắt.

**Ngân sách dung lượng** (kiểm bằng test với ảnh mẫu): `product-card` 320px ≤ 40 KB; `product-detail` 800px ≤ 120 KB; `banner-desktop` ≤ 200 KB; `category-icon` ≤ 15 KB. Bản chưa nêu không được lớn hơn bản lớn hơn cùng preset; giá trị cụ thể chốt ở T2.2. Vượt ngân sách thì tự giảm chất lượng theo bậc (80, 72, 64, 56, 48); vẫn vượt ở bậc thấp nhất thì ghi cảnh báo `image.budget_exceeded` và giữ bản bậc thấp nhất.

**Hiển thị**:
- Component dùng chung `AppImage` nhận `preset` và tự đặt `sizes` khớp UI_SPEC, sinh từ bảng số cột lưới ở UI_SPEC mục 4.4 trong `lib/images/presets.ts` (không viết tay ở từng chỗ dùng).
- `next/image` với custom loader (`lib/images/loader.ts`) trả bản đã tạo sẵn có chiều rộng gần nhất không nhỏ hơn yêu cầu; không qua bộ tối ưu ảnh của Next.js.
- Luôn truyền `width`/`height` từ database để không giật bố cục; `placeholder="blur"` với `blur_data_url`.
- Banner đầu trang chủ `priority`, các ảnh còn lại lazy.
- ESLint cấm `<img>` trần cho ảnh nội dung.

**Tạo lại**: `pnpm images:reprocess` đọc bản chuẩn hóa, tạo lại mọi bản theo preset hiện hành, cập nhật `variants` rồi xóa bản cũ. Chạy vào database/bucket thật cần cờ xác nhận tường minh.

**Nhập Excel** (T2.6): cột ảnh, nếu có, chỉ nhận tên file nằm trong gói ảnh admin tải lên cùng lần nhập, không bao giờ tải từ URL (tránh SSRF). Mọi ảnh đi qua cùng pipeline và cùng giới hạn.

**Dependency**: `sharp` là dependency mới, phải xin duyệt theo CLAUDE.md khi làm T2.2 (nêu tên, lý do, mức độ bảo trì, phương án thay thế).
