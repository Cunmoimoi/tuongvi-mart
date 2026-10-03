# Lộ trình thực hiện

## Cách dùng tài liệu này

- Làm tuần tự theo mã task (T0.1, T0.2...). Không nhảy giai đoạn khi giai đoạn trước chưa nghiệm thu.
- Mỗi task: đọc mục task + tài liệu liên quan → viết test cho phần tiền/kho/điểm/trạng thái/bảo mật → code → `pnpm check` + `pnpm test:int` → báo cáo.
- Task giao diện: đọc mục tương ứng trong `docs/UI_SPEC.md` và xem ảnh tham chiếu trong `docs/reference/kfm-desktop/` (1 px ảnh ≈ 1 CSS px).
- "Tham khảo UI" trỏ tới code cũ ở `../tuongvi-legacy/`. Chỉ lấy JSX và class Tailwind, thay mọi lời gọi store cũ bằng props hoặc Server Action mới.
- Có 3 cổng duyệt của chủ dự án (đánh dấu ⛳): chủ dự án xem demo, đồng ý rồi mới làm tiếp.

## Bảng tái sử dụng giao diện từ code cũ

| Code cũ | Dùng cho | Ghi chú |
|---|---|---|
| `tailwind.config.ts`, `src/app/globals.css` | Theme, màu thương hiệu | Chuyển sang cấu hình Tailwind mới |
| `components/storefront/Header.tsx`, `Footer.tsx`, `BottomNav.tsx`, `CategoryBar.tsx`, `HeroBanner.tsx` | Khung storefront | Bỏ logic store; tìm kiếm chuyển sang route `/tim-kiem` |
| `components/storefront/ProductCard.tsx`, `FlashSaleSection.tsx`, `ComboSection.tsx`, `QuickViewModal.tsx` | Lưới sản phẩm | Giá và tồn truyền vào qua props từ server; bỏ telemetry cũ |
| `app/(storefront)/products/[slug]/page.tsx` | Trang chi tiết sản phẩm | Chuyển thành Server Component + phần chọn quy cách là Client Component |
| `components/storefront/CartDrawer.tsx` | Ngăn giỏ hàng | Giá lấy từ `quoteCart` |
| `app/(storefront)/checkout/page.tsx`, `components/storefront/VietQRModal.tsx` | Checkout, trang thanh toán | Bỏ nút giả lập, bỏ đồng hồ tự đếm |
| `app/(storefront)/order-success/[id]/page.tsx` | Trang đơn hàng | Chỉ hiện QR bàn giao khi đủ điều kiện |
| `components/storefront/AuthModal.tsx`, `app/(storefront)/register/page.tsx` | Đăng ký, đăng nhập | Form 2 bước; địa chỉ đổi sang 2 cấp |
| `app/(storefront)/member/page.tsx` | Trang tài khoản | Thẻ hạng, lịch sử điểm, đơn hàng |
| `components/common/MapCoordinatePicker.tsx` | Ghim vị trí giao hàng | |
| `app/admin/layout.tsx`, `app/admin/page.tsx` | Khung admin, dashboard | Guard chuyển sang server |
| `app/admin/orders/page.tsx`, `components/admin/QRScannerModal.tsx` | Bảng đơn, quét bàn giao | Bỏ danh sách "bấm quét nhanh thử nghiệm" |
| `app/admin/products/*`, `components/admin/ProductImageUploader.tsx` | Quản lý sản phẩm, nhập Excel | Upload qua signed URL |
| `app/admin/accounts/page.tsx` | Khách hàng, nhân viên | Tách 2 màn; bỏ "Hiện mật khẩu" |
| `app/admin/settings/loyalty/page.tsx` | Cài đặt tích điểm | |

KHÔNG dùng lại: toàn bộ `src/store/*`, `src/services/*`, `src/middleware.ts`, `supabase_schema.sql`, `src/data/vietnamLocations.ts` (dữ liệu hành chính cũ), dữ liệu mẫu, tài khoản mẫu.

---

## Giai đoạn 0: Nền móng

