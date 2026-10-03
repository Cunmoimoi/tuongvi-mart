# Tường Vi Mart: quy tắc làm việc cho Claude Code

Website bán tạp hóa online. Khách thanh toán 100% bằng chuyển khoản VietQR, xác nhận tự động qua SePay.
Ưu tiên số 1 của dự án là an toàn tiền và dữ liệu khách. Khi tốc độ và an toàn mâu thuẫn, chọn an toàn.

## Đọc gì trước khi làm

- Mỗi phiên làm việc chỉ làm một task trong `docs/ROADMAP.md`. Đọc kỹ task đó trước khi viết code.
- Đọc `docs/PROGRESS.md` để biết task nào đã xong, đang dở.
- Đọc thêm tài liệu liên quan tới task:
  - `docs/ARCHITECTURE.md`: kiến trúc, cấu trúc thư mục, hạ tầng, biến môi trường
  - `docs/DATA_MODEL.md`: bảng, ràng buộc, index, quyền database
  - `docs/BUSINESS_RULES.md`: giá, phí ship, điểm, trạng thái đơn, khớp thanh toán, bàn giao
  - `docs/SECURITY.md`: mô hình đe dọa, kiểm soát bảo mật, checklist
  - `docs/UI_SPEC.md`: design tokens, bố cục từng trang (desktop + mobile), component, PWA
  - `docs/reference/kfm-desktop/`: ảnh tham chiếu bố cục desktop (1 px ảnh ≈ 1 CSS px). Không commit, không dùng ảnh này trong sản phẩm.
- Code cũ nằm ở `../tuongvi-legacy/` (ngoài repo). Chỉ được đọc để tham khảo giao diện (JSX + class Tailwind).
  KHÔNG copy store, service, middleware, schema SQL, logic đăng nhập, dữ liệu mẫu hay tài khoản mẫu từ code cũ.

## Stack (không tự ý thay đổi)

- Next.js App Router, React 19, TypeScript `strict`, Tailwind CSS, pnpm
- Zustand: CHỈ cho trạng thái giao diện (giỏ hàng tạm, modal, bộ lọc). Không chứa dữ liệu nghiệp vụ có thẩm quyền.
- Zod: kiểm tra mọi dữ liệu đầu vào ở biên server
- PostgreSQL trên Supabase, truy cập bằng Drizzle ORM + postgres-js, chỉ từ server
- Supabase Auth (khách: SĐT + mật khẩu; nhân viên: username + mật khẩu; admin bắt buộc TOTP MFA)
- Supabase Storage cho ảnh sản phẩm
- SePay (webhook HMAC-SHA256 + API đối soát), VietQR tạo tại server
- Vitest (unit + integration với Postgres thật), Playwright (E2E), Sentry
- Deploy: Vercel (Pro), Supabase (Pro, region Singapore)

## Lệnh

- `pnpm dev`: chạy local (cần `pnpm db:start` trước)
- `pnpm db:start` / `pnpm db:stop`: bật và tắt Supabase local trong Docker
- `pnpm db:setup:local`: đặt mật khẩu role `app_runtime` trên database local (chỉ chạy khi `APP_ENV=local`)
- `pnpm check`: lint + typecheck + unit test. BẮT BUỘC chạy trước khi báo xong task.
- `pnpm test:int`: test tích hợp với database local
- `pnpm test:http`: test header bảo mật bằng cách gọi HTTP vào server `next start` thật (cần `pnpm build` trước, không nằm trong `pnpm check`)
- `pnpm test:e2e`: Playwright
- `pnpm db:generate` / `pnpm db:migrate`: tạo và áp dụng migration Drizzle
- `pnpm db:seed:local`: dữ liệu mẫu CHỈ cho local (script trong `scripts/`, từ chối chạy nếu `APP_ENV=production`)

## Bất biến bảo mật (KHÔNG BAO GIỜ vi phạm)

1. Trình duyệt không bao giờ quyết định giá, tổng tiền, giảm giá, số điểm, tồn kho, trạng thái đơn hay quyền hạn.
   Server luôn tự tính lại từ database, bỏ qua mọi con số client gửi lên (trừ `expectedTotal` dùng để phát hiện giá thay đổi).
2. Mọi Server Action và Route Handler tự làm đủ 3 bước: xác thực phiên, kiểm tra quyền, kiểm tra input bằng Zod.
   `middleware.ts` KHÔNG phải ranh giới bảo mật, chỉ dùng cho CSP nonce, làm mới cookie phiên và điều hướng giao diện.
3. Chỉ luồng thanh toán đã xác thực (webhook SePay có chữ ký hợp lệ, hoặc job đối soát gọi API SePay) được chuyển đơn sang PAID.
   Ngoại lệ duy nhất: admin xử lý giao dịch ngoại lệ, yêu cầu MFA step-up và ghi audit log. Không tạo nút, route hay hàm "giả lập thanh toán" nào trong code chạy production.
