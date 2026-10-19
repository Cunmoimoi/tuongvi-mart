# Tiến độ dự án

Cập nhật file này trong cùng PR khi kết thúc mỗi task. Chi tiết từng task nằm ở `docs/ROADMAP.md`.

## Bàn giao nhanh

- **Task kế tiếp**: T0.8 phần B (khung storefront, khung admin, Card/Pagination/ConfirmDialog), rồi **Cổng duyệt 1**, rồi T1.1. T0.9 làm trước T0.8 phần B theo yêu cầu của chủ dự án (19/10/2026); hai task không phụ thuộc nhau.
- **Số test sau T0.9**: unit (`pnpm test`) 957 test / 43 file (trước T0.9: 408 / 28, thêm 549 test, 15 file); `pnpm test:http` 37; `pnpm test:int` 48.
- **Chủ dự án cần làm trên máy**: thêm `NOTIFIER_PROVIDER=noop` vào `.env.local` (biến mới, bắt buộc; thiếu thì `pnpm dev` báo lỗi cấu hình ở mọi trang). Soát diff `.env.example` của PR T0.9 (Claude Code sửa bằng lệnh, không đọc file, N44).

## Giai đoạn 0

| Mã   | Tên                          | Trạng thái | PR  | Ghi chú                                                      |
| ---- | ---------------------------- | ---------- | --- | ------------------------------------------------------------ |
| T0.1 | Khởi tạo project             | Đã merge   | #1  |                                                              |
| T0.2 | Cấu hình môi trường an toàn  | Đã merge   | #2  | `src/server/env.ts`                                          |
| T0.3 | Database và migration nền    | Đã merge   | #3  | Xem "Quyết định đã chốt"                                     |
| T0.4 | Thư viện lõi phía server     | Đã merge   | #7  | `src/server/lib/*`, migration `0001_rate_limits`; xem "Quyết định đã chốt (T0.4)" |
| T0.5 | Proxy (middleware) và headers bảo mật | Đã merge   | #8  | `src/proxy.ts`, `src/server/security/headers.ts`; xem "Quyết định đã chốt (T0.5)" |
| T0.6 | Audit log                    | Đã merge   | #11 | `src/server/audit/*`, migration `0002_audit_logs`; xem "Quyết định đã chốt (T0.6)" |
| T0.7 | CI                           | Đã merge   | #12 | `.github/workflows/ci.yml`; xem "Quyết định đã chốt (T0.7)"; có 1 ngoại lệ audit (`braces`), xem "Việc treo" |
| T0.8 | Bộ component giao diện       | Đang làm   | #14, #15 | Chia hai phần: A (tokens, font, component cơ bản, AppImage, `/dev/ui`) đã merge ở #14, icon `lucide-react` ở #15; B (khung storefront: header, sidebar, footer...) chưa làm, làm sau T0.9. Xem "Quyết định đã chốt (T0.8 phần A)" |
| T0.9 | Khung adapter (Switchboard)  | Đang chờ PR | #16 | `src/server/adapters/*`; xem "Quyết định đã chốt (T0.9)" |

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

## Quyết định đã chốt (T0.8 phần A)