### T0.1 Khởi tạo project
- Next.js App Router, TypeScript `strict` + `noUncheckedIndexedAccess`, pnpm, ESLint (typescript-eslint strict), Prettier, Tailwind với theme từ code cũ.
- `next.config`: `poweredByHeader: false`, `output: "standalone"`, `images.remotePatterns` chỉ domain Supabase Storage.
- ESLint `no-restricted-imports`: cấm import `@/server/*` từ file có `"use client"`; cấm gói `xlsx`.
- `.env.example` liệt kê mọi biến (ARCHITECTURE mục 10), không có giá trị.
- `.gitignore` có `.env*` (trừ `.env.example`) và `docs/reference/` (ảnh tham chiếu của bên thứ ba, không commit).
- Viewport không chặn phóng to.
- Nghiệm thu: `pnpm build` và `pnpm check` chạy được; README hướng dẫn chạy local.

### T0.2 Cấu hình môi trường an toàn
- `src/server/env.ts`: Zod schema, phân biệt `APP_ENV`; từ chối adapter mock và thiếu secret khi `staging`/`production`.
- Nghiệm thu: unit test cho 4 môi trường; test "production + SMS_PROVIDER=console" ném lỗi; test "production thiếu SEPAY_WEBHOOK_SECRET" ném lỗi.

### T0.3 Database và migration nền
- Supabase CLI local; Drizzle + postgres-js (`prepare: false`); `db/tx.ts` helper transaction.
- Migration 0001: schema `app`, extensions (`unaccent`, `pg_trgm`, `btree_gist`, `pgcrypto`), role `app_runtime` + grant, RLS + policy cho `app_runtime`, thu hồi quyền của `anon`/`authenticated` trên `app`, trigger `updated_at`.
- Nghiệm thu: integration test kết nối bằng role `anon` không đọc được bảng nào trong `app`; test `app_runtime` không `DELETE` được bảng ledger.

### T0.4 Thư viện lõi phía server
- `errors.ts` (AppError + bảng thông điệp tiếng Việt), `logger.ts` (JSON, requestId, che SĐT, lọc khóa nhạy cảm), `clock.ts`, `tokens.ts` (`randomToken(bytes)`, `generateOrderCode()`), `safe-equal.ts`, `money.ts`, `rate-limit.ts` (Postgres).
- Nghiệm thu: test `generateOrderCode` đúng định dạng và chỉ dùng bảng chữ cho phép; test logger che `0901234567` → `090****567` và bỏ trường `password`; test rate limit đúng ngưỡng khi gọi song song.

### T0.5 Middleware và headers bảo mật
- Sinh nonce CSP mỗi request, set các header trong SECURITY mục 2. Hàm dựng header là hàm thuần trong `src/server/security/headers.ts`; `src/middleware.ts` chỉ nối cấu hình từ `env` vào. Mọi trang render động vì nonce (ARCHITECTURE mục 11).
- Làm mới phiên Supabase: chuyển sang T1.1 (cần `@supabase/ssr` và `auth/supabase.adapter.ts`, chưa có ở giai đoạn này). `src/middleware.ts` để sẵn chú thích `TODO(T1.1)`.
- Nghiệm thu: unit test hàm dựng header; test HTTP (`pnpm test:http`, gọi vào server `next start` thật, không dùng Playwright) kiểm tra header xuất hiện trên trang chủ và trang 404, HSTS chỉ có ở staging/production, nonce khác nhau mỗi request và khớp với mọi thẻ `<script>`. Chưa có trang admin nên chưa kiểm ở đó; thêm khi có `/admin/dang-nhap` (T1.5).

### T0.6 Audit log
- `audit/service.ts`: `record({actor, action, entity, before, after, request})`, tự che trường nhạy cảm.
- Nghiệm thu: test ghi được; test `app_runtime` không UPDATE/DELETE được `audit_logs`.

### T0.7 CI
- GitHub Actions: install → typecheck → lint → unit → khởi Postgres + migrate → integration → `pnpm audit --audit-level high` → gitleaks → build.
- Câu hỏi mở: cách đặt mật khẩu role `app_runtime` cho CI (đề xuất: workflow tự đặt mật khẩu tạm, giữ nguyên guard nghiêm).
- Nghiệm thu: PR mẫu chạy xanh; commit thử một chuỗi giống secret làm CI đỏ.