4. Tiền là số nguyên VND. Không dùng số thực cho tiền. Tỷ lệ phần trăm lưu dạng basis points (100 = 1%).
5. Chỉ đổi trạng thái đơn qua `orders/state-machine.ts`, trong transaction, bằng UPDATE có điều kiện trạng thái cũ (`WHERE status = $from`).
6. Mọi file trong `src/server/` bắt đầu bằng `import "server-only"`. Secret không bao giờ nằm trong biến `NEXT_PUBLIC_*`, không log, không trả về client.
7. Mock/adapter giả chỉ được nạp khi `APP_ENV` là `local` hoặc `test`. `src/server/env.ts` phải làm ứng dụng dừng khởi động nếu production cấu hình mock hoặc thiếu secret.
8. Không có tài khoản cứng, mật khẩu mặc định, mã OTP vạn năng, "backdoor" hay lối tắt thử nghiệm trong code ứng dụng. Admin đầu tiên tạo bằng `scripts/create-admin.ts`.
9. Xem đơn hàng chỉ bằng phiên của chủ đơn hoặc view token ngẫu nhiên. Không bao giờ dùng mã đơn, SĐT hay ID đoán được làm quyền truy cập.
10. Hoàn tất bàn giao cần token/PIN bí mật từ khách. Giao diện nhân viên không bao giờ hiển thị token/PIN bàn giao.
11. Mọi thao tác ghi của admin/staff và mọi sự kiện bảo mật đều ghi `audit_logs` (bảng chỉ INSERT).
12. Không dùng `dangerouslySetInnerHTML` (ngoại lệ: JSON-LD qua hàm serialize an toàn đã có test). Không cho upload SVG.
13. Truy vấn database chỉ qua Drizzle trong `repo.ts`. Không nối chuỗi SQL. SQL thô (template `` sql`...` `` của Drizzle) chỉ dùng với tham số, không nối chuỗi.
14. Log không chứa mật khẩu, token, OTP, secret; SĐT phải che (`090****567`); không log nguyên body webhook ra console.
15. Số tài khoản nhận tiền chỉ lấy từ biến môi trường server, không cho sửa qua giao diện admin.
16. Rate limit cho: đăng nhập, gửi OTP, checkout, tra trạng thái đơn, nhập PIN bàn giao, webhook (mức nới lỏng).
17. So sánh chữ ký, token, PIN bằng `crypto.timingSafeEqual` (qua helper `safeEqual`). Token sinh bằng `crypto.randomBytes`/`randomInt`, không dùng `Math.random`.
18. Không đọc, không in, không sao chép nội dung bất kỳ file `.env*` nào, kể cả trong `../tuongvi-legacy`. Chỉ được kiểm tra xem file có tồn tại hay không.

## Quy ước code

- Phân lớp bắt buộc: `app/` (UI, action) → `server/modules/*/service.ts` (nghiệp vụ) → `repo.ts` (database).
  UI không import repo. Service không import từ `app/`.
- Logic tính tiền, điểm, phí ship, chọn kho, máy trạng thái viết thành hàm thuần (pure function) và có unit test.
- Lỗi nghiệp vụ dùng `AppError(code, httpStatus)`; thông điệp tiếng Việt cho người dùng lấy từ bảng `errors.ts`, không lộ chi tiết nội bộ.
- Thời gian lưu `timestamptz` (UTC), hiển thị theo `Asia/Ho_Chi_Minh`. Dùng `server/lib/clock.ts` để test được.
- Server Component là mặc định. Chỉ thêm `"use client"` khi cần tương tác.
- Giao diện: một codebase responsive, mobile-first, theo `docs/UI_SPEC.md`. Không tạo bản mobile/desktop riêng, không phân nhánh theo user-agent. Không dùng logo, ảnh, màu nhận diện hay câu chữ của thương hiệu khác.
- Tên route tiếng Việt không dấu (`/san-pham/[slug]`); tên biến, hàm, commit bằng tiếng Anh; chữ trên giao diện bằng tiếng Việt.
- Không dùng `any`. Không tắt rule ESLint trừ khi có comment giải thích.

## Cách làm việc

- Tạo nhánh `task/<mã-task>-<mô-tả-ngắn>` cho mỗi task.
- Khi kết thúc task, cập nhật `docs/PROGRESS.md` trong cùng PR.
- Với logic tiền, kho, điểm, trạng thái, bảo mật: viết test trước, rồi mới viết code.
- Một task chỉ xong khi đạt TẤT CẢ tiêu chí "Nghiệm thu" trong ROADMAP và `pnpm check` + `pnpm test:int` đều xanh.
- Kết thúc task, báo cáo ngắn: đã làm gì, test nào chứng minh, việc còn lại, rủi ro phát hiện thêm.
- Không tự thêm dependency. Nếu cần, nêu tên, lý do, mức độ bảo trì của gói, phương án thay thế, rồi chờ đồng ý.
- Không sửa migration đã áp dụng; luôn tạo migration mới.
- Nghiệp vụ chưa rõ: DỪNG, hỏi chủ dự án, ghi câu hỏi vào mục "Câu hỏi mở" của `docs/README.md`. Không tự đoán quy tắc liên quan tới tiền.
- Khi thay đổi thiết kế so với tài liệu: cập nhật tài liệu tương ứng và ghi vào "Nhật ký quyết định" trong `docs/README.md`.
- Tra tài liệu chính thức (Next.js, Supabase, SePay, Drizzle) khi dùng API mà không chắc chắn; không đoán tên hàm.