- T0.8 chia hai phần theo yêu cầu của chủ dự án: **A** (đã làm) gồm design tokens, font, component cơ bản, `AppImage`, `/dev/ui`, `Logo`; **B** (chưa làm) gồm khung storefront (header, thanh hình thức mua, sidebar + mega menu, thanh thông báo, nút chat, footer, header/bottom nav mobile, trang danh mục mobile), khung admin, và các component còn lại của danh sách ROADMAP (Card, Pagination, ConfirmDialog; Modal/BottomSheet đã gộp vào `ResponsiveDialog`). Nghiệm thu "khung trang đúng ở 390px/1280px" và "ảnh chụp khớp ảnh tham chiếu 01, 04" thuộc phần B.
- Design tokens (màu, chữ theo vai trò, bo góc, bóng, chuyển động) nằm trong `src/app/globals.css` (`@theme`); font Be Vietnam Pro (400/500/600/700, subset `vietnamese` + `latin`) qua `next/font/google` ở `src/app/layout.tsx`. Font tự host: bản build chứa file `.woff2` trong `/_next/static/media`, `@font-face` chỉ trỏ vào đó, CSP không cần `font-src` riêng (`tests/http/dev-ui.test.ts` kiểm). Cần mạng khi chạy `next build` và lần đầu `next dev` để tải font từ Google, trình duyệt thì không gọi Google lúc chạy. Viewport không đặt `maximumScale`/`userScalable` (test kiểm).
- Component ở `src/components/ui/`: `Button` (primary/soft/outline/ghost/danger, sm/md/lg, loading giữ focus nhờ `aria-disabled` thay cho `disabled`), `IconButton` (bắt buộc `label` → `aria-label`), `Chip`, `Badge`, `PriceTag`, `QuantityStepper`, `Input`, `PhoneInput`, `Select`, `Textarea`, `Checkbox`, `ResponsiveDialog`, `Drawer`, `Toast`, `Skeleton`, `EmptyState`, `Breadcrumb`, `Tabs`, `Accordion`, `SegmentedControl`, `StickyActionBar`, `Logo`, `AppImage`. Ô nhập liệu luôn có nhãn (`hideLabel` để ẩn nhưng giữ cho trình đọc màn hình), chữ ≥ 16px, lỗi đọc ra bằng `role="alert"` và gắn qua `aria-describedby`.
- Hộp thoại dựng trên `<dialog>` gốc, không thêm thư viện (N38). Icon dùng `lucide-react` 1.55.0 (N39, chủ dự án duyệt 19/10/2026), thay bộ icon tự viết ban đầu ở PR riêng.
- Tiền hiển thị qua một nơi duy nhất `src/lib/format.ts` (`formatVnd`, `formatSavingsShort`, `discountPercent`, `savingsAmount`, `formatUnitPrice`); số thực/âm/NaN ném `RangeError` thay vì hiển thị sai. Quy tắc làm tròn "Tiết kiệm 13,5K" là giả định của phần hiển thị: làm tròn XUỐNG tới 100đ (không khoe nhiều hơn thực tế), dưới 1.000đ ghi đầy đủ; số tiền thật vẫn do server tính.
- `QuantityStepper`: logic thuần ở `src/lib/quantity.ts`; giới hạn `max` chỉ là gợi ý, server vẫn kiểm tồn.
- `AppImage` + `src/lib/images/presets.ts` (preset, tỉ lệ khung, `sizes` sinh từ bảng cột lưới) + `loader.ts` (chọn bản gần nhất không nhỏ hơn): xem N40. Hiện chỉ có ảnh giữ chỗ trong `public/placeholders/` (SVG tự vẽ, không phải ảnh của thương hiệu khác); chưa có pipeline nén ảnh (T2.2). ESLint: `@next/next/no-img-element` ở mức `error` (có test chạy ESLint thật trên đoạn mã có `<img>` trần).
- `/dev/ui`: chỉ render khi `APP_ENV=local`, còn lại 404 (N42). Test: unit (`src/server/dev-ui.test.ts`) và HTTP trên bản build thật ở local/test/staging/production.
- Vitest chia project `server` và `ui` (N41); `pnpm check` chạy cả hai.
- Đã kiểm trên trình duyệt (Browser pane, `pnpm dev -p 3100`): Console không có lỗi CSP; font Be Vietnam Pro tải đủ các trọng lượng; không cuộn ngang ở 430px; hộp thoại là bottom sheet ở mobile và modal giữa ở desktop; focus nhìn thấy được. Chưa có Playwright nên chưa có ảnh chụp tự động.

## Quyết định đã chốt (T0.9)