### T0.8 Bộ component giao diện
- Theo `docs/UI_SPEC.md` mục 2 (design tokens, font Be Vietnam Pro qua `next/font`) và mục 5 (component dùng chung).
- `components/ui`: Button, Input, Select, Textarea, Checkbox, Modal, Drawer, BottomSheet, ResponsiveDialog, Badge, Chip, Card, Tabs, Accordion, SegmentedControl, Toast, Skeleton, EmptyState, Pagination, ConfirmDialog.
- Khung storefront theo UI_SPEC mục 1 và 3: header desktop 70px, thanh hình thức mua, sidebar danh mục 256px + mega menu, thanh thông báo, nút chat nổi, footer, header và bottom nav mobile, trang danh mục mobile; khung admin (Sidebar). Dữ liệu tạm bằng props mẫu.
- Tham khảo UI: xem bảng tái sử dụng.
- Nghiệm thu: trang `/dev/ui` (chỉ render khi `APP_ENV=local`) hiển thị các component ở mọi trạng thái; không có lỗi a11y cơ bản (label cho input, focus nhìn thấy được); khung trang đúng bố cục ở 390px và 1280px; ảnh chụp ở 1536px khớp ảnh tham chiếu 01 và 04 về vị trí và kích thước (sai lệch ≤ 10%).

### T0.9 Khung adapter (Switchboard)
- Tạo các port và adapter theo ARCHITECTURE mục 9; adapter thật chưa làm xong phải `throw NotImplementedError`.
- Nghiệm thu: test chọn adapter theo env; test adapter chưa làm xong không bao giờ trả thành công.

⛳ **Cổng duyệt 1**: chủ dự án xem repo chạy local, CI xanh, trang `/dev/ui`.

---

## Giai đoạn 1: Tài khoản và đăng nhập

### T1.1 Auth port, phiên, guard
- `auth/port.ts`, `auth/supabase.adapter.ts` (server client qua `@supabase/ssr`), `session.ts`, `guards.ts`: `requireCustomer`, `requireStaff`, `requireAdmin({ mfa })`, `requireStepUp()`, `requireOrderAccess`.
- Làm mới cookie phiên Supabase trong `src/middleware.ts` (chuyển từ T0.5, chỗ để sẵn `TODO(T1.1)`); middleware chỉ làm mới cookie, không quyết định quyền.
- Test quét tĩnh: mọi `actions.ts`/`route.ts` gọi guard hoặc có chú thích `public-endpoint`.
- Nghiệm thu: ma trận test vai trò × guard; sửa cookie thủ công không nâng được quyền; nhân viên bị vô hiệu hóa bị chặn ngay ở request tiếp theo.

### T1.2 OTP qua SMS
- Route `api/auth-hooks/send-sms` nhận Send SMS Hook của Supabase, xác thực chữ ký hook bằng `SMS_HOOK_SECRET`, áp giới hạn gửi (BUSINESS_RULES mục 12), gọi `SmsPort`.
- Adapter `console` cho local; adapter nhà cung cấp thật để `NotImplementedError` cho tới khi chủ dự án chọn nhà cung cấp.
- Turnstile ở form đăng ký và quên mật khẩu.
- Đặt `minimum_password_length = 8` trong `supabase/config.toml` (mặc định của Supabase CLI là 6, thấp hơn yêu cầu ở ARCHITECTURE mục 6).
- Nghiệm thu: test chữ ký hook sai → từ chối; test vượt giới hạn không gọi `SmsPort`; test chỉ nhận đầu số di động Việt Nam.

### T1.3 Đăng ký, đăng nhập, quên mật khẩu (khách)
- Trang `/dang-ky` (2 bước: thông tin + mật khẩu → OTP), `/dang-nhap`, `/quen-mat-khau`, đăng xuất, đổi mật khẩu trong `/tai-khoan/bao-mat`.
- Tạo bản ghi `customers` sau khi xác thực OTP; kiểm tra `LOCKED` khi đăng nhập.
- Tham khảo UI: `AuthModal.tsx`, `register/page.tsx`.
- Nghiệm thu: E2E đăng ký → đăng nhập → đổi mật khẩu → đăng xuất (SMS console); thông điệp lỗi không tiết lộ SĐT tồn tại; sau quên mật khẩu các phiên cũ bị thu hồi.

### T1.4 Đơn vị hành chính và sổ địa chỉ
- `scripts/import-admin-units.ts` nạp 34 tỉnh/thành + phường/xã từ nguồn chính thức (ghi nguồn, ngày).
- `/tai-khoan/dia-chi`: thêm/sửa/xóa, đặt mặc định, ghim vị trí (Leaflet + OpenStreetMap, có ghi công OSM; thêm domain tile vào CSP `img-src`).
- Tham khảo UI: `MapCoordinatePicker.tsx`.
- Nghiệm thu: chọn tỉnh → lọc đúng phường/xã; không lưu được địa chỉ của khách khác (test IDOR).

