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

3. Khởi động Supabase local (cần Docker Desktop đang chạy):

   ```
   supabase start
   ```

4. Chạy server dev:

   ```
   pnpm dev
   ```

   Mở http://localhost:3000.

## Lệnh hay dùng

| Lệnh             | Việc gì                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `pnpm dev`       | Chạy server phát triển                                                                    |
| `pnpm build`     | Build production                                                                          |
| `pnpm check`     | Lint + kiểm tra kiểu dữ liệu + unit test. Bắt buộc chạy xanh trước khi báo xong một task. |
| `pnpm lint`      | Chỉ chạy ESLint                                                                           |
| `pnpm typecheck` | Chỉ chạy kiểm tra kiểu dữ liệu TypeScript                                                 |
| `pnpm test`      | Chỉ chạy unit test (Vitest)                                                               |
| `pnpm format`    | Định dạng lại code bằng Prettier                                                          |

Các lệnh khác (test tích hợp, E2E, migration, seed dữ liệu mẫu...) sẽ có khi các task tương
ứng trong `docs/ROADMAP.md` hoàn thành; xem danh sách đầy đủ trong `CLAUDE.md` mục "Lệnh".