- Cấu trúc `src/server/adapters/<port>/`: `index.ts` (nơi duy nhất chọn adapter, có `selectXAdapter(config, deps)` để test và `getX()` cho code nghiệp vụ), `port.ts` (interface và kiểm tra dùng chung), adapter thật `<tên>.ts`, adapter giả `fakes/<tên>.ts`. Bảng tên nhà cung cấp và loại thật/giả ở `adapters/providers.ts`; hàm chọn chung ở `adapters/select.ts` (N43). AuthPort để T1.1.
- 5 port: payment (`sepay` / `fake`), sms (`esms` tên giữ chỗ Q6 / `console`), storage (`supabase` / `memory`, bucket `incoming` riêng tư và `media` công khai, chưa có pipeline), captcha (`turnstile` / `always-pass`), notifier (`telegram` / `noop`). Cả 5 adapter thật ném `NotImplementedError` (mới, trong `server/lib/errors.ts`) ở mọi phương thức.
- Adapter giả bị chặn ngoài local/test ở ba lớp: `env.ts`, `selectAdapter` (danh sách cho phép), factory của adapter giả. ESLint `local/no-fake-adapter-import` (rule mới trong `eslint-rules/`) chỉ cho `index.ts` của chính port và test import adapter giả.
- `env.ts`: `*_PROVIDER` chỉ nhận tên trong bảng; thêm `NOTIFIER_PROVIDER` (bắt buộc mọi môi trường), `OWNER_ALERT_TELEGRAM_BOT_TOKEN`, `OWNER_ALERT_TELEGRAM_CHAT_ID` (bắt buộc ở staging/production); bỏ `OWNER_ALERT_CHANNEL` (N44, N45). CI thêm `NOTIFIER_PROVIDER: noop`.
- Test (ROADMAP T0.9, nghiệm thu):
  - (a) `adapters/selection.test.ts`: ma trận 5 port × 2 nhà cung cấp × 4 `APP_ENV` (40 tổ hợp), tên lạ (`mock`, `FAKE`, `__proto__`...) bị từ chối, adapter thật thiếu biến bị từ chối chứ không chuyển sang adapter giả.
  - (b) staging/production chọn adapter giả: từ chối ở `env.ts` (`selection.test.ts`, `env.test.ts`) và ở hàm chọn (khớp đúng thông điệp của hàm chọn, nên gỡ lớp này thì đỏ dù lớp 3 vẫn chặn).
  - (c) `adapters/scan.test.ts`: quét thư mục, đối chiếu file với bảng; mọi phương thức của adapter "not-implemented" phải ném `NotImplementedError` ở cả 4 `APP_ENV`; adapter "implemented" phải có file test riêng; port thêm phương thức mà bảng gọi thử chưa có thì typecheck đỏ.
  - (d) adapter giả nạp được ở local và test (`selection.test.ts`).
  - Hợp đồng chung `adapters/<port>/contract.test.ts` chạy cho mọi adapter; test riêng cho từng adapter giả; `notifier/port.test.ts` (che SĐT, địa chỉ, khóa nhạy cảm); `storage/port.test.ts` (bucket, đường dẫn); `fake-imports.lint.test.ts` (chạy ESLint thật).
- Đã cố tình phá rồi khôi phục (không commit): `sepay.verifyWebhook` trả `{ ok: true }` → 20 test đỏ (4 ở test quét, 16 ở hợp đồng payment); gỡ lớp 2 trong `selectAdapter` → 10 test đỏ; gỡ kiểm adapter giả trong `env.ts` → 22 test đỏ; gỡ tự chặn trong factory `sms/console` → 4 test đỏ; thêm file `sms/vnpt.ts` chưa đăng ký → test quét đỏ; `export ... from` adapter giả trong `src/server/dev-ui.ts` → `pnpm lint` báo lỗi.
- Không thêm dependency, không gọi mạng (test truyền `fetch` giả và kiểm không có request nào).

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
- `pnpm audit` (15/10/2026, chủ dự án duyệt): nâng `next`/`eslint-config-next` lên 16.3.8 (GHSA-cjq9-62q9-8jv4), `source-map-js` lên 1.2.2 chỉ đổi lockfile (GHSA-68fv-2mgg-jv7q); `braces` chưa có bản vá nên có đúng một ngoại lệ `auditConfig.ignoreGhsas` trong `pnpm-workspace.yaml` (GHSA-vfj7-8cjw-p6xm).
- Nghiệm thu: PR #12; PR nháp #13 với `SEPAY_API_TOKEN` giả làm CI đỏ ở gitleaks (run 38609910204), đã đóng và xóa nhánh, chuỗi giả không có trong `main`.