### T1.5 Đăng nhập nhân viên và MFA
- `/admin/dang-nhap`: username + mật khẩu; ánh xạ username → email nội bộ.
- Bắt buộc đổi mật khẩu lần đầu (`must_change_password`).
- Admin: bắt buộc đăng ký TOTP, phiên phải AAL2; step-up TOTP cho thao tác nhạy cảm.
- `scripts/create-admin.ts`: hỏi username, họ tên, mật khẩu qua prompt; không nhận mật khẩu qua tham số dòng lệnh.
- Nghiệm thu: admin chưa MFA chỉ vào được trang đăng ký MFA; step-up hết hạn sau 10 phút; khách không đăng nhập được ở trang admin.

### T1.6 Quản lý nhân viên
- `/admin/nhan-vien`: danh sách, tạo (mật khẩu tạm hiện đúng một lần), vô hiệu hóa (thu hồi phiên), đặt lại mật khẩu, đổi vai trò. Cần step-up.
- Tham khảo UI: tab nhân viên trong `admin/accounts/page.tsx` (bỏ "Hiện mật khẩu").
- Nghiệm thu: mọi thao tác có audit; staff gọi action quản lý nhân viên → 403.

---

## Giai đoạn 2: Danh mục sản phẩm và kho

### T2.1 Danh mục
- Schema `categories` có danh mục cha/con (tối đa 3 cấp), icon, nội dung SEO; admin CRUD dạng cây, kéo thả sắp xếp, ẩn/hiện, xóa mềm.
- Nghiệm thu: slug duy nhất, tự sinh từ tên tiếng Việt; không tạo được cấp thứ 4 hay vòng lặp cha-con; audit mọi thay đổi.

### T2.2 Sản phẩm, quy cách, ảnh
- Schema `products` (gồm các trường thông tin chi tiết: hạn sử dụng, thành phần, hướng dẫn sử dụng, bảo quản), `sell_units`, `product_images`; admin tạo/sửa/ẩn/xóa mềm.
- Upload ảnh: server cấp signed upload URL (admin), bucket giới hạn JPEG/PNG/WebP ≤ 5 MB; tối đa 8 ảnh, chọn ảnh chính.
- Tham khảo UI: `admin/products/new`, `admin/products/[id]/edit`, `ProductImageUploader.tsx`.
- Nghiệm thu: không tạo được quy cách `base_qty < 1` hay giá âm; upload SVG bị từ chối; sửa sản phẩm làm mới cache trang sản phẩm.

### T2.3 Combo
- Schema `combo_components`; UI chọn thành phần và số lượng.
- Nghiệm thu: combo không chứa combo khác; tồn khả dụng combo đúng công thức (unit test).

### T2.4 Flash sale
- Schema `flash_sales`; UI tạo/sửa/tắt; exclusion constraint chống chồng lịch.
- Nghiệm thu: hai flash sale chồng thời gian cùng quy cách → DB từ chối; giá hiển thị đổi đúng lúc bắt đầu/kết thúc (test với clock giả).

### T2.5 Kho
- Seed kho `ONLINE_MAIN` (tọa độ 482 Huỳnh Tấn Phát, cần chủ dự án xác nhận); `stock_levels`, phiếu nhập, điều chỉnh (bắt buộc lý do), lịch sử `inventory_movements`, cảnh báo sắp hết.
- Nghiệm thu: điều chỉnh không làm `on_hand < reserved`; mọi thay đổi tồn đều có movement; tổng movement = `on_hand` (test đối chiếu).

### T2.6 Nhập/xuất Excel
- Wizard 3 bước (tải file → xem trước + lỗi từng dòng → ghi trong 1 transaction). Dùng `exceljs` (cần duyệt dependency).
- Xuất CSV sản phẩm/tồn kho có thoát công thức.
- Tham khảo UI: `admin/products/import/page.tsx`.
- Nghiệm thu: file có 1 dòng lỗi → không ghi dòng nào (hoặc chỉ ghi dòng hợp lệ nếu admin chọn), báo đúng dòng lỗi; file > 2.000 dòng bị từ chối.

### T2.7 Module giá và tồn khả dụng
- Hàm thuần `priceCart`, `availableForSellUnit`, `availableForCombo`.
- Nghiệm thu: đủ các test trong BUSINESS_RULES mục 2 và 9.

