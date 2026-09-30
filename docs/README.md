# Hướng dẫn cho chủ dự án

## 1. Bộ tài liệu gồm những gì

| File | Dành cho | Nội dung |
|---|---|---|
| `CLAUDE.md` (thư mục gốc) | Claude Code (tự đọc mỗi phiên) | Quy tắc bắt buộc, bất biến bảo mật, lệnh, cách làm việc |
| `docs/ARCHITECTURE.md` | Claude Code + bạn | Hạ tầng, sơ đồ, cấu trúc thư mục, đăng nhập, luồng thanh toán |
| `docs/DATA_MODEL.md` | Claude Code | Bảng dữ liệu, ràng buộc, quyền database |
| `docs/BUSINESS_RULES.md` | Claude Code + bạn | Quy tắc bán hàng: giá, ship, điểm, trạng thái đơn, thanh toán, bàn giao |
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
- [ ] Ảnh banner riêng cho desktop (3,9:1) và mobile (16:9), icon danh mục (UI_SPEC mục 6). Trước khi có ảnh thật, Claude Code dùng ảnh giữ chỗ.

### Dữ liệu cửa hàng (cần trước giai đoạn 2)
- [ ] Danh sách sản phẩm: tên, danh mục, đơn vị gốc, các quy cách bán và giá, ảnh (nên chụp thật, không dùng ảnh lấy từ web khác).
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

## 5. Câu hỏi mở

Claude Code sẽ dùng giá trị mặc định cho tới khi bạn trả lời. Trả lời xong thì cập nhật bảng này và `BUSINESS_RULES.md`.

| # | Câu hỏi | Mặc định đang dùng |
|---|---|---|
| Q1 | Ngưỡng hạng VIP: 2/5/10 triệu (theo code cũ) hay 3/10/25 triệu (theo báo cáo cũ)? | 2/5/10 triệu |
| Q2 | Cộng điểm khi đơn hoàn tất hay khi vừa thanh toán? | Khi hoàn tất |
| Q3 | Phí ship 20.000đ, miễn phí từ 300.000đ, bán kính 40km: giữ nguyên? | Giữ nguyên |
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
