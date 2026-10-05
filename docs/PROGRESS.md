# Tiến độ dự án

Cập nhật file này trong cùng PR khi kết thúc mỗi task. Chi tiết từng task nằm ở `docs/ROADMAP.md`.

## Giai đoạn 0

| Mã   | Tên                          | Trạng thái | PR  | Ghi chú                                                      |
| ---- | ---------------------------- | ---------- | --- | ------------------------------------------------------------ |
| T0.1 | Khởi tạo project             | Đã merge   | #1  |                                                              |
| T0.2 | Cấu hình môi trường an toàn  | Đã merge   | #2  | `src/server/env.ts`                                          |
| T0.3 | Database và migration nền    | Đã merge   | #3  | Xem "Quyết định đã chốt"                                     |
| T0.4 | Thư viện lõi phía server     | Đã merge   | #7  | `src/server/lib/*`, migration `0001_rate_limits`; xem "Quyết định đã chốt (T0.4)" |
| T0.5 | Middleware và headers bảo mật | Chờ merge  | #8  | `src/middleware.ts`, `src/server/security/headers.ts`; xem "Quyết định đã chốt (T0.5)" |
| T0.6 | Audit log                    | Chưa làm   |     |                                                              |
| T0.7 | CI                           | Chưa làm   |     | Cần chốt cách đặt mật khẩu `app_runtime` cho CI              |
| T0.8 | Bộ component giao diện       | Chưa làm   |     |                                                              |
| T0.9 | Khung adapter (Switchboard)  | Chưa làm   |     |                                                              |

Ngoài roadmap:

| Việc                         | Trạng thái | PR  | Ghi chú                                             |
| ---------------------------- | ---------- | --- | --------------------------------------------------- |
| README bảo mật máy dev       | Đã merge   | #4  | Mục "Bảo mật máy phát triển" trong README           |
| Sửa lỗi xuống dòng (LF)      | Đã merge   | #5  | `.gitattributes`, `.editorconfig`, Prettier `endOfLine: "lf"`; `pnpm format:check` xanh trên Windows |

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

- Header bảo mật dựng bằng hàm thuần `src/server/security/headers.ts`; `src/middleware.ts` chỉ nối `env` vào và gắn header lên cả request (để Next.js lấy nonce) lẫn response. Chi tiết CSP ở N23.
- Mọi trang render động (root layout `await connection()`) vì nonce; HTML không còn được CDN cache (N24).
- `env.ts` coi chuỗi rỗng là chưa đặt (N25): sửa lỗi tiềm ẩn từ T0.2 làm middleware trả 500 với `.env.local` có biến để trống.
- Giữ tên `middleware.ts` dù Next.js 16 đã deprecate (N26).
- Test: `src/server/security/headers.test.ts`, `src/middleware.test.ts` (trong `pnpm check`) và `pnpm test:http` (khởi động `next start` thật cho local/staging/production; cần `pnpm build` trước nên nằm ngoài `pnpm check`).
- Làm mới phiên Supabase chuyển sang T1.1 (chỗ để sẵn `TODO(T1.1)` trong `src/middleware.ts`).

## Việc treo

- T0.7 (CI): chạy `pnpm build` rồi `pnpm test:http` sau bước build.
- Đổi `src/middleware.ts` thành `src/proxy.ts` (N26), trước khi nâng Next.js lên bản chính kế tiếp.
- `Referrer-Policy: no-referrer` cho trang có token trên URL: làm cùng trang đơn hàng.
- Thêm Supabase vào `connect-src` khi làm upload ảnh bằng signed URL; thêm domain tile OSM vào `img-src` ở T1.4.
- Test header trên trang admin: thêm khi có `/admin/dang-nhap` (T1.5).
- `/_next/static` và `favicon.ico` không đi qua middleware nên không có `X-Content-Type-Options`; nếu cần phủ cả file tĩnh thì thêm `headers()` trong `next.config.ts`.
- `next dev` (Next.js 16.3) tự chèn một khối "agent rules" vào cuối `CLAUDE.md` mỗi lần chạy `pnpm dev`; muốn tắt thì đặt `agentRules: false` trong `next.config.ts`.

- Cron `cleanup` xóa dòng cũ của `rate_limits` chưa có (làm cùng các job cron ở giai đoạn sau); bảng tăng dần cho tới lúc đó.
- Câu hỏi mở Q15: cửa sổ "theo ngày" của giới hạn OTP đếm lại lúc 0h giờ Việt Nam hay 7h (UTC).

- `minimum_password_length = 8` trong `supabase/config.toml` (mặc định của CLI là 6): làm ở T1.2.
- Cách đặt mật khẩu role `app_runtime` cho CI: chốt ở T0.7.
- Câu hỏi mở Q1–Q14 trong mục "Câu hỏi mở" của `docs/README.md`; Q5 (ngân hàng) bắt buộc trước giai đoạn 3, Q6 (SMS OTP) bắt buộc trước khi mở bán.