### T2.8 Storefront
- Làm đúng `docs/UI_SPEC.md` mục 4.1–4.5: trang chủ (banner, tab bộ sưu tập với lưới 2 hàng cuộn ngang, khối theo danh mục), sidebar + mega menu có dữ liệu thật, `/danh-muc/[...slug]` (khối danh mục con, thanh dính khi cuộn, khối khuyến mãi, lọc, sắp xếp, tải thêm), `/san-pham/[slug]` (gallery, khối mua hàng dính bên phải, thẻ quy cách), dropdown tìm kiếm 2 trạng thái (gõ không dấu vẫn ra), thẻ sản phẩm đổi thành bộ tăng giảm sau khi thêm.
- SEO: `generateMetadata`, `sitemap.ts`, `robots.ts`, JSON-LD Product; mô tả meta đúng ngành hàng thật của cửa hàng.
- Cache dữ liệu có tag, làm mới khi admin sửa.
- Tham khảo UI: `app/page.tsx`, `ProductCard`, `FlashSaleSection`, `ComboSection`, `HeroBanner`, `CategoryBar`, `QuickViewModal`, `products/[slug]`.
- Nghiệm thu: trang sản phẩm có nội dung trong HTML trả về (xem nguồn trang); sản phẩm ẩn trả 404; đạt UI_SPEC mục 9 cho các trang này, gồm so sánh với ảnh tham chiếu 01–11.

### T2.9 Banner và bộ sưu tập
- Schema `banners`, `collections`, `collection_products` (DATA_MODEL mục 10); màn admin quản lý (upload ảnh desktop/mobile riêng, hẹn giờ bật/tắt, sắp xếp, chọn sản phẩm cho bộ sưu tập).
- Admin cấu hình thêm: thanh thông báo, link Zalo, từ khóa phổ biến, danh mục hiện trên trang chủ, nhãn thẻ sản phẩm của bộ sưu tập.
- Storefront: banner trang chủ, tab bộ sưu tập, các khối bộ sưu tập trên trang chủ, banner trong mega menu Khuyến mãi HOT, `/khuyen-mai`, `/bo-suu-tap/[slug]` (UI_SPEC mục 3.3, 3.4, 4.1, 4.12).
- Nghiệm thu: banner hết hạn tự ẩn (test với clock giả); link banner chỉ nhận đường dẫn nội bộ; sửa bộ sưu tập làm mới cache trang chủ.

### T2.10 PWA cơ bản
- Manifest, icon, apple-touch-icon, service worker tối giản, trang offline, gợi ý cài đặt theo UI_SPEC mục 8.
- Nghiệm thu: Lighthouse nhận diện là ứng dụng cài được; test xác nhận service worker không cache `/tai-khoan`, `/gio-hang`, `/thanh-toan`, `/don-hang`, `/admin`, `/api`.

---

## Giai đoạn 3: Giỏ hàng, đặt hàng, thanh toán (phần lõi)

### T3.1 Giỏ hàng
- `stores/cart.ts` (Zustand + persist, chỉ `sellUnitId` + `qty`); Server Action `quoteCart` trả giá, tồn, cảnh báo.
- `CartDrawer` và `/gio-hang` theo UI_SPEC mục 4.6 (thanh tiến độ miễn phí giao hàng, cảnh báo giá/tồn).
- Nghiệm thu: sửa localStorage thành giá bất kỳ không ảnh hưởng số tiền hiển thị; sản phẩm ngừng bán hiện cảnh báo và không cho đặt.

### T3.2 Cài đặt cửa hàng, phí ship, chọn kho
- `store_settings` + màn `/admin/cai-dat` (mục tiền cần step-up).
- `fulfillment/strategy.ts` (`SingleOnlineWarehouseStrategy`), hàm `shippingFee`, kiểm bán kính.
- Nghiệm thu: unit test phí ship ở ngưỡng 299.999 / 300.000; tọa độ cách 40,1 km → `OUT_OF_DELIVERY_RANGE`.

### T3.3 Lõi tích điểm
- Hàm thuần theo BUSINESS_RULES mục 8; service ledger: `hold`, `release`, `redeem`, `redeemReturn`, `earn`, `reverse`, `adjust` (đều nhận `tx`).
- Nghiệm thu: các ví dụ trong mục 8 là unit test; ledger trùng `(order_id, type)` bị DB chặn; `points_balance` không âm.

