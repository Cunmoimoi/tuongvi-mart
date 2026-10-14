# Tiến độ dự án

Cập nhật file này trong cùng PR khi kết thúc mỗi task. Chi tiết từng task nằm ở `docs/ROADMAP.md`.

## Giai đoạn 0

| Mã   | Tên                          | Trạng thái | PR  | Ghi chú                                                      |
| ---- | ---------------------------- | ---------- | --- | ------------------------------------------------------------ |
| T0.1 | Khởi tạo project             | Đã merge   | #1  |                                                              |
| T0.2 | Cấu hình môi trường an toàn  | Đã merge   | #2  | `src/server/env.ts`                                          |
| T0.3 | Database và migration nền    | Đã merge   | #3  | Xem "Quyết định đã chốt"                                     |
| T0.4 | Thư viện lõi phía server     | Đã merge   | #7  | `src/server/lib/*`, migration `0001_rate_limits`; xem "Quyết định đã chốt (T0.4)" |
| T0.5 | Proxy (middleware) và headers bảo mật | Đã merge   | #8  | `src/proxy.ts`, `src/server/security/headers.ts`; xem "Quyết định đã chốt (T0.5)" |
| T0.6 | Audit log                    | Đã merge   | #11 | `src/server/audit/*`, migration `0002_audit_logs`; xem "Quyết định đã chốt (T0.6)" |
| T0.7 | CI                           | Chờ merge  | #12 | `.github/workflows/ci.yml`; xem "Quyết định đã chốt (T0.7)"; `pnpm audit` đang đỏ, chờ quyết định |
| T0.8 | Bộ component giao diện       | Chưa làm   |     |                                                              |
| T0.9 | Khung adapter (Switchboard)  | Chưa làm   |     |                                                              |

Ngoài roadmap:

| Việc                         | Trạng thái | PR  | Ghi chú                                             |
| ---------------------------- | ---------- | --- | --------------------------------------------------- |
| README bảo mật máy dev       | Đã merge   | #4  | Mục "Bảo mật máy phát triển" trong README           |
| Sửa lỗi xuống dòng (LF)      | Đã merge   | #5  | `.gitattributes`, `.editorconfig`, Prettier `endOfLine: "lf"`; `pnpm format:check` xanh trên Windows |
| T0.5b: proxy và agent rules  | Đã merge   | #9    | `src/proxy.ts`, `agentRules: false`; xem "Quyết định đã chốt (T0.5b)" |
| Docs: yêu cầu bổ sung (phí giao, trả trước, ảnh) | Đã merge | #10   | Chỉ sửa tài liệu; xem "Quyết định đã chốt (yêu cầu bổ sung, 12/10/2026)" |

## Quyết định đã chốt (T0.3)

- Role `service_role` bị thu hồi quyền trên schema `app`; ứng dụng chỉ truy cập database bằng role `app_runtime`.
- Test quyền của `anon`/`authenticated` dùng `SET ROLE`, không kết nối trực tiếp (`anon` là `NOLOGIN`).
- Có guard chống chạy test tích hợp và script đặt mật khẩu trên database thật; chỉ chạy khi trỏ vào database local.
- Máy dev có luật tường lửa Windows chặn inbound TCP 54321–54327, vì Supabase CLI publish các cổng này ra `0.0.0.0`.

## Quyết định đã chốt (T0.4)

- Logger bỏ hẳn các khóa nhạy cảm và che SĐT thành `090****567`; xem N20 trong `docs/README.md`.
- `consumeRateLimit` chỉ dùng với `getDb()`, không dùng trong transaction nghiệp vụ; cửa sổ cố định căn theo UTC (N21, Q15).
- `safeEqual`, `randomToken`, `mulDiv`, `clock.ts` theo hướng "đóng cửa khi lỗi" (N22).
- Test tĩnh `src/server/server-only.test.ts` bảo đảm mọi file nguồn trong `src/server` bắt đầu bằng `import "server-only"`.

## Quyết định đã chốt (T0.5)

- Header bảo mật dựng bằng hàm thuần `src/server/security/headers.ts`; `src/proxy.ts` (trước đây `middleware.ts`) chỉ nối `env` vào và gắn header lên cả request (để Next.js lấy nonce) lẫn response. Chi tiết CSP ở N23.
- Mọi trang render động (root layout `await connection()`) vì nonce; HTML không còn được CDN cache (N24).
- `env.ts` coi chuỗi rỗng là chưa đặt (N25): sửa lỗi tiềm ẩn từ T0.2 làm proxy trả 500 với `.env.local` có biến để trống.
- Giữ tên `middleware.ts` dù Next.js 16 đã deprecate (N26); đã đổi sang `proxy.ts` ở T0.5b.
- Test: `src/server/security/headers.test.ts`, `src/proxy.test.ts` (trong `pnpm check`) và `pnpm test:http` (khởi động `next start` thật cho local/staging/production; cần `pnpm build` trước nên nằm ngoài `pnpm check`).
- Làm mới phiên Supabase chuyển sang T1.1 (chỗ để sẵn `TODO(T1.1)` trong `src/proxy.ts`).

