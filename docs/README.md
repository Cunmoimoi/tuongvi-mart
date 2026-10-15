# Hướng dẫn cho chủ dự án

## 1. Bộ tài liệu gồm những gì

| File | Dành cho | Nội dung |
|---|---|---|
| `CLAUDE.md` (thư mục gốc) | Claude Code (tự đọc mỗi phiên) | Quy tắc bắt buộc, bất biến bảo mật, lệnh, cách làm việc |
| `docs/ARCHITECTURE.md` | Claude Code + bạn | Hạ tầng, sơ đồ, cấu trúc thư mục, đăng nhập, luồng thanh toán |
| `docs/DATA_MODEL.md` | Claude Code | Bảng dữ liệu, ràng buộc, quyền database |
| `docs/BUSINESS_RULES.md` | Claude Code + bạn | Quy tắc bán hàng: giá, phí giao hàng, điểm, trạng thái đơn, thanh toán, bàn giao |
| `docs/SECURITY.md` | Claude Code + bạn | Các mối đe dọa, cách chặn, test bắt buộc, xử lý sự cố, checklist mở bán |
| `docs/UI_SPEC.md` | Claude Code + bạn | Giao diện: màu, chữ, bố cục từng trang trên máy tính và điện thoại, PWA |
| `docs/reference/kfm-desktop/` | Claude Code | 15 ảnh chụp tham chiếu bố cục desktop (đã che thông tin cá nhân). Giữ trên máy, không commit lên git |
| `docs/ROADMAP.md` | Claude Code + bạn | Các giai đoạn, task, tiêu chí nghiệm thu, 3 cổng duyệt |
| `docs/README.md` | Bạn | File này: cách dùng, việc bạn cần làm, quyết định, câu hỏi mở |

Nếu bạn muốn đổi một quy tắc nghiệp vụ, hãy sửa `BUSINESS_RULES.md` trước (hoặc bảo Claude Code sửa), rồi mới yêu cầu sửa code.

## 2. Cách làm việc với Claude Code

1. Tạo repo GitHub riêng tư mới, ví dụ `tuongvi-mart`. Chép `CLAUDE.md` và thư mục `docs/` vào.
2. Giải nén code cũ vào thư mục nằm cạnh repo: `../tuongvi-legacy/`. Không chép code cũ vào trong repo mới.
3. Mở Claude Code trong thư mục repo mới. Mỗi phiên giao một task, ví dụ:

   > Làm task T0.1 trong docs/ROADMAP.md. Đọc CLAUDE.md và các tài liệu liên quan trước khi code. Làm xong thì chạy `pnpm check`, tạo PR và báo cáo theo mục "Cách làm việc".

4. Sau mỗi task: đọc báo cáo, chạy thử, rồi mới merge. Nếu báo cáo có "rủi ro phát hiện thêm" hay "câu hỏi", trả lời trước khi sang task mới.
5. Ở 3 cổng duyệt (⛳ trong ROADMAP), dừng lại và tự thử kỹ.
6. Nên nhờ một lập trình viên có kinh nghiệm xem lại PR của giai đoạn 1 (đăng nhập) và giai đoạn 3 (thanh toán), dù chỉ vài buổi. Đây là hai chỗ đáng bỏ tiền thuê người xem nhất.

## 3. Việc bạn cần làm (không phải code), theo mốc chi phí

Nguyên tắc: phát triển gần như toàn bộ trên máy của bạn với chi phí 0đ. Chỉ đăng ký dịch vụ trả phí khi sắp mở bán.

| Mốc | Chạy ở đâu | Dịch vụ thật thay bằng | Chi phí |
|---|---|---|---|
| Giai đoạn 0–2 | Máy bạn (`supabase start` + `pnpm dev`) | Supabase local thay Supabase cloud; SMS in ra terminal; CAPTCHA luôn qua; ảnh lưu trong Supabase local | 0đ |
| Giai đoạn 3 đến cổng duyệt 2 | Máy bạn + tunnel miễn phí để SePay gọi được webhook | SePay Test mode (giao dịch giả lập, không cần liên kết ngân hàng thật) | 0đ (kiểm tra lại điều kiện Test mode khi đăng ký) |
| Giai đoạn 4–6 | Máy bạn; có thể thêm 1 project Supabase Free làm staging | Như trên | 0đ |
| 1–2 tháng trước mở bán | | Đăng ký các dịch vụ có thời gian chờ | Bắt đầu phát sinh: tên miền, brandname SMS, tư vấn pháp lý |
| Mở bán (giai đoạn 7) | Vercel Pro + Supabase Pro, hoặc phương án khác quyết định lúc đó | SePay gói chạy thật, SMS thật | Phí hằng tháng |