### T3.4 Đặt hàng `placeOrder`
- Làm đúng BUSINESS_RULES mục 4.2.
- Giao diện theo UI_SPEC mục 4.7. Tham khảo UI: `checkout/page.tsx` (bỏ tính tiền ở client).
- Nghiệm thu (integration test):
  - 2 request song song cho món còn 1 → đúng 1 đơn.
  - Gửi lại cùng `idempotencyKey` → cùng một đơn.
  - `expectedTotal` lệch → `PRICE_CHANGED`, không tạo đơn, không giữ kho.
  - Flash sale hết suất giữa chừng → lỗi, không giữ kho.
  - 2 đơn song song dùng hết điểm → 1 thành công.
  - Gửi thêm trường `price`, `total` giả → bị bỏ qua.
  - Khách vãng lai không có captcha → từ chối.

### T3.5 Trang thanh toán và trạng thái đơn
- `server/lib/vietqr.ts` (EMVCo + CRC16) + render QR tại chỗ (thư viện QR cần duyệt).
- `/don-hang/[id]` theo UI_SPEC mục 4.8: QR, nút "Lưu ảnh QR", các ô chép nhanh, đếm ngược theo server, nút hủy (khi chờ thanh toán), stepper trạng thái.
- View token cho khách vãng lai (cookie + link), `requireOrderAccess`.
- `GET /api/orders/[id]/status` + hook `useOrderStatus` (polling, `visibilitychange`, dừng khi trạng thái cuối).
- Tham khảo UI: `VietQRModal.tsx`, `order-success/[id]/page.tsx`.
- Nghiệm thu: test chuỗi VietQR với mẫu đã biết; truy cập đơn không có quyền → 404; link có token đặt cookie rồi chuyển về URL sạch; poll bị rate limit đúng ngưỡng.

### T3.6 Webhook SePay
- Làm đúng BUSINESS_RULES mục 5.3 và 5.4.
- Nghiệm thu (integration test, dùng secret test tự ký):
  - Chữ ký đúng + số tiền đúng → PAID, kho trừ đúng, điểm REDEEM, có `payments`, có `handover_nonce`.
  - Chữ ký sai / thiếu header / timestamp lệch 6 phút → 401, không ghi `bank_transactions`.
  - Gửi lại cùng payload → không xử lý lại, trả `{"success": true}`.
  - 2 webhook khác id cùng mã đơn → 1 MATCHED, 1 `DUPLICATE_OR_EXTRA`.
  - Sai số tiền / sai tài khoản / không có mã / đơn hết hạn → đúng loại ngoại lệ, đơn không đổi.
  - Body trả về đúng `{"success": true}` với HTTP 200.

### T3.7 Hết hạn và khách hủy
- Route cron `expire-orders` (kiểm `CRON_SECRET`), expire tại chỗ khi poll; khách hủy đơn chờ thanh toán.
- Nghiệm thu: sau hết hạn kho giữ, điểm giữ, suất flash sale được trả đúng; chạy job 2 lần không trả 2 lần.

### T3.8 Đối soát và thử lại
- `reconcile-payments` (SePay API v2, `since_id`, phân trang, ≤ 3 request/giây), `retry-bank-tx`.
- Nghiệm thu: với mock HTTP, giao dịch đã có qua webhook không bị xử lý lại; giao dịch webhook bị mất được đối soát bổ sung và khớp đơn.

### T3.9 Màn quản lý thanh toán cho admin
- `/admin/thanh-toan`: danh sách giao dịch, lọc ngoại lệ; xử lý theo BUSINESS_RULES 5.5 (step-up, ghi chú bắt buộc).
- Cảnh báo cho chủ shop qua `NotifierPort` khi có ngoại lệ.
- Nghiệm thu: gắn giao dịch có tổng khác `total` → từ chối; xác nhận đơn EXPIRED khi hết kho → từ chối; mọi xử lý có audit.

### T3.10 E2E luồng mua hàng
- Playwright: khách vãng lai giao tận nơi; hội viên lấy tại quầy có dùng điểm; đơn hết hạn; thanh toán sai số tiền. Webhook giả lập bằng request có chữ ký hợp lệ từ test runner (chỉ môi trường test).