## Việc treo

- Chính sách lưu trữ audit log (chốt khi làm T7): đề xuất giữ tối thiểu 12 tháng và sao lưu định kỳ (nằm trong bản `pg_dump` hằng tuần ở ARCHITECTURE mục 12). Bảng chỉ cho INSERT nên việc xóa dòng quá hạn (nếu có) phải làm bằng role migration hoặc một hàm riêng có kiểm soát, không cấp DELETE cho `app_runtime`. Cũng cần chốt có phải lưu lâu hơn theo yêu cầu kế toán/pháp lý không.
- Chưa có chỗ nào gọi `record()`: các task từ T1 trở đi (đăng nhập, nhân viên, sản phẩm, đơn hàng, webhook) gọi và thêm action vào `AUDIT_ACTIONS` khi cần.
- `requestId` hiện do người gọi tự lấy bằng `getRequestContext()`; khi làm guard/phiên (T1.1) cân nhắc một chỗ chung để logger và audit dùng cùng một `requestId` cho mỗi request.
- Hardening tùy chọn: `app_runtime` vẫn INSERT được giá trị `created_at` tự chọn nếu có code bỏ qua `record()`; có thể thu hồi quyền INSERT theo cột hoặc thêm trigger ép `created_at = now()` nếu cần.

- **Hạn 14/11/2026**: xem lại ngoại lệ audit `GHSA-vfj7-8cjw-p6xm` (`braces` ≤ 3.0.3, tràn stack khi gặp mẫu lồng sâu) trong `auditConfig.ignoreGhsas` của `pnpm-workspace.yaml`. Lý do tạm chấp nhận: chưa có bản vá, `braces` chỉ nằm trong chuỗi lint (`eslint-config-next` > `@next/eslint-plugin-next` > `fast-glob` > `micromatch` > `braces`), chạy với mẫu glob do dự án viết, không có trong bản build production. Tới hạn: có bản vá hoặc `eslint-config-next` bỏ `fast-glob` 3.3.1 thì nâng và gỡ ngoại lệ; chưa có thì báo chủ dự án duyệt lại, không gia hạn âm thầm. Không thêm ngoại lệ nào khác.
- `pnpm audit` còn 1 lỗ hổng mức moderate ở `esbuild` (dưới ngưỡng `high` nên CI không đỏ); chưa xử lý.
- T0.7: chủ dự án bật branch protection cho `main` (check bắt buộc `ci`, cần review) sau khi PR #12 merge.
- T0.7: nâng phiên bản Action/gitleaks/Postgres là việc làm tay; cân nhắc Dependabot cho `github-actions` (cần chủ dự án đồng ý).
- `Referrer-Policy: no-referrer` cho trang có token trên URL: làm ở T3.5 cùng trang đơn hàng.
- Chưa thử CSP với dịch vụ thật (Supabase, Sentry, Turnstile): mới có test trên server `next start` với giá trị giả. Phải thử trên staging trước khi mở bán (SECURITY mục 5).
- T2.2: xin duyệt dependency `sharp` trước khi cài; chốt định dạng bản chuẩn hóa (đề xuất WebP chất lượng cao, giữ kênh alpha) và các giá trị ngân sách của bản chưa nêu.
- T2.9: chốt preset cho banner mega menu (2,2:1) và ảnh tiêu đề khối (7:1); chưa có trong danh sách preset.
- T0.8 phần A: Q17 đã chốt 19/10/2026: giữ nguyên màu UI_SPEC (tương phản `primary`/`sale` chưa đạt AA với chữ nhỏ). Đo Lighthouse ở cổng duyệt 1; điểm Accessibility bị trừ vì lý do này thì báo chủ dự án quyết lại.
- T0.8 phần A: font chưa có `<link rel="preload">` trong HTML (Turbopack không phát ra); trang đầu có thể thấy chữ dự phòng một thoáng (`display: swap`). Xem lại khi đo LCP.
- T0.8 phần A: `sizes` của `AppImage` dùng phần chiều ngang ngoài lưới ước lượng (UI_SPEC không ghi padding ở 600–1279px); đối chiếu lại khi dựng khung ở phần B.
- T2.9 (đã nêu ở trên) vẫn cần chốt preset banner mega menu và ảnh tiêu đề khối; `AppImage` chưa có hai preset này.
- Chưa có test tương tác DOM (bấm, bàn phím, focus) cho `Tabs`, `Accordion`, hộp thoại; mới có logic thuần và render tĩnh. Thêm cùng Playwright (T0.8 phần B hoặc giai đoạn sau).
- T3.2: chốt cách kiểm "từ chối khởi động" khi `shipping_policy` chưa hiện thực (hook khởi động của Next.js hay kiểm lúc nạp cấu hình).
- Câu hỏi mở Q16: phí giao hàng sau này tính theo km hay theo khu vực (`docs/README.md`).
- Thêm Supabase vào `connect-src` khi làm upload ảnh bằng signed URL; thêm domain tile OSM vào `img-src` ở T1.4.
- Test header trên trang admin: thêm khi có `/admin/dang-nhap` (T1.5).
- `/_next/static` và `favicon.ico` không đi qua proxy nên không có `X-Content-Type-Options`; nếu cần phủ cả file tĩnh thì thêm `headers()` trong `next.config.ts`.