Lưu ý: Supabase Free tự tạm dừng project sau một thời gian không dùng và không có backup tự động, nên chỉ dùng làm staging, không dùng cho cửa hàng thật.

### Bắt đầu ngay (miễn phí)
- [ ] Tài khoản GitHub, repo private.
- [ ] Cài trên máy: Node.js bản LTS, pnpm, Docker Desktop (Supabase local chạy trong Docker), Claude Code.

### Trước cổng duyệt 2 (vẫn miễn phí)
- [ ] SePay: tạo tài khoản, bật Test mode. Trong Test mode:
  - Cấu hình **Cấu trúc mã thanh toán**: tiền tố `TVM`, hậu tố 8 ký tự, loại "Số và chữ".
  - Tạo webhook (kiểu nội dung JSON, chỉ tiền vào, xác thực HMAC-SHA256), trỏ tới URL tunnel của máy bạn.
  - Tạo API token sandbox cho đối soát.
- [ ] (Tùy chọn) Tạo 1 project Supabase Free làm staging nếu muốn cho người khác xem thử.

### 1–2 tháng trước ngày mở bán (có chi phí hoặc thời gian chờ)
- [ ] Chọn nhà cung cấp SMS OTP trong nước và đăng ký brandname (thường mất vài tuần).
- [ ] Mua tên miền; tạo khóa Cloudflare Turnstile; tài khoản Sentry (có gói miễn phí).
- [ ] SePay chạy thật: liên kết tài khoản ngân hàng nhận tiền, cấu hình lại mã thanh toán và webhook cho môi trường Live.
- [ ] Nhờ tư vấn pháp lý/kế toán xác nhận:
  - Thủ tục thông báo website thương mại điện tử bán hàng với Bộ Công Thương (online.gov.vn) theo quy định hiện hành.
  - Chính sách quyền riêng tư và việc xin đồng ý theo quy định bảo vệ dữ liệu cá nhân (Nghị định 13/2023 và Luật Bảo vệ dữ liệu cá nhân).
  - Việc lưu dữ liệu khách ở máy chủ nước ngoài (Singapore) có cần thủ tục chuyển dữ liệu ra nước ngoài hay yêu cầu lưu tại Việt Nam không. Nếu phải lưu tại Việt Nam, kiến trúc đã có kế hoạch chuyển (ARCHITECTURE mục 2).
  - Điều kiện bán bia/rượu online (nếu có bán) và quy định không bán cho người dưới 18 tuổi.
  - Nghĩa vụ hóa đơn điện tử theo quy mô doanh thu.
- [ ] Soạn nội dung các trang: điều khoản, quyền riêng tư, đổi trả, giao hàng, thanh toán.
- [ ] Chốt nơi chạy production (xem Q14).

### Nhận diện thương hiệu (cần trước T0.8)
- [ ] Logo Tường Vi Mart (bản ngang, bản vuông cho icon app 512×512), xác nhận màu chính (mặc định xanh lá + cam).
- [ ] Ảnh banner riêng cho desktop (3,9:1) và mobile (16:9), icon danh mục (UI_SPEC mục 6). Chỉ cần ảnh gốc (JPEG/PNG/WebP, ≤ 12 MB), hệ thống tự nén. Trước khi có ảnh thật, Claude Code dùng ảnh giữ chỗ.

### Dữ liệu cửa hàng (cần trước giai đoạn 2)
- [ ] Danh sách sản phẩm: tên, danh mục, đơn vị gốc, các quy cách bán và giá, ảnh gốc (JPEG/PNG/WebP, ≤ 12 MB, hệ thống tự nén; nên chụp thật, không dùng ảnh lấy từ web khác).
- [ ] Địa chỉ và tọa độ chính xác của kho online, giờ mở cửa, hotline.