### T3.11 Chạy thử với SePay Test mode
- Script `pnpm tunnel` mở tunnel miễn phí (ví dụ Cloudflare quick tunnel, cần duyệt công cụ) tới máy local để SePay Test mode gọi được webhook.
- `.env.local` dùng `PAYMENT_PROVIDER=sepay`, secret và API token sandbox; hướng dẫn cấu hình từng bước trong `docs/DEV_SEPAY_TEST.md`.
- Nghiệm thu: giao dịch giả lập trên SePay Test mode làm đơn local chuyển PAID; đối soát gọi đúng API sandbox.

⛳ **Cổng duyệt 2**: chủ dự án đặt thử trên máy local (hoặc staging Supabase Free) với SePay Test mode, xem từng trường hợp: đúng tiền, sai tiền, quá hạn, gửi lại webhook.

---

## Giai đoạn 4: Vận hành đơn

### T4.1 Bảng đơn cho nhân viên
- `/admin/don-hang`: tab theo trạng thái, tìm theo mã; chi tiết đơn; nhận/trả đơn; checklist từng món; chuyển `READY_*`, `OUT_FOR_DELIVERY`, `DELIVERY_FAILED` (lý do); link Google Maps; SĐT khách chỉ hiện khi đơn đang xử lý.
- Tham khảo UI: `admin/orders/page.tsx`.
- Nghiệm thu: chuyển trạng thái sai thứ tự → lỗi; hai nhân viên cùng nhận một đơn → một người thành công.

### T4.2 Bàn giao
- Sinh nonce khi PAID; hàm tính token/PIN; trang đơn của khách hiện QR + PIN đúng trạng thái.
- Màn quét: camera (API `BarcodeDetector` nếu có, nếu không dùng thư viện đã duyệt) + nhập mã đơn + PIN; khóa sau 5 lần sai; admin mở khóa.
- Hoàn tất → `COMPLETED` + `earn` điểm + cập nhật `lifetime_spent`, hạng.
- Tham khảo UI: `QRScannerModal.tsx` (bỏ danh sách quét nhanh).
- Nghiệm thu: đơn chưa `READY_*`/`OUT_FOR_DELIVERY` không bàn giao được; không API nào của staff trả token/PIN; PIN sai 5 lần → khóa + cảnh báo.

### T4.3 Hủy đơn đã thanh toán và hoàn tiền
- Admin hủy (step-up, lý do), nhập lại kho, trả điểm; màn `/admin/hoan-tien` ghi nhận và hoàn tất hoàn tiền; hoàn một phần cho đơn đã xong.
- Nghiệm thu: tổng hoàn > đã trả → từ chối; hoàn sau hoàn tất thu hồi điểm đúng công thức.

### T4.4 Tài khoản khách
- `/tai-khoan` theo UI_SPEC mục 4.10: thông tin, thẻ hạng + tiến độ lên hạng, lịch sử điểm, đơn hàng (tab lọc), chi tiết đơn, nút "Mua lại" (thêm lại các món còn bán vào giỏ, báo món đã hết/ngừng bán).
- Trang `/thanh-vien` theo UI_SPEC mục 4.11.
- Tham khảo UI: `member/page.tsx`.
- Nghiệm thu: chỉ thấy đơn của mình (test IDOR); số điểm khớp ledger.

### T4.5 Thông báo cho chủ shop
- `NotifierPort` (Telegram hoặc kênh chủ dự án chọn): ngoại lệ thanh toán, đơn PAID chờ lâu, cron lỗi, chữ ký webhook sai nhiều; job `daily-digest`.
- Nghiệm thu: thông báo không chứa SĐT đầy đủ hay địa chỉ.

---

## Giai đoạn 5: Tích điểm và quản lý khách

### T5.1 Cài đặt tích điểm
- `/admin/cai-dat/tich-diem`: giá trị điểm, tỷ lệ dùng tối đa, hạng (ngưỡng, % tích, quyền lợi). Step-up khi lưu. Thay đổi không ảnh hưởng đơn đã đặt.
- Tham khảo UI: `admin/settings/loyalty/page.tsx`.
- Nghiệm thu: lưu tạo `version` mới + audit; đơn đang chờ vẫn dùng tham số lúc đặt.

### T5.2 Quản lý khách hàng
- `/admin/khach-hang`: danh sách, lọc theo hạng/trạng thái, chi tiết (đơn, điểm), khóa/mở khóa (lý do), điều chỉnh điểm (lý do; > 100 điểm cần step-up).
- Tham khảo UI: tab khách hàng trong `admin/accounts/page.tsx`.
- Nghiệm thu: khóa khách thì phiên hiện tại bị chặn ở request kế tiếp; mọi điều chỉnh có audit.

