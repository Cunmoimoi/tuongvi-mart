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

## Bảo mật máy phát triển

### Supabase CLI mở cổng ra cả mạng nội bộ

Supabase CLI publish các cổng 54321–54327 vào `0.0.0.0` (mọi địa chỉ), không phải chỉ
`127.0.0.1`. Nghĩa là mặc định, bất kỳ máy nào trong cùng mạng Wi-Fi hay LAN đều kết nối
được tới Postgres ở cổng 54322 và Studio ở cổng 54323. `config.toml` không có tùy chọn đổi
địa chỉ gắn, và khởi động lại bằng `pnpm db:stop` rồi `pnpm db:start` cũng không đổi được.

**Đã xử lý trên máy phát triển bằng luật tường lửa Windows** chặn mọi kết nối inbound tới
TCP 54321–54327:

```
New-NetFirewallRule -DisplayName "Chan Supabase local tu mang" -Direction Inbound -Protocol TCP -LocalPort 54321-54327 -Action Block -Profile Any
```

Luật này chỉ chặn kết nối **từ máy khác vào**; chính máy đang chạy Docker vẫn truy cập
bình thường, và luật chặn thắng luật cho phép Docker.

Lưu ý khi kiểm tra: cách này chặn ở tầng Windows chứ không đổi cách gắn cổng, nên
`docker ps` **vẫn** hiện `0.0.0.0:54322->5432/tcp`. Đừng dùng `docker ps` để kết luận đã
chặn hay chưa. Kiểm tra đúng chỗ bằng:

```
Get-NetFirewallRule -DisplayName "Chan Supabase local tu mang" | Select-Object Direction, Action, Enabled
```

Gỡ luật khi cần: `Remove-NetFirewallRule -DisplayName "Chan Supabase local tu mang"`.

Cách thay thế (chưa dùng): trong Docker Desktop, Settings → Docker Engine, thêm
`"ip": "127.0.0.1"` vào JSON rồi Apply & restart. Cách này đổi thật cách gắn cổng cho mọi
container, nên `docker ps` sẽ hiện `127.0.0.1:54322->5432/tcp`.

Khi dựng máy phát triển mới, phải làm lại một trong hai cách trên — đây là cấu hình máy,
không nằm trong repo.

### Khi dùng Wi-Fi công cộng

Chạy `pnpm db:stop` trước khi nối vào Wi-Fi quán cà phê, sân bay, khách sạn hay mạng lạ
nói chung. Ở nhà sau router thì rủi ro thấp, nhưng trên mạng công cộng thì database đang
mở là mở cho mọi người cùng mạng.

### Mật khẩu mặc định của Supabase local

Supabase local luôn dùng `postgres/postgres` cho role `postgres`, cùng với anon key,
service key và JWT secret cố định mà ai cũng biết. Đây là giá trị demo dùng chung cho mọi
project Supabase local, **chỉ an toàn trên máy dev**. Không bao giờ dùng lại chúng ở
staging hay production, và không coi database local là chỗ chứa dữ liệu thật của khách.

## Lệnh hay dùng

| Lệnh             | Việc gì                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------ |
| `pnpm dev`       | Chạy server phát triển                                                                     |
| `pnpm build`     | Build production                                                                           |
| `pnpm check`     | Lint + kiểm tra kiểu dữ liệu + unit test. Bắt buộc chạy xanh trước khi báo xong một task.  |
| `pnpm lint`      | Chỉ chạy ESLint                                                                            |
| `pnpm typecheck` | Chỉ chạy kiểm tra kiểu dữ liệu TypeScript                                                  |
| `pnpm test`      | Chỉ chạy unit test (Vitest)                                                                |
| `pnpm test:int`  | Test tích hợp với Postgres local. Từ chối chạy nếu không chắc đang trỏ vào database local. |
| `pnpm test:http` | Test header bảo mật trên server build thật. Chạy `pnpm build` trước.                       |
| `pnpm format`    | Định dạng lại code bằng Prettier                                                           |

| Lệnh database         | Việc gì                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `pnpm db:start`       | Bật Supabase local trong Docker                                           |
| `pnpm db:stop`        | Tắt Supabase local                                                        |
| `pnpm db:migrate`     | Áp dụng migration Drizzle bằng `DATABASE_MIGRATION_URL`                   |
| `pnpm db:generate`    | Sinh migration mới từ schema Drizzle                                      |
| `pnpm db:setup:local` | Đặt mật khẩu role `app_runtime` trên database local (chỉ `APP_ENV=local`) |

`pnpm test:int` và `pnpm db:setup:local` đều dừng lại nếu `APP_ENV` không phải `local`/`test`
hoặc nếu chuỗi kết nối không trỏ tới `localhost`/`127.0.0.1`. Test tích hợp tạo rồi xóa bảng
thật trong schema `app`, nên guard này ngăn chúng chạm vào database thật.

Các lệnh khác (E2E, seed dữ liệu mẫu...) sẽ có khi các task tương ứng trong
`docs/ROADMAP.md` hoàn thành; xem danh sách đầy đủ trong `CLAUDE.md` mục "Lệnh".
