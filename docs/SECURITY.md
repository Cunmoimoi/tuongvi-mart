# Bảo mật

Mục tiêu: không ai lấy được hàng mà không trả tiền, không ai làm sai lệch tiền/điểm/kho, không lộ dữ liệu khách, và nếu có sự cố thì phát hiện nhanh, khôi phục được.

## 1. Mô hình đe dọa

| # | Mối đe dọa | Ví dụ tấn công | Kiểm soát chính | Test bắt buộc |
|---|---|---|---|---|
| T1 | Giả mạo thanh toán | Gửi POST giả tới webhook; gửi lại webhook cũ | HMAC-SHA256 trên raw body + timestamp ±300s; chỉ webhook/đối soát được set PAID | Chữ ký sai → 401, đơn không đổi; timestamp cũ → 401 |
| T2 | Cộng trùng thanh toán | SePay retry, admin replay, webhook và đối soát chạy song song | UNIQUE id giao dịch; UPDATE có điều kiện `status = 'PENDING_PAYMENT'`; giao dịch thứ hai thành ngoại lệ | Gửi cùng payload 2 lần, và 2 request song song → 1 payment, kho trừ 1 lần |
| T3 | Sửa giá, sửa tổng | Sửa request checkout, sửa giỏ trong localStorage | Server tính lại toàn bộ; client chỉ gửi `sellUnitId`, `qty` | Gửi `price`/`total` giả → bị bỏ qua |
| T4 | Bán quá tồn | Hai khách cùng mua món cuối | Giữ kho bằng UPDATE có điều kiện trong transaction | 2 checkout song song cho 1 món còn lại → đúng 1 thành công |
| T5 | Tiêu điểm hai lần | Hai đơn song song dùng cùng số điểm | `SELECT ... FOR UPDATE` khách + `points_held` + CHECK ≥ 0 | 2 đơn song song dùng toàn bộ điểm → 1 thành công |
| T6 | Xem đơn người khác (IDOR) | Đoán ID/mã đơn | Chỉ chủ phiên hoặc view token 256-bit; mã đơn không phải quyền | Truy cập đơn không có quyền → 404 (không phải 403, tránh lộ sự tồn tại) |
| T7 | Nhận hàng không trả tiền / nhân viên gian lận bàn giao | Đưa QR của đơn chưa trả; nhân viên tự đánh dấu đã giao | Token/PIN chỉ sinh sau PAID, chỉ khách xem được; COMPLETED chỉ qua xác thực bàn giao; khóa sau 5 lần sai | Đơn PENDING không có mã bàn giao; staff không có API xem mã; PIN sai 5 lần → khóa |
| T8 | Chiếm tài khoản | Dò mật khẩu, credential stuffing | Supabase Auth + rate limit + Turnstile + chặn mật khẩu lộ; MFA cho admin | Vượt ngưỡng → yêu cầu CAPTCHA / tạm khóa |
| T9 | Đốt tiền SMS (SMS pumping) | Bot gọi gửi OTP hàng loạt | Turnstile, giới hạn theo SĐT/IP/ngày, chỉ đầu số di động VN, trần gửi toàn hệ thống mỗi ngày + cảnh báo | Vượt giới hạn → từ chối, không gọi nhà cung cấp SMS |
| T10 | Chiếm tài khoản admin | Lộ mật khẩu admin | TOTP MFA bắt buộc, step-up cho thao tác nhạy cảm, audit, báo cáo hằng ngày gửi chủ shop | Admin chưa MFA không vào được trang quản trị |
| T11 | Chuyển hướng tiền | Đổi số tài khoản nhận tiền; QR bị thay | Tài khoản nhận chỉ ở env; QR tạo tại server, không dùng dịch vụ QR ngoài | Không có API/UI sửa tài khoản nhận |
| T12 | Leo quyền | Sửa cookie, gọi Server Action admin khi là khách | Guard trong từng action, đọc quyền từ DB, không tin cookie tự đặt | Gọi action admin bằng phiên khách/staff → 403 |
| T13 | XSS | Chèn script vào tên sản phẩm, ghi chú đơn | React escape; không `dangerouslySetInnerHTML`; CSP nonce; không upload SVG | Ghi chú chứa `<script>` hiển thị dạng text |
| T14 | CSRF | Trang lạ gửi form tới Server Action | SameSite=Lax; Next.js kiểm Origin cho Server Action; Route Handler POST tự kiểm Origin | POST từ Origin lạ → từ chối |
| T15 | SQL injection | Chuỗi đặc biệt trong tìm kiếm | Drizzle tham số hóa; cấm nối chuỗi SQL | Tìm kiếm với `' OR 1=1 --` không lỗi, không lộ dữ liệu |
| T16 | Lộ database | Gọi Supabase Data API bằng anon key | Schema `app` không expose, `anon` không có USAGE, RLS bật | Test tích hợp: role `anon` không đọc được bảng nào |
| T17 | Lộ secret | Secret trong bundle client, trong git, trong log | `server-only`, không `NEXT_PUBLIC_` cho secret, gitleaks trong CI, logger lọc | CI fail nếu gitleaks phát hiện |
| T18 | Lỗ hổng thư viện | Gói npm có CVE | Lockfile, `pnpm audit` trong CI, Dependabot/Renovate, hạn chế số dependency | CI fail với lỗ hổng high/critical |
| T19 | Lạm dụng upload | Upload file độc, file lớn | Signed upload URL do admin xin; bucket giới hạn MIME + dung lượng; không SVG | Upload sai loại/quá cỡ → từ chối |
| T20 | Cài nhầm mock ở production | Quên cấu hình, dùng adapter giả | `env.ts` fail-fast; adapter chưa xong phải throw | Test `env.ts` với cấu hình production chứa mock → lỗi |
| T21 | Mất dữ liệu | Xóa nhầm, sự cố nhà cung cấp | Backup hằng ngày + dump hằng tuần ở nơi khác + diễn tập khôi phục hằng tháng; xóa mềm | Biên bản diễn tập khôi phục |
| T22 | Nội gián đọc dữ liệu khách | Nhân viên xuất danh sách khách | Staff chỉ thấy thông tin đơn đang xử lý; xuất CSV chỉ admin, có audit | Staff gọi API danh sách khách → 403 |