---

## Giai đoạn 6: Báo cáo và phân tích

### T6.1 Dashboard
- Doanh thu hôm nay/7 ngày, số đơn theo trạng thái, giao dịch ngoại lệ chưa xử lý, sản phẩm sắp hết, đơn chờ đóng gói quá lâu.

### T6.2 Báo cáo
- Doanh thu theo ngày/tuần/tháng (theo `paid_at`, giờ Việt Nam, trừ hoàn tiền), top sản phẩm, tỷ trọng danh mục, giá trị đơn trung bình, tỷ lệ khách quay lại, thời gian đóng gói/giao hàng, tỷ lệ đơn hết hạn không thanh toán.
- Xuất CSV (chỉ admin, audit, thoát công thức).
- Nghiệm thu: số liệu khớp với truy vấn đối chiếu trên dữ liệu seed.

### T6.3 Phân tích hành vi (có đồng ý)
- Banner đồng ý; endpoint ghi sự kiện theo lô, rate limit, bỏ qua dữ liệu không hợp lệ; chỉ gắn `customer_id` khi đồng ý.
- Báo cáo: sản phẩm xem nhiều, xem lâu, từ khóa tìm kiếm (đặc biệt từ khóa không có kết quả), tỷ lệ thêm giỏ/xem.
- Tham khảo: các chỉ số trong `useAnalyticsStore.ts` cũ.
- Nghiệm thu: không đồng ý thì không có `customer_id`; job xóa sự kiện > 12 tháng.

### T6.4 Xem nhật ký audit
- `/admin/nhat-ky`: lọc theo người, hành động, đối tượng, thời gian.

---

## Giai đoạn 7: Hoàn thiện và mở bán

### T7.1 Pháp lý và quyền riêng tư
- Trang chính sách (nội dung do chủ dự án cung cấp), footer thông tin doanh nghiệp, yêu cầu xóa tài khoản.

### T7.2 Hiệu năng và SEO
- Đạt toàn bộ tiêu chí UI_SPEC mục 9 (Lighthouse, CLS/LCP, ảnh so sánh 390px và 1280px, không cuộn ngang ở 360px).

### T7.3 Rà soát bảo mật
- Đi hết SECURITY mục 3 và 5; sửa mọi phát hiện; `pnpm audit` sạch mức high.

### T7.4 Tổng duyệt trên staging
- Chạy toàn bộ kịch bản với SePay Test mode; diễn tập khôi phục backup; đọc lại runbook.

### T7.5 Dựng production
- Vercel project + domain + env; Supabase production (Pro, Singapore); cấu hình Auth; webhook SePay live (HMAC); mã thanh toán; SMS brandname; tạo admin + MFA; seed cài đặt; Sentry, uptime, cảnh báo.
- Thử thật: đặt một đơn nhỏ, chuyển khoản thật, xác nhận tự động, bàn giao, rồi thử luồng hoàn tiền.

⛳ **Cổng duyệt 3**: chủ dự án ký checklist SECURITY mục 5 trước khi công bố website.

### T7.6 Tuần đầu vận hành
- Theo dõi hằng ngày: ngoại lệ thanh toán, lỗi Sentry, thời gian đóng gói, phản hồi khách. Ghi lại vấn đề vào backlog.

---

## Giai đoạn 8: Sau mở bán (backlog, lên kế hoạch chi tiết sau)

- Mã giảm giá / voucher
- Phí ship theo km (kèm geocoding phía server)
- Thông báo cho khách qua SMS/Zalo ZNS (outbox)
- Khách vãng lai tra cứu đơn bằng SĐT + mã đơn + OTP
- Đa kho: `NearestWarehouseWithFullStockStrategy`, UI quản lý kho, nhân viên theo kho
- Kết nối phần mềm bán hàng tại quầy (nếu sau này dùng chung kho)
- Hóa đơn điện tử
- Đánh giá sản phẩm
- "Báo khi có hàng" cho sản phẩm hết hàng
- Thông báo đẩy (web push) cho PWA
- App điện thoại native (chỉ khi có nhu cầu rõ ràng; cần thêm API `/api/v1` dùng token, xem ghi chú trong `docs/README.md`)
- Giao diện theo mùa lễ hội