## Quyết định đã chốt (T0.5b)

- `src/middleware.ts` → `src/proxy.ts`, hàm `middleware` → `proxy`, test đổi theo (N26). `pnpm build` không còn cảnh báo deprecated.
- `agentRules: false` trong `next.config.ts` để `next dev` không ghi vào `CLAUDE.md` (N27).

## Quyết định đã chốt (yêu cầu bổ sung, 12/10/2026)

- Phí giao hàng giai đoạn đầu MIỄN PHÍ cho cả giao tận nơi lẫn nhận tại cửa hàng; bán kính 40km vẫn kiểm (N28). Tách module `fulfillment/shipping/` với `ShippingFeePolicy`; chỉ làm `FreeShippingPolicy`. `store_settings.shipping_policy` mặc định `FREE`; `orders` lưu `shipping_policy`, `shipping_breakdown`. `shipping_fee_flat` và `free_shipping_threshold` chỉ là tham số dự phòng của `FLAT`. Câu hỏi mở Q16: tính lại theo km hay theo khu vực.
- Thanh toán trước 100%, không COD, không thu tiền mặt, staff không xác nhận thu tiền (N29): thành quy tắc BUSINESS_RULES 5.0 và bất biến 19 trong CLAUDE.md; thêm `CHECK` `paid_at` ở `orders`.
- Ảnh: admin chỉ tải ảnh gốc (≤ 12 MB, ≤ 40 megapixel); server tự chuẩn hóa và tạo các bản WebP theo preset, hiển thị bằng `AppImage` + custom loader (N30, ARCHITECTURE mục 15). `sharp` là dependency mới, phải xin duyệt ở T2.2.
- Đợt này chỉ sửa tài liệu, chưa có thay đổi code.

## Quyết định đã chốt (T0.6)

- Bảng `app.audit_logs` (migration `0002_audit_logs`) đúng DATA_MODEL mục 9, có thêm các `CHECK` định dạng; `app.enable_app_rls` + `app.make_append_only`: `app_runtime` chỉ SELECT, INSERT.
- `record(input, { tx })` trong `src/server/audit/service.ts`: truyền `tx` để audit cùng commit/rollback với thao tác nghiệp vụ; lỗi thì ném ra (đóng cửa khi lỗi); không `tx` thì dùng `getDb()` (N31).
- Action phải nằm trong `AUDIT_ACTIONS` (`src/server/audit/actions.ts`); thêm action chỉ cần sửa danh sách (N31).
- `before`/`after` dùng lại `sanitizeForLog` của logger (không có bản thứ hai), thay NUL và surrogate lẻ, cắt nếu quá 16 KB (N32).
- `getRequestContext(headers)` trong `src/server/audit/request-context.ts`: IP qua `net.isIP`, user agent ≤ 255 ký tự, `request_id` từ `x-vercel-id`; header IP chỉ đáng tin sau proxy của Vercel (N33, SECURITY mục 2).
- Test: `src/server/audit/*.test.ts` (unit) và `tests/integration/audit-log.test.ts` (Postgres thật, role `app_runtime`); test không commit dòng audit nào (N34).
- Audit nằm ở `src/server/audit/`, không phải `modules/audit/`; đã sửa cây thư mục ARCHITECTURE mục 4 (N31).

## Quyết định đã chốt (T0.7)

- Workflow `.github/workflows/ci.yml` chạy khi có PR vào `main` và khi push lên `main`; không dùng `pull_request_target`, token chỉ `contents: read`, không dùng secret của repo, mọi biến môi trường là giá trị giả hợp lệ với `env.ts` ở `APP_ENV=test`. Có `concurrency` hủy lần chạy cũ của cùng nhánh và `timeout-minutes` cho mọi job.
- 5 job chạy song song: `static` (typecheck → lint → format:check → unit), `integration` (Postgres 17 → migrate → mật khẩu tạm → `test:int`), `build-http` (`test:http` phải đỏ khi chưa build → build → `test:http`), `audit`, `gitleaks` (toàn bộ lịch sử, `--all`). Job `ci` tổng hợp: đặt `ci` làm check bắt buộc khi merge.
- Mật khẩu `app_runtime` sinh mới mỗi lần chạy, không nới guard nào (N35). Test (a)(b)(c) của T0.3 chạy thật trên Postgres thường; đã chứng minh bằng thử đột biến trên CI (N35).
- CI đỏ nếu bộ test rỗng hoặc có test skip/todo (`scripts/ci/check-vitest-report.mts`, N36).
- Node 24.x qua `engines.node`, pnpm theo `packageManager` (N37). Action ghim bằng commit SHA: `actions/checkout` v7.0.1, `actions/setup-node` v7.0.0, `pnpm/action-setup` v6.1.0; `postgres:17.11` ghim digest; gitleaks 8.30.1 kiểm SHA-256.
- Nghiệm thu: PR #12 (mọi job trừ `audit` xanh, xem "Việc treo"); PR nháp #13 với `SEPAY_API_TOKEN` giả làm CI đỏ ở gitleaks (run 38609910204), đã đóng và xóa nhánh, chuỗi giả không có trong `main`.