## 2. Kiểm soát theo khu vực

### Xác thực và phiên
- Không tự viết băm mật khẩu hay quản lý phiên; dùng Supabase Auth.
- Mật khẩu tối thiểu 8 ký tự, không ép quy tắc phức tạp; bật chặn mật khẩu đã lộ nếu gói hỗ trợ.
- Sau đặt lại mật khẩu: thu hồi các phiên khác.
- Admin: TOTP MFA bắt buộc; step-up (nhập lại TOTP) cho thao tác nhạy cảm, hiệu lực 10 phút.
- Thông điệp lỗi đăng nhập chung chung ("SĐT hoặc mật khẩu không đúng"), không cho biết SĐT có tồn tại hay không. Luồng quên mật khẩu luôn trả cùng một thông điệp.

### Phân quyền
- Guard trong mọi Server Action/Route Handler; test tự động quét: mọi file `actions.ts` và `route.ts` phải gọi một guard hoặc được đánh dấu `// public-endpoint: <lý do>`.
- Truy cập không có quyền vào tài nguyên cụ thể trả 404.

### Dữ liệu vào/ra
- Zod cho mọi input; giới hạn độ dài chuỗi; chuẩn hóa SĐT về E.164.
- Không trả nguyên bản ghi DB cho client; dùng DTO chọn trường.
- Xuất CSV: thoát công thức (ô bắt đầu bằng `=`, `+`, `-`, `@` thì thêm `'`).
- Nhập Excel: parse ở server, giới hạn dòng và dung lượng, validate từng dòng, xem trước rồi mới ghi trong một transaction. Không dùng gói `xlsx` bản trên npm registry (bản cũ, có lỗ hổng đã biết); dùng `exceljs` hoặc bản SheetJS phát hành từ kênh chính thức của họ, có ghi rõ phiên bản.