## 4. Nhật ký quyết định

| # | Quyết định | Ghi chú |
|---|---|---|
| D1 | Web chỉ bán online; dữ liệu sẵn sàng đa kho | Cập nhật: 1–3 năm tới chỉ 1 kho online riêng; sau này mỗi cửa hàng một kho + kho tổng, chọn kho theo tồn và khoảng cách |
| D2 | Phân quyền đơn giản: admin, staff, khách | Giữ nguyên |
| D3 | 100% người giao hàng nội bộ | Giữ nguyên |
| D4 | Không tách một đơn ra nhiều kho | Giữ nguyên; chọn 1 kho có đủ toàn bộ hàng |
| D5 | Không bắt nhập địa chỉ trước khi vào checkout | Giữ nguyên; địa chỉ nhập ở bước checkout, hội viên chọn từ sổ địa chỉ |
| D6 | Tiêu chuẩn bảo mật cao | Giữ nguyên |
| D7 | Có tồn kho đệm an toàn | `stock_levels.safety_stock` |
| D8 | Bảng tồn theo kho | Thay `product_stocks/DEFAULT_STORE` bằng `stock_levels(warehouse_id, product_id)` |
| N1 | Xây mới; code cũ chỉ tham khảo giao diện | |
| N2 | Vercel Pro + Supabase Pro (Singapore) | Chờ xác nhận pháp lý về nơi lưu dữ liệu |
| N3 | Khách: SĐT + mật khẩu, OTP khi đăng ký/quên. Nhân viên: username + mật khẩu. Admin: bắt buộc MFA | |
| N4 | Cho phép mua không cần tài khoản | Xem đơn bằng view token; không tự gắn đơn vào tài khoản cùng SĐT |
| N5 | Chỉ tự động xác nhận khi đúng mã, đúng số tiền, đúng tài khoản, đúng hạn | Mọi trường hợp khác vào hàng chờ admin |
| N6 | Tài khoản nhận tiền chỉ cấu hình qua biến môi trường | Admin không sửa được trên web |
| N7 | Địa chỉ 2 cấp theo đơn vị hành chính mới (34 tỉnh/thành) | |
| N8 | Mã đơn `TVM` + 8 ký tự ngẫu nhiên | Khớp cấu hình mã thanh toán SePay |
| N9 | Tồn kho theo đơn vị gốc, quy cách là bội số nguyên | Bỏ phép "chia" của code cũ |
| N10 | Cộng điểm khi đơn hoàn tất | Đề xuất, chờ bạn xác nhận (Q2) |
| N11 | Mock không bao giờ chạy ở staging/production | |
| N12 | Một website responsive (mobile-first) + PWA, chưa làm app native | App native chỉ cân nhắc sau mở bán khi có nhu cầu rõ (thông báo đẩy, tích điểm tại quầy bằng QR...). Khi đó thêm API `/api/v1` dùng token cho app; nghiệp vụ ở `src/server/modules` dùng lại nguyên vẹn |
| N13 | Desktop dựng lại bố cục kingfoodmart.com theo ảnh chụp đo đạc; mobile thiết kế riêng | Dùng nhận diện riêng của Tường Vi Mart; các khác biệt có chủ đích ghi ở UI_SPEC mục 0.1 |
| N14 | Danh mục nhiều cấp (tối đa 3), có banner và bộ sưu tập do admin quản lý | Bổ sung theo UI_SPEC mục 10 |
| N15 | Mật khẩu role `app_runtime` không nằm trong migration | Migration chỉ có cấu trúc và phân quyền. Local đặt bằng `pnpm db:setup:local` (lấy từ `.env.local`); staging/production đặt tay. Nhờ vậy không có mật khẩu nào trong git |
| N16 | Thu hồi quyền trên schema `app` cả với `service_role`, không chỉ `anon` và `authenticated` | `service_role` có `BYPASSRLS` nên RLS một mình không chặn được nó (DATA_MODEL mục 2) |
| N17 | Bảng chỉ ghi thêm (ledger) dùng hàm SQL `app.make_append_only()` thay vì viết GRANT/REVOKE tay ở từng migration | Kèm `app.enable_app_rls()` và `app.attach_updated_at()`. Quy ước và ví dụ ở DATA_MODEL mục 2.1 |
| N18 | Test quyền của `anon`/`authenticated` bằng `SET ROLE` chứ không kết nối trực tiếp | `anon` trong Supabase là `NOLOGIN`; Data API kết nối bằng `authenticator` rồi `SET ROLE`. Test mô phỏng đúng đường đó và chạy được cả ở CI. Role `app_runtime` thì test kết nối thật qua `DATABASE_URL` |
| N19 | Migration phải luôn chạy bằng cùng một role | `ALTER DEFAULT PRIVILEGES` chỉ áp dụng cho đối tượng do role đã đặt nó tạo ra. `scripts/db-migrate.mts` dừng nếu role hiện tại không sở hữu schema `app` |
| N20 | Logger bỏ hẳn (không thay bằng `[REDACTED]`) mọi khóa nhạy cảm, khớp theo chuỗi con của tên khóa đã chuẩn hóa | Ngoài `password`, `token`, `otp`, `secret`, `authorization`, `cookie` còn có `passwd`, `apikey`, `signature` và `pin` (PIN bàn giao, chỉ khớp cả khóa hoặc đuôi như `handoverPin`). SĐT được che cả theo giá trị lẫn theo tên khóa, định dạng giữ 3 ký tự đầu và 3 ký tự cuối: `0901234567` thành `090****567` (ROADMAP T0.4). Ví dụ trong CLAUDE.md bất biến 14 từng ghi `09******123`, đã sửa thành `090****567` ở T0.5 cho khớp code |
| N21 | `rate_limits`: cửa sổ cố định căn theo UTC; lượt bị từ chối vẫn được đếm; không gọi trong transaction nghiệp vụ | Nếu transaction nghiệp vụ rollback thì lượt đếm cũng mất, kẻ tấn công có thể cố tình gây rollback để né giới hạn, nên luôn truyền `getDb()`. Thêm `created_at` (DATA_MODEL mục 1) và hai `CHECK` so với bản mô tả ban đầu. Cửa sổ cố định cho phép tối đa 2 lần ngưỡng ngay ranh giới hai cửa sổ |
| N22 | Thư viện lõi chọn hướng "đóng cửa khi lỗi" | `safeEqual` băm SHA-256 trước `timingSafeEqual` (không ném lỗi khi khác độ dài, không lộ độ dài) và trả `false` với `null`/`undefined`; `randomToken` từ chối dưới 16 byte; `mulDiv` bắt buộc người gọi chọn `floor`/`ceil` thay vì có mặc định; `clock.ts` không có `setClock()` toàn cục, hàm cần giờ nhận `Clock` qua tham số |
| N23 | CSP và header bảo mật dựng bằng hàm thuần; domain ngoài lấy từ env, thiếu thì chặt hơn | `SUPABASE_URL` → `img-src` (chỉ lấy origin; staging/production bắt buộc https), `SENTRY_DSN` → `connect-src` (đúng host ingest trong DSN, chặt hơn `*.ingest.sentry.io` ở bản đầu), Turnstile chỉ mở khi `CAPTCHA_PROVIDER=turnstile` và có `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (origin `challenges.cloudflare.com` do Cloudflare quy định, không biến env nào chứa nó nên là hằng số duy nhất trong code). Biến thiếu hoặc không hợp lệ thì bỏ nguồn đó và `frame-src` thành `'none'`. `upgrade-insecure-requests` chỉ gửi ở staging/production (bản local chạy `http://localhost`, một số trình duyệt ép nâng cấp cả localhost lên https). `style-src` giữ `'unsafe-inline'` theo SECURITY.md; script thì không bao giờ có `'unsafe-inline'`/`'unsafe-eval'` ở staging/production. `'unsafe-eval'` chỉ thêm khi `APP_ENV=local` và `NODE_ENV=development`, qua hàm riêng `relaxCspForDevelopment` |
| N24 | Mọi trang render động vì CSP dùng nonce | Next.js chỉ gắn nonce lúc render theo request; trang tĩnh dựng lúc build có script không nonce nên bị trình duyệt chặn (đã thử: test HTTP đỏ ở bản tĩnh). Root layout gọi `await connection()`. Hệ quả đo được: `Cache-Control` của HTML đổi từ `s-maxage=31536000` sang `private, no-cache, no-store, max-age=0, must-revalidate`; CDN không cache HTML; `/_next/static` vẫn `immutable`. Bù bằng cache dữ liệu ở server (ARCHITECTURE mục 11). Phương án chưa chọn: SRI thử nghiệm của Next.js (giữ trang tĩnh nhưng còn experimental) |
| N25 | `env.ts` coi chuỗi rỗng là chưa đặt | `.env.local` sao chép từ `.env.example` để trống biến chưa dùng (`SEPAY_API_TOKEN=`), mà schema cũ báo lỗi `>=1 characters`. Trước T0.5 chưa có code nào import `env` nên lỗi nằm im; middleware chạy ở mọi request nên lộ ra thành 500 toàn bộ. Sửa trong `parseEnv`: `""` thành `undefined`. Production không dễ dãi hơn: biến bắt buộc ở staging/production vẫn bị từ chối khi thiếu hoặc rỗng (có test từng biến). Hệ quả thêm: vì middleware gọi `env` ở mọi request, cấu hình production sai (thiếu secret, dùng mock) làm MỌI request trả 500, đúng tinh thần bất biến 7 |
| N26 | Dùng `src/proxy.ts` (hàm `proxy`) thay cho `src/middleware.ts` | Next.js 16 đổi tên convention `middleware` thành `proxy`; tên cũ bị deprecated và build in cảnh báo. Đã đổi ở T0.5b theo tài liệu `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` (đổi tên file và hàm, `config.matcher` giữ nguyên). Logic nằm ở `server/security/headers.ts` nên không đổi. Proxy chạy trên Node.js runtime thay vì Edge |
| N27 | Tắt `agentRules` trong `next.config.ts` | Từ Next.js 16.3, `next dev` tự ghi khối `nextjs-agent-rules` vào `CLAUDE.md` (và tạo `AGENTS.md`) mỗi lần chạy, làm bẩn working tree. CLAUDE.md do dự án tự quản lý nên đặt `agentRules: false` (guide `ai-agents.md`, mục "Opting out"). Đổi lại, agent không được nhắc tự động đọc docs trong `node_modules/next/dist/docs/`; CLAUDE.md đã có dòng "Tra tài liệu chính thức" |
| N28 | Phí giao hàng giai đoạn đầu miễn phí; tách module `ShippingFeePolicy` | Chỉ hiện thực `FreeShippingPolicy` (luôn 0, cả giao tận nơi lẫn nhận tại cửa hàng). `FLAT`, `BY_DISTANCE`, `BY_ZONE` chưa làm; cài đặt chọn chính sách chưa làm thì bị từ chối khi lưu và khi khởi động. `store_settings.shipping_policy` (mặc định `FREE`, đổi cần MFA step-up + audit); `orders` chốt `shipping_fee`, `shipping_policy`, `shipping_breakdown` lúc đặt. `shipping_fee_flat` và `free_shipping_threshold` thành tham số dự phòng của `FLAT`. Giao diện hiện "Miễn phí giao hàng" và ẩn thanh tiến độ. Bán kính 40km vẫn kiểm. Thay thế mức 20.000đ / miễn phí từ 300.000đ ở bản đầu của Q3 |
| N29 | Thanh toán trước 100%, không COD, không thu tiền mặt | Mọi đơn, kể cả nhận tại cửa hàng, chuyển khoản xong mới được xử lý. Nhân viên không có chức năng xác nhận đã thu tiền; máy trạng thái không có đường từ `PENDING_PAYMENT` tới `PACKING`, `READY_*`, `OUT_FOR_DELIVERY`, `COMPLETED`; thêm `CHECK` `paid_at` ở `orders` làm lớp thứ hai. Thành quy tắc ở BUSINESS_RULES 5.0 và bất biến 19 trong CLAUDE.md. Hệ quả: muốn nhận tiền mặt về sau phải đổi tài liệu trước |
| N30 | Ảnh: admin chỉ tải ảnh gốc, hệ thống tự nén theo kích thước hiển thị | Ảnh gốc ≤ 12 MB, ≤ 40 megapixel, tải lên bucket riêng tư `incoming` bằng signed URL (request qua hàm serverless bị giới hạn dung lượng); route xử lý kiểm loại bằng nội dung thật, `sharp` xoay theo EXIF và xóa metadata, lưu bản chuẩn hóa ≤ 2400px rồi tạo các bản WebP theo preset vào bucket công khai. Hiển thị bằng `AppImage` + custom loader, không dùng bộ tối ưu ảnh của Next.js. Hạn mức 5 MB cũ được nâng lên 12 MB vì ảnh gốc được nén phía server. `sharp` là dependency mới, xin duyệt ở T2.2. Chi tiết ở ARCHITECTURE mục 15 |
| N31 | Audit nằm ở `src/server/audit/` (không phải `modules/audit/`); `record()` nhận `tx` và đóng cửa khi lỗi | Mọi module đều ghi audit nên đặt cạnh `lib/` để module không import chéo nhau (ROADMAP T0.6 ghi `audit/service.ts`; cây thư mục ARCHITECTURE mục 4 đã sửa theo). Truyền `tx` của thao tác nghiệp vụ thì audit cùng commit, cùng rollback; ghi audit lỗi (dữ liệu sai hay lỗi database) thì ném ra và kéo cả transaction rollback, không có chế độ "ghi được thì ghi". Không `tx` thì dùng `getDb()`, chỉ cho sự kiện không kèm thay đổi dữ liệu (`auth.login_failed`, `payment.webhook_bad_signature`). Tên action phải nằm trong danh sách `AUDIT_ACTIONS` (`src/server/audit/actions.ts`); database chỉ `CHECK` định dạng để thêm action không cần migration. `actor_id` là `uuid` (tài khoản), `entity_id` là `text` (thực thể có thể là mã giao dịch SePay, `store_settings`...). Phần mô tả bảng ở DATA_MODEL mục 9 bổ sung các `CHECK`, cột nào cho phép NULL |
| N32 | `before`/`after` dùng lại `sanitizeForLog` của logger; giới hạn 16 KB mỗi trường | Không viết hàm che thứ hai: cùng danh sách khóa nhạy cảm với N20 và cùng cách bỏ hẳn khóa (không thay bằng `[REDACTED]`), nên audit không ghi được việc "đã đổi mật khẩu" qua `before`/`after`; tên action (ví dụ `staff.reset_password` sau này) thể hiện điều đó. Sau khi làm sạch, ký tự NUL và surrogate đứng lẻ được thay bằng U+FFFD vì Postgres `jsonb` từ chối chúng: nếu không, một ghi chú chứa NUL sẽ làm hỏng câu INSERT audit và chặn luôn thao tác nghiệp vụ. Quá 16 KB (byte UTF-8 của JSON) thì lưu `{"_truncated": true, "originalBytes", "preview"}`, `preview` là phần đầu của JSON đã làm sạch; không ném lỗi |
| N33 | Ngữ cảnh request: IP từ `x-forwarded-for`/`x-real-ip` qua `net.isIP`, `request_id` từ `x-vercel-id` | IP sai định dạng (kèm cổng, ngoặc vuông, zone id `%eth0` mà `inet` không nhận) thành null thay vì làm INSERT lỗi. `user_agent` bỏ ký tự điều khiển, cắt 255 ký tự theo code point. Các header này client gửi được; chỉ tin khi chạy sau proxy của Vercel (SECURITY mục 2). Không đọc `x-request-id` vì chưa có proxy nào đặt nó, client tự đặt được; thiếu `x-vercel-id` thì sinh uuid mới. `record()` chuẩn hóa lại ngữ cảnh người gọi tự dựng |
| N34 | Test tích hợp audit không bao giờ commit dòng audit | `audit_logs` không cho DELETE nên test không dọn được. Mọi lần ghi nằm trong transaction của `app_runtime` bị rollback; mỗi dòng mang `request_id` riêng của lần chạy (`test-audit-<ngẫu nhiên>`) để truy vấn chỉ thấy dữ liệu tự tạo; test cuối kiểm tra không còn dòng nào mang dấu đó. Test UPDATE/DELETE/TRUNCATE chạy trong savepoint của chính transaction đó, nên kể cả khi quyền bị nới nhầm thì dữ liệu có sẵn cũng không mất (đã thử: cấp lại quyền thì 2 test đỏ, bảng vẫn nguyên). Lỗi database thật cho trường hợp "ghi audit lỗi" tạo bằng khóa `ACCESS EXCLUSIVE` từ phiên khác cộng `lock_timeout` |
| N35 | Mật khẩu `app_runtime` trong CI: workflow tự đặt mật khẩu ngẫu nhiên cho mỗi lần chạy | Trả lời câu hỏi mở của T0.3. Bước "Đặt mật khẩu tạm" sinh mật khẩu bằng `openssl rand -hex 32`, che bằng `::add-mask::`, gửi `ALTER ROLE` cho `psql` trong container Postgres qua stdin (không nằm trong tham số dòng lệnh), rồi ghi `DATABASE_URL` vào `$GITHUB_ENV` cho các bước sau của job. Không dùng `pnpm db:setup:local` (vẫn chỉ nhận `APP_ENV=local`), không nới guard của `pnpm test:int` (vẫn chỉ `local`/`test` và localhost/127.0.0.1). Postgres thường không có role của Supabase: migration `0000` đã tự tạo `anon`, `authenticated`, `service_role` dạng `NOLOGIN`; test chỉ cần `SET ROLE` từ role migration nên không cần `authenticator`. Đã thử đột biến trên CI (run 38609546253): cấp quyền cho `anon` làm 3 test nhóm (a) đỏ; thu quyền mặc định của `app_runtime` làm (b) và (c) đỏ; thay `app.make_append_only` bằng hàm rỗng làm 3 test (c) đỏ; khôi phục thì 10/10 xanh. Giới hạn: CI không có quyền mặc định riêng của nền tảng Supabase; phần đó vẫn do `pnpm test:int` trên Supabase local và mục "Schema `app` không truy cập được bằng anon key" trong checklist mở bán phủ |
| N36 | CI đỏ nếu bộ test rỗng hoặc có test bị bỏ qua | Vitest trả exit 0 cả khi có `it.skip`/`it.todo`/`describe.skipIf`, và `pnpm test` có `--passWithNoTests`. CI đặt `VITEST_JSON_REPORT` để `vitest.reporters.mts` in tên từng test và ghi báo cáo JSON; `scripts/ci/check-vitest-report.mts` đọc báo cáo và làm đỏ CI khi không có test nào chạy hoặc có test không ở trạng thái `passed`. Đặt qua biến môi trường vì pnpm 12 coi `--reporter` là tùy chọn của pnpm, còn `pnpm test -- ...` thì chuyển nguyên dấu `--` khiến vitest bỏ qua phần sau. Job build-http còn chạy `pnpm test:http` trước khi build và yêu cầu nó đỏ với lỗi "Chưa có bản build" (nghiệm thu T0.7) |
| N37 | Node 24 LTS (`engines.node: "24.x"`), pnpm theo `packageManager` | `actions/setup-node` đọc `engines.node`, `pnpm/action-setup` đọc `packageManager` trong `package.json`, nên phiên bản chỉ khai báo một chỗ. Node 20 hết hỗ trợ từ 4/2026; máy dev đang dùng 24.18.1. CI lấy bản 24.x mới nhất để có bản vá bảo mật. Không bật cache dependency của Action (`package-manager-cache: false`): cài lại mỗi lần chậm hơn vài giây nhưng không phụ thuộc cache có thể bị đầu độc |