## Việc treo

- Chính sách lưu trữ audit log (chốt khi làm T7): đề xuất giữ tối thiểu 12 tháng và sao lưu định kỳ (nằm trong bản `pg_dump` hằng tuần ở ARCHITECTURE mục 12). Bảng chỉ cho INSERT nên việc xóa dòng quá hạn (nếu có) phải làm bằng role migration hoặc một hàm riêng có kiểm soát, không cấp DELETE cho `app_runtime`. Cũng cần chốt có phải lưu lâu hơn theo yêu cầu kế toán/pháp lý không.
- Chưa có chỗ nào gọi `record()`: các task từ T1 trở đi (đăng nhập, nhân viên, sản phẩm, đơn hàng, webhook) gọi và thêm action vào `AUDIT_ACTIONS` khi cần.
- `requestId` hiện do người gọi tự lấy bằng `getRequestContext()`; khi làm guard/phiên (T1.1) cân nhắc một chỗ chung để logger và audit dùng cùng một `requestId` cho mỗi request.
- Hardening tùy chọn: `app_runtime` vẫn INSERT được giá trị `created_at` tự chọn nếu có code bỏ qua `record()`; có thể thu hồi quyền INSERT theo cột hoặc thêm trigger ép `created_at = now()` nếu cần.

- T0.7: `pnpm audit --audit-level high` đỏ vì 3 lỗ hổng high (`next` < 16.3.8, `source-map-js` < 1.2.2, `braces` ≤ 3.0.3 chưa có bản vá); chờ chủ dự án quyết định, không tắt kiểm tra.
- T0.7: chủ dự án bật branch protection cho `main` (check bắt buộc `ci`, cần review) sau khi PR #12 merge.
- T0.7: nâng phiên bản Action/gitleaks/Postgres là việc làm tay; cân nhắc Dependabot cho `github-actions` (cần chủ dự án đồng ý).
- `Referrer-Policy: no-referrer` cho trang có token trên URL: làm ở T3.5 cùng trang đơn hàng.
- Chưa thử CSP với dịch vụ thật (Supabase, Sentry, Turnstile): mới có test trên server `next start` với giá trị giả. Phải thử trên staging trước khi mở bán (SECURITY mục 5).
- T2.2: xin duyệt dependency `sharp` trước khi cài; chốt định dạng bản chuẩn hóa (đề xuất WebP chất lượng cao, giữ kênh alpha) và các giá trị ngân sách của bản chưa nêu.
- T2.9: chốt preset cho banner mega menu (2,2:1) và ảnh tiêu đề khối (7:1); chưa có trong danh sách preset.
- T3.2: chốt cách kiểm "từ chối khởi động" khi `shipping_policy` chưa hiện thực (hook khởi động của Next.js hay kiểm lúc nạp cấu hình).
- Câu hỏi mở Q16: phí giao hàng sau này tính theo km hay theo khu vực (`docs/README.md`).
- Thêm Supabase vào `connect-src` khi làm upload ảnh bằng signed URL; thêm domain tile OSM vào `img-src` ở T1.4.
- Test header trên trang admin: thêm khi có `/admin/dang-nhap` (T1.5).
- `/_next/static` và `favicon.ico` không đi qua proxy nên không có `X-Content-Type-Options`; nếu cần phủ cả file tĩnh thì thêm `headers()` trong `next.config.ts`.

- Cron `cleanup` xóa dòng cũ của `rate_limits` chưa có (làm cùng các job cron ở giai đoạn sau); bảng tăng dần cho tới lúc đó.
- Câu hỏi mở Q15: cửa sổ "theo ngày" của giới hạn OTP đếm lại lúc 0h giờ Việt Nam hay 7h (UTC).

- `minimum_password_length = 8` trong `supabase/config.toml` (mặc định của CLI là 6): làm ở T1.2.
- Câu hỏi mở Q1–Q14 trong mục "Câu hỏi mở" của `docs/README.md`; Q5 (ngân hàng) bắt buộc trước giai đoạn 3, Q6 (SMS OTP) bắt buộc trước khi mở bán.