### HTTP headers (gắn bởi `src/middleware.ts`, dựng bởi hàm thuần `src/server/security/headers.ts`)
- `Content-Security-Policy` với nonce 128 bit mới cho từng request (Web Crypto, không dùng `Math.random`):
  `default-src 'self'; script-src 'self' 'nonce-{n}' 'strict-dynamic' [turnstile]; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: [supabase]; connect-src 'self' [sentry]; frame-src [turnstile hoặc 'none']; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; [upgrade-insecure-requests]`
  - Domain ngoài lấy từ biến môi trường, không viết cứng: `[supabase]` là origin của `SUPABASE_URL`; `[sentry]` là đúng host ingest trong `SENTRY_DSN`; `[turnstile]` là `https://challenges.cloudflare.com`, chỉ mở khi `CAPTCHA_PROVIDER=turnstile` và có `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Biến thiếu hoặc không hợp lệ thì bỏ nguồn đó (`frame-src` thành `'none'`): CSP chỉ chặt hơn, không bao giờ lỏng hơn.
  - `script-src` ở staging và production KHÔNG có `'unsafe-eval'` và `'unsafe-inline'`. `style-src` giữ `'unsafe-inline'` vì thuộc tính `style` của React/Tailwind; đây là ngoại lệ có chủ đích, chỉ cho style.
  - `'unsafe-eval'` chỉ được thêm khi `APP_ENV=local` và `NODE_ENV=development` (`next dev`; công cụ debug của React cần), qua hàm riêng `relaxCspForDevelopment`. Bản build production chạy với `APP_ENV=local` cũng không bị nới.
  - `upgrade-insecure-requests` chỉ gửi ở staging/production để bản local chạy `http://localhost` không bị ép lên https.
  - Thêm dịch vụ mới thì sửa `headers.ts` và test "khớp đúng bản đã duyệt"; mọi thay đổi CSP phải ghi lý do ở "Nhật ký quyết định" (`docs/README.md`). Việc đã biết trước: tile bản đồ OSM vào `img-src` (T1.4); upload ảnh bằng signed URL cần thêm Supabase vào `connect-src` (giai đoạn quản lý sản phẩm).
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, chỉ gửi khi `APP_ENV` là `staging` hoặc `production`. Không gửi ở local/test vì trình duyệt sẽ nhớ "chỉ dùng https" cho `localhost` tới 2 năm. Chỉ nộp domain lên danh sách preload (hstspreload.org) khi chắc chắn mọi subdomain đều chạy https.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` (trang có token trên URL: `no-referrer`; các trang đó chưa có, làm cùng trang đơn hàng)
- `Permissions-Policy: camera=(self), geolocation=(self), microphone=(), payment=()`
- Tắt header `X-Powered-By` (`poweredByHeader: false`).
- Phạm vi: middleware bỏ qua `/_next/static`, `/_next/image`, `favicon.ico` và request prefetch (theo hướng dẫn CSP của Next.js), nên các file tĩnh đó không có header ở trên. Tài liệu HTML, trang 404 và route API đều có.
- Test: `src/server/security/headers.test.ts` (hàm thuần), `src/middleware.test.ts` (nối env), `pnpm test:http` (server build thật).

### Secret
- Lưu trong Vercel Environment Variables, tách biệt Preview/Production. Không bao giờ commit `.env*` (chỉ commit `.env.example` không có giá trị).
- Có danh sách secret và quy trình xoay vòng (xem mục 4). Xoay `SEPAY_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY`, `CRON_SECRET` ít nhất mỗi năm và ngay khi nghi lộ.

### Log và dữ liệu cá nhân
- Che SĐT, không log địa chỉ đầy đủ, không log body webhook ra console (body đã lưu có kiểm soát trong `bank_transactions.raw`).
- Sentry không gửi PII; lọc cookie và header xác thực.
- Analytics chỉ gắn `customer_id` khi khách đồng ý; banner đồng ý phân tách "cần thiết" và "phân tích".
- Quyền của khách: xem, sửa thông tin; yêu cầu xóa tài khoản (ẩn danh hóa dữ liệu cá nhân, giữ đơn hàng cho kế toán).

### Chuỗi cung ứng và CI
- CI chạy: typecheck, lint, unit test, integration test, `pnpm audit --audit-level high`, gitleaks, build.
- Nhánh `main` được bảo vệ: phải qua CI và có người review (chủ dự án duyệt PR, kể cả khi Claude Code viết).
- Chỉ thêm dependency khi đã được đồng ý; ưu tiên gói phổ biến, còn bảo trì.

## 3. Test bảo mật bắt buộc

Mỗi dòng "Test bắt buộc" ở bảng mục 1 phải có test tự động tương ứng (unit, integration hoặc E2E) trước khi mở bán. Thêm vào đó:
- E2E toàn luồng: đặt hàng → webhook ký hợp lệ (chỉ ở môi trường test, dùng secret test) → PAID → đóng gói → bàn giao → COMPLETED → điểm được cộng.
- Test hết hạn: đơn quá hạn trả kho, trả điểm; tiền đến trễ thành ngoại lệ.
- Test quyền: ma trận vai trò × action (khách, hội viên, staff, admin chưa MFA, admin có MFA).
- Trước khi mở bán: tự rà theo OWASP ASVS mức 2 cho các mục xác thực, phiên, kiểm soát truy cập, xác thực dữ liệu, xử lý lỗi và log. Nếu có ngân sách, thuê một bên kiểm thử xâm nhập độc lập.

## 4. Xử lý sự cố (runbook)

**Nghi ngờ thanh toán giả hoặc webhook bị dò:**
1. Xem audit `payment.webhook_bad_signature` và bảng `bank_transactions`.
2. Đối chiếu từng đơn PAID trong khoảng nghi ngờ với sao kê ngân hàng thật.
3. Xoay `SEPAY_WEBHOOK_SECRET` trên SePay và Vercel.
4. Tạm dừng giao hàng các đơn chưa đối chiếu được.

**Nghi lộ tài khoản admin:**
1. Vô hiệu hóa tài khoản, thu hồi mọi phiên, reset MFA.
2. Rà `audit_logs` của tài khoản đó: hoàn tiền, điều chỉnh điểm, đổi cài đặt, tạo nhân viên.
3. Xoay các secret nếu tài khoản có thể đã xem được.

**Nghi lộ dữ liệu khách:**
1. Khoanh vùng: bảng nào, bao nhiêu bản ghi, từ lúc nào.
2. Xoay secret database và Supabase.
3. Liên hệ tư vấn pháp lý về nghĩa vụ thông báo theo quy định bảo vệ dữ liệu cá nhân.

**Mất dữ liệu:** khôi phục từ backup Supabase gần nhất vào project mới; đối chiếu đơn/thanh toán từ lúc backup tới lúc sự cố bằng SePay API và sao kê ngân hàng.

## 5. Checklist trước khi mở bán

- [ ] Toàn bộ test bắt buộc ở mục 1 và 3 xanh trên CI
- [ ] `env.ts` production không cho phép mock; đã deploy thử với thiếu một secret và thấy ứng dụng từ chối khởi động
- [ ] Webhook SePay dùng HMAC-SHA256; đã test bằng SePay Test mode: đúng, sai chữ ký, gửi lại, sai số tiền, trễ hạn
- [ ] Cấu trúc mã thanh toán trên SePay: tiền tố `TVM`, hậu tố 8, "Số và chữ"
- [ ] QR đã quét thử bằng ít nhất 2 app ngân hàng; số tài khoản và tên hiển thị đúng
- [ ] Admin đã bật MFA; không còn tài khoản thử nghiệm nào
- [ ] Headers bảo mật đạt (kiểm bằng công cụ như securityheaders.com)
- [ ] Schema `app` không truy cập được bằng anon key (thử bằng curl tới Data API)
- [ ] Backup hoạt động; đã diễn tập khôi phục 1 lần
- [ ] Sentry, cảnh báo cho chủ shop, uptime monitor đã chạy
- [ ] Trang chính sách (điều khoản, quyền riêng tư, đổi trả, giao hàng, thanh toán) đã đăng
- [ ] Các việc pháp lý trong `docs/README.md` đã hoàn tất hoặc có xác nhận của tư vấn