## 5. Câu hỏi mở

Claude Code sẽ dùng giá trị mặc định cho tới khi bạn trả lời. Trả lời xong thì cập nhật bảng này và `BUSINESS_RULES.md`.

| # | Câu hỏi | Mặc định đang dùng |
|---|---|---|
| Q1 | Ngưỡng hạng VIP: 2/5/10 triệu (theo code cũ) hay 3/10/25 triệu (theo báo cáo cũ)? | 2/5/10 triệu |
| Q2 | Cộng điểm khi đơn hoàn tất hay khi vừa thanh toán? | Khi hoàn tất |
| Q3 | Phí giao hàng và bán kính giao | Đã chốt (N28): giai đoạn đầu MIỄN PHÍ cho cả giao tận nơi lẫn nhận tại cửa hàng; bán kính giao 40km giữ nguyên. Cách tính lại về sau: xem Q16 |
| Q4 | Giờ mở cửa, khung giờ nhận hàng tại quầy? | 7:00–21:00, khung 30 phút |
| Q5 | Ngân hàng nhận tiền; tài khoản doanh nghiệp hay cá nhân? | Chưa có, bắt buộc trước giai đoạn 3 |
| Q6 | Nhà cung cấp SMS OTP? | Chưa có, bắt buộc trước khi mở bán |
| Q7 | Có bán bia/rượu online không? | Có (đã thiết kế bước xác nhận 18+) |
| Q8 | Giá trị đơn tối thiểu? | Không có |
| Q9 | Thời gian giữ hàng chờ thanh toán? | 15 phút |
| Q10 | Đơn nhận tại quầy không đến lấy: sau bao nhiêu ngày thì hủy và hoàn tiền? | 3 ngày |
| Q11 | Địa chỉ và tọa độ kho online (kho riêng có thể khác cửa hàng 482 Huỳnh Tấn Phát)? | 482 Huỳnh Tấn Phát |
| Q12 | Kênh nhận cảnh báo của chủ shop: Telegram, Zalo hay email? | Telegram |
| Q13 | Hình thức kinh doanh: hộ kinh doanh hay công ty? | Chưa rõ (ảnh hưởng thông tin chân trang và hóa đơn) |
| Q14 | Production chạy trên dịch vụ quản lý sẵn (Vercel Pro + Supabase Pro) hay VPS tự quản (rẻ hơn, phải tự lo backup, vá lỗi, bảo mật máy chủ)? | Quyết định trước giai đoạn 7; mặc định dịch vụ quản lý sẵn |
| Q15 | Giới hạn "theo ngày" (OTP 5 lần/ngày/SĐT, 20 lần/ngày/IP): đếm lại lúc 0h giờ Việt Nam, hay cứ 24 giờ liên tục kể từ lần đầu? | Cửa sổ 24 giờ căn theo UTC, tức đếm lại lúc 7h sáng giờ Việt Nam. Muốn 0h giờ Việt Nam thì thêm độ lệch múi giờ vào `getWindowStart` |
| Q16 | Khi tính lại phí giao hàng: theo km hay theo khu vực (tỉnh, phường/xã)? | Chưa quyết định; chạy chính sách `FREE` (N28). Ưu nhược bên dưới |

