# Tiến độ dự án

Cập nhật file này trong cùng PR khi kết thúc mỗi task. Chi tiết từng task nằm ở `docs/ROADMAP.md`.

## Giai đoạn 0

| Mã   | Tên                          | Trạng thái | PR  | Ghi chú                                                      |
| ---- | ---------------------------- | ---------- | --- | ------------------------------------------------------------ |
| T0.1 | Khởi tạo project             | Đã merge   | #1  |                                                              |
| T0.2 | Cấu hình môi trường an toàn  | Đã merge   | #2  | `src/server/env.ts`                                          |
| T0.3 | Database và migration nền    | Đã merge   | #3  | Xem "Quyết định đã chốt"                                     |
| T0.4 | Thư viện lõi phía server     | Chưa làm   |     |                                                              |
| T0.5 | Middleware và headers bảo mật | Chưa làm  |     |                                                              |
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

## Việc treo

- `minimum_password_length = 8` trong `supabase/config.toml` (mặc định của CLI là 6): làm ở T1.2.
- Cách đặt mật khẩu role `app_runtime` cho CI: chốt ở T0.7.
- Câu hỏi mở Q1–Q14 trong mục "Câu hỏi mở" của `docs/README.md`; Q5 (ngân hàng) bắt buộc trước giai đoạn 3, Q6 (SMS OTP) bắt buộc trước khi mở bán.