- Cron `cleanup` xóa dòng cũ của `rate_limits` chưa có (làm cùng các job cron ở giai đoạn sau); bảng tăng dần cho tới lúc đó.
- Câu hỏi mở Q15: cửa sổ "theo ngày" của giới hạn OTP đếm lại lúc 0h giờ Việt Nam hay 7h (UTC).

- `minimum_password_length = 8` trong `supabase/config.toml` (mặc định của CLI là 6): làm ở T1.2.
- Câu hỏi mở Q1–Q14 trong mục "Câu hỏi mở" của `docs/README.md`; Q5 (ngân hàng) bắt buộc trước giai đoạn 3, Q6 (SMS OTP) bắt buộc trước khi mở bán.

- T0.9: adapter SMS thật đang mang tên giữ chỗ `esms` và chưa có biến khóa API trong `env.ts`; chốt Q6 thì đổi tên (file, `providers.ts`, CI, test) và thêm biến bắt buộc ở staging/production.
- T0.9: staging/production bắt buộc Telegram (`OWNER_ALERT_TELEGRAM_*`), nên phải tạo bot trước khi dựng staging (đã thêm vào "Việc bạn cần làm" trong `docs/README.md`).
- T0.9: logger chung chưa che địa chỉ (SECURITY mục "Log và dữ liệu cá nhân" yêu cầu không log địa chỉ đầy đủ); hiện chỉ notifier che. Khi có dữ liệu địa chỉ (T1.4) cân nhắc che theo khóa trong `sanitizeForLog`, lưu ý hàm này cũng dùng cho audit `before`/`after` (N32), cần chủ dự án quyết.
- T0.9: `sms/console` không in OTP khi `APP_ENV=test`, nên E2E đăng nhập bằng OTP (T1.x) cần cách khác để lấy mã (ví dụ hook test riêng), không được nới adapter này.
- T0.9: chưa có code nghiệp vụ nào gọi `getPayment()`, `getSms()`... Webhook SePay (giai đoạn 3) gọi `getPayment().verifyWebhook` trước `parseWebhook`; nơi gọi captcha coi mọi lỗi là "không qua".