### Q16: so sánh hai hướng tính phí

| | Theo km (`BY_DISTANCE`) | Theo khu vực (`BY_ZONE`) |
|---|---|---|
| Ưu | Phí tăng đều theo quãng đường, không có ranh giới đột ngột | Dựa trên bảng `admin_units` (tỉnh, phường/xã) đã có sẵn, không cần tọa độ chính xác |
| | | Báo giá cho khách dễ: tra bảng theo phường/xã, có thể hiện trước khi ghim bản đồ |
| | | Dễ kiểm thử (tra bảng), không phụ thuộc dịch vụ bản đồ ngoài |
| Nhược | Cần định vị phía server (geocoding địa chỉ) vì tọa độ do khách gửi có thể bị sửa để giảm phí | Cần thêm bảng phí theo khu vực và màn admin để duy trì |
| | Khoảng cách Haversine là đường chim bay, khác đường đi thật; phải chốt cách làm tròn km | Ranh giới đột ngột: hai nhà sát nhau nhưng khác phường có thể khác phí |
| | Khách khó đoán phí trước khi nhập địa chỉ; phụ thuộc dịch vụ geocoding (giới hạn, chi phí) | Đơn vị hành chính đổi thì phải cập nhật bảng phí; phường rộng thì chênh lệch quãng đường lớn |

Bán kính giao tối đa 40km vẫn áp dụng bất kể chọn hướng nào. Có thể kết hợp (khu vực để báo giá, km để kiểm tra), nhưng cần bạn chọn trước khi làm.
