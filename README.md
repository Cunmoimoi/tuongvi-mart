# Tường Vi Mart

Website bán tạp hóa online. Quy tắc làm việc cho Claude Code nằm ở [CLAUDE.md](CLAUDE.md);
tài liệu dự án đầy đủ nằm ở [docs/](docs/) (bắt đầu từ [docs/README.md](docs/README.md)).

## Chạy local

Yêu cầu: Node.js LTS, pnpm, Docker Desktop (cho Supabase local).

1. Cài dependency:

   ```
   pnpm install
   ```

2. Tạo file biến môi trường từ mẫu, rồi điền giá trị cho môi trường local
   (xem diễn giải từng biến ở `docs/ARCHITECTURE.md` mục 10):

   ```
   cp .env.example .env.local
   ```

   Riêng phần database, điền như sau (Supabase local luôn dùng cổng 54322):

   ```
   DATABASE_URL=postgresql://app_runtime:<mật-khẩu-bạn-tự-chọn>@127.0.0.1:54322/postgres
   DATABASE_MIGRATION_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   ```

   Mật khẩu tự chọn cần ít nhất 12 ký tự và chỉ dùng chữ, số, `_`, `.`, `~`, `-`.
   Nó chỉ tồn tại trên máy bạn; không có mật khẩu nào nằm trong file được commit.

3. Khởi động database local (cần Docker Desktop đang chạy):

   ```
   pnpm db:start
   ```

4. Tạo schema và phân quyền, rồi đặt mật khẩu cho role `app_runtime`:

   ```
   pnpm db:migrate
   ```

   ```
   pnpm db:setup:local
   ```

   `pnpm db:migrate` chỉ tạo schema, role và phân quyền — cố ý không chứa mật khẩu nào.
   `pnpm db:setup:local` lấy mật khẩu từ `DATABASE_URL` trong `.env.local` và chỉ chạy khi
   `APP_ENV=local`. Sau khi chạy `supabase db reset` (xóa sạch database), phải chạy lại
   cả hai lệnh này.

5. Chạy server dev:

   ```
   pnpm dev
   ```

   Mở http://localhost:3000.

Tắt database local khi không dùng nữa:

```
pnpm db:stop
```

## Lệnh hay dùng

| Lệnh             | Việc gì                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `pnpm dev`       | Chạy server phát triển                                                                    |
| `pnpm build`     | Build production                                                                          |
| `pnpm check`     | Lint + kiểm tra kiểu dữ liệu + unit test. Bắt buộc chạy xanh trước khi báo xong một task. |
| `pnpm lint`      | Chỉ chạy ESLint                                                                           |
| `pnpm typecheck` | Chỉ chạy kiểm tra kiểu dữ liệu TypeScript                                                 |
| `pnpm test`      | Chỉ chạy unit test (Vitest)                                                               |
| `pnpm test:int`  | Test tích hợp với Postgres local. Từ chối chạy nếu không chắc đang trỏ vào database local. |
| `pnpm format`    | Định dạng lại code bằng Prettier                                                          |

| Lệnh database          | Việc gì                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `pnpm db:start`        | Bật Supabase local trong Docker                                          |
| `pnpm db:stop`         | Tắt Supabase local                                                       |
| `pnpm db:migrate`      | Áp dụng migration Drizzle bằng `DATABASE_MIGRATION_URL`                  |
| `pnpm db:generate`     | Sinh migration mới từ schema Drizzle                                     |
| `pnpm db:setup:local`  | Đặt mật khẩu role `app_runtime` trên database local (chỉ `APP_ENV=local`) |

`pnpm test:int` và `pnpm db:setup:local` đều dừng lại nếu `APP_ENV` không phải `local`/`test`
hoặc nếu chuỗi kết nối không trỏ tới `localhost`/`127.0.0.1`. Test tích hợp tạo rồi xóa bảng
thật trong schema `app`, nên guard này ngăn chúng chạm vào database thật.

Các lệnh khác (E2E, seed dữ liệu mẫu...) sẽ có khi các task tương ứng trong
`docs/ROADMAP.md` hoàn thành; xem danh sách đầy đủ trong `CLAUDE.md` mục "Lệnh".
