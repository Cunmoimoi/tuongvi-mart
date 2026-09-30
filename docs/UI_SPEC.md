# Đặc tả giao diện (UI Spec)

## 0. Nguyên tắc

- **Bố cục desktop dựng lại theo kingfoodmart.com**: cấu trúc trang, kích thước, khoảng cách, hành vi. Ảnh tham chiếu ở `docs/reference/kfm-desktop/` (1 px ảnh ≈ 1 CSS px, viewport ≈ 1536px). Số đo trong tài liệu này đọc từ ảnh, sai số khoảng ±10%.
- **Nhận diện là của Tường Vi Mart**: logo, màu, ảnh, câu chữ, tên chương trình. KHÔNG dùng logo, ảnh, màu cam nhận diện, câu chữ hay tên chương trình ("OneLife"...) của Kingfoodmart.
- **Một codebase responsive**. Desktop theo tham chiếu; mobile không có tham chiếu (Kingfoodmart dùng app) nên theo thiết kế ở mục 3.7 và phần "Mobile" của từng trang, dùng cùng ngôn ngữ thị giác.
- Mọi giá, tồn, điểm do server tính (xem `BUSINESS_RULES.md`).
- Trang checkout, thanh toán VietQR, đăng nhập/đăng ký là thiết kế riêng (không có tham chiếu).

### 0.1 Khác biệt có chủ đích so với bản gốc

| # | Bản gốc | Tường Vi Mart | Lý do |
|---|---|---|---|
| 1 | Header cam, nút xanh dương | Header xanh lá đậm, nút xanh lá (mục 2) | Nhận diện riêng |
| 2 | "Thẻ OneLife / số dư" ở thanh hình thức mua | "Điểm thưởng" (số điểm hoặc "Đăng nhập để xem điểm") | Không có ví |
| 3 | Thanh khuyến mãi bắt nhập SĐT để nhận mã | Thanh thông báo chỉ có chữ + link | Chưa có voucher; thu SĐT cần xin đồng ý |
| 4 | Phải chọn siêu thị mới có giá | Luôn hiện giá; chọn hình thức mua là tùy chọn | Một kho; quyết định D5 |
| 5 | Nút "Mua" giữ nguyên sau khi thêm | Nút đổi thành bộ tăng giảm `[− n +]` | Đi chợ nhanh hơn |
| 6 | Giỏ hàng có checkbox chọn từng món | Không có checkbox, cả giỏ đi thanh toán | Đơn giản, ít lỗi tính tiền |
| 7 | Hành vi dính khi cuộn khác nhau giữa các trang | Header luôn dính ở mọi trang | Nhất quán |
| 8 | Có Cẩm nang, Thẻ quà tặng, Voucher, Đánh giá | Chưa làm (backlog) | Phạm vi giai đoạn đầu |

## 1. Breakpoint và khung trang

| Khoảng | Khung |
|---|---|
| ≥ 1280px | **Desktop đầy đủ**: header + thanh hình thức mua + sidebar danh mục cố định 256px + vùng nội dung |
| 1024–1279px | **Desktop gọn**: ẩn sidebar; header có nút "☰ Danh mục" mở cùng mega menu dạng ngăn trượt |
| 768–1023px | **Tablet**: bố cục mobile, lưới rộng hơn, không bottom nav |
| < 768px | **Mobile**: header gọn + bottom nav (mục 3.7) |

- Vùng nội dung khi có sidebar: `padding: 16px 36px 40px`, không giới hạn max-width (co giãn theo màn hình).
- Trang không có sidebar (giỏ hàng, tài khoản, đơn hàng, checkout, thanh toán): container giữa, `max-width: 1240px`, padding ngang 24px.
- Kiểm thử ở: 360, 390, 430, 768, 1024, 1280, 1440, 1536.
- Khác biệt bố cục giữa các khoảng: render các biến thể và ẩn/hiện bằng class. Chỉ dùng `useMediaQuery` cho khác biệt hành vi. Không phân nhánh theo user-agent.

### Trang nào có sidebar (desktop ≥ 1280)

Có: trang chủ, danh mục, chi tiết sản phẩm, tìm kiếm, khuyến mãi, bộ sưu tập, thành viên.
Không: giỏ hàng, checkout, trang đơn hàng/thanh toán, tài khoản, đăng nhập/đăng ký, chính sách.

## 2. Design tokens

### 2.1 Màu (vai trò theo bản gốc → màu Tường Vi)

| Token | Giá trị | Vai trò (tương ứng bản gốc) |
|---|---|---|
| `brand` | `#15803d` | Nền header (bản gốc: cam). Chữ trắng trên nền này đạt tương phản AA |
| `brand-dark` | `#0d4022` | Thanh thông báo, footer đáy |
| `primary` | `#16a34a` (hover `#15803d`) | Nút chính, link, tab đang chọn, viền đang chọn (bản gốc: xanh dương) |
| `primary-soft` | `#dcfce7` | Nền nút "Mua", mục sidebar đang chọn, nút tăng giảm |
| `primary-softer` | `#f0fdf4` | Nền quy cách đang chọn |
| `sale` | `#ea580c` | Giá bán, tổng tiền, nhãn khuyến mãi |
| `sale-soft` | `#fff1e6` | Nền khối "Khuyến mãi HOT", tab bộ sưu tập đang chọn |
| `badge-discount` | nền `#fcd34d`, chữ `#1f2937` | Badge `-23%` trên thẻ sản phẩm |
| `danger` | `#dc2626` | Badge giảm giá lớn trên trang chi tiết, cảnh báo "Chỉ còn N", badge số giỏ hàng |
| `success` | `#15803d`; `success-soft` `#dcfce7` | "Tiết kiệm 7K", nhãn "Còn hàng" |
| `text` | `#1f2937`; `text-2` `#374151`; `muted` `#6b7280`; `faint` `#9ca3af` | Chữ |
| `border` | `#e5e7eb` | Viền, đường kẻ |
| `surface` | `#ffffff` | Thẻ, khối |
| `page-bg` | `#f3f4f6` | Nền trang giỏ hàng, tài khoản, đơn hàng |
| `overlay` | `rgb(0 0 0 / 0.4)` | Lớp mờ sau mega menu, dropdown tìm kiếm, dialog |

### 2.2 Chữ

- Font: **Be Vietnam Pro** qua `next/font/google` (tự host lúc build), dự phòng `system-ui, sans-serif`. Trọng lượng dùng: 400, 500, 600, 700.
- Input luôn ≥ 16px (iOS không tự phóng to).

| Vai trò | Cỡ / đậm / line-height |
|---|---|
| Tiêu đề trang (Giỏ hàng, Đơn hàng của tôi) | 28 / 600 / 36 |
| Tiêu đề danh mục (H1 trang danh mục) | 20 / 600 / 28 |
| Tên sản phẩm trang chi tiết | 18 / 600 / 26 |
| Giá lớn trang chi tiết | 28 / 700 |
| Tiêu đề khối | 18 / 700 |
| Link header | 15 / 500 |
| Mục sidebar | 14 / 400 / 18 (tối đa 2 dòng) |
| Tên sản phẩm trên thẻ | 14 / 400 / 18 (đúng 2 dòng, `line-clamp-2`, giữ chiều cao 36) |
| Giá trên thẻ | 16 / 700; ký hiệu `đ` 11px gạch chân |
| Giá gốc + tiết kiệm trên thẻ | 11 / 400 gạch ngang + 11 / 700 |
| Chữ nút | 15 / 600 |
| Chú thích, nhãn nhỏ | 12 / 500 |

### 2.3 Khác
- Bo góc: 4 (badge, ảnh nhỏ), 8 (thẻ, khối, dropdown), 12 (banner, khối danh mục con), 9999 (nút, chip, ô tìm kiếm).
- Bóng: thẻ phẳng, không bóng; dropdown/mega menu `0 8px 24px rgb(0 0 0 / .12)`; ô tài khoản `0 1px 3px rgb(0 0 0 / .08)`.
- Icon: `lucide-react`, nét 1.75; 20px trong nút, 22px ở menu.
- Vùng bấm tối thiểu 40×40 (desktop), 44×44 (mobile).
- Chuyển động 150–200ms; tôn trọng `prefers-reduced-motion`.

### 2.4 Định dạng số
- Giá: `22.900đ`. Trên thẻ sản phẩm và giá lớn, `đ` nhỏ hơn và gạch chân (giống bản gốc); nơi khác viết liền.
- Tiết kiệm trên thẻ: `Tiết kiệm 7K`, `Tiết kiệm 13,5K`. Giỏ hàng/checkout ghi đầy đủ `7.000đ`.
- Badge: `-23%` (làm tròn xuống).
- Đơn giá quy đổi: `(13.500đ / gói)`.

## 3. Khung chung

### 3.1 Header desktop (tham chiếu: 01, 05)

Một hàng, cao **70px**, nền `brand`, padding ngang 16px, luôn dính trên cùng.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [LOGO 180×32] [🔍 Tìm sản phẩm...           ] Thành viên  Khuyến mãi  Hướng dẫn │ 👤Đăng nhập  🧾Mua lại  🛒³Giỏ hàng │
│                                                                                 │   Tài khoản    Đơn hàng           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

- Logo: cao 32, rộng tối đa 180, link về trang chủ.
- Ô tìm kiếm: cao 36, bo tròn hoàn toàn, nền trắng, icon kính lúp 20px bên trái (màu `primary`), placeholder 15px `faint`. Chiều rộng co giãn, tối đa 570. Khoảng cách tới logo 12.
- Link điều hướng: 15/500, trắng, cách nhau 20. Nội dung: "Chương trình thành viên", "Khuyến mãi", "Hướng dẫn mua hàng" (≥ 1440 hiện đủ; nhỏ hơn thì ẩn bớt từ phải sang).
- Vạch ngăn: 1×24, trắng 60%.
- Cụm tài khoản, đơn hàng: icon 22 + 2 dòng chữ (dòng trên 11/400, dòng dưới 16/700).
  - Chưa đăng nhập: "Đăng nhập / Tài khoản".
  - Đã đăng nhập: "Xin chào / {tên ngắn}". Tên chỉ lấy tên gọi, cắt 14 ký tự.
  - Đơn hàng: "Mua lại / Đơn hàng", dẫn tới `/tai-khoan/don-hang`.
- Giỏ hàng: icon 22 + badge số món (tròn 16px, nền `danger`, chữ trắng 11/700, đặt góc trên phải icon) + chữ "Giỏ hàng" 16/700. Bấm mở ngăn giỏ hàng (drawer) bên phải.
- Desktop gọn (1024–1279): thêm nút "☰ Danh mục" giữa logo và ô tìm kiếm.

### 3.2 Thanh hình thức mua (tham chiếu: 01, 12)

Cao **52px**, nền trắng, viền dưới `border`, nằm ngay dưới header, cuộn đi theo trang (không dính).

- Trái:
  - Chưa chọn: "Bạn muốn nhận hàng theo hình thức nào?" (16/600, `primary`) + chevron xuống ở cuối vùng trái.
  - Đã chọn: icon tròn 32 nền `primary-softer` (🚶 nhận tại cửa hàng / 🛵 giao tận nơi) + "Nhận tại" hoặc "Giao đến" (15/400) + địa chỉ đậm (15/700, cắt 1 dòng) + link "Đổi" (15/600, `primary`) ở cuối vùng trái.
  - Bấm mở dialog chọn (mục 4.1.1).
- Vạch ngăn dọc 1×24.
- Phải: icon tròn 32 nền `primary-softer` + 2 dòng:
  - Chưa đăng nhập: "Điểm thưởng" (15/600) / "Đăng nhập để xem điểm" (13/400 `muted`).
  - Đã đăng nhập: "Điểm thưởng · {hạng}" / "{số} điểm". Bấm tới `/tai-khoan/diem`.
- Vùng trái chiếm khoảng 50% chiều rộng.

### 3.3 Sidebar danh mục và mega menu (tham chiếu: 01, 02, 04, 13)

**Sidebar** (chỉ ≥ 1280):
- Rộng **256px**, nền trắng, viền phải `border`. Dính dưới header (`top: 70px`, cao `calc(100vh - 70px)`), tự cuộn riêng khi danh sách dài.
- Mỗi mục cao **48px**, padding ngang 16:
  - icon tròn 36 (ảnh danh mục cấp 1, nền `page-bg`),
  - cách 12, tên 14/400 (tối đa 2 dòng),
  - chevron phải 16 màu `faint`.
- Hover/đang mở: nền `primary-soft`, chữ `primary`.
- Mục đầu tiên là "Khuyến mãi HOT" (icon riêng), sau đó các danh mục cấp 1 theo `sort_order`.

**Mega menu** (mở từ mục sidebar):
- Mở khi rê chuột vào mục (trễ 150ms để tránh mở nhầm) hoặc bấm. Đóng bằng nút ✕, phím Esc, bấm ra ngoài, hoặc rời chuột khỏi cả sidebar lẫn panel (trễ 200ms).
- Panel trắng nằm sát mép phải sidebar, phủ từ đầu vùng nội dung tới đáy màn hình. Rộng **540px** (danh mục thường) hoặc **860px** (Khuyến mãi HOT). Nút ✕ 24px ở góc trên phải, cách 20.
- Phần còn lại của trang phủ lớp `overlay`.
- **Danh mục thường** (tham chiếu 04): lưới 4 cột, mỗi nhóm là một danh mục cấp 2:
  - ảnh tròn 88 (nền `page-bg`),
  - tên nhóm 16/600, tối đa 2 dòng, cách ảnh 12,
  - tối đa 5 link danh mục cấp 3 (14/400, gạch chân, `text-2`, line-height 30),
  - "Xem thêm" (14/500, `primary`) nếu còn.
  - Khoảng cách giữa các nhóm: ngang 16, dọc 32.
- **Khuyến mãi HOT** (tham chiếu 13):
  - Cột trái chia 3 phần có tiêu đề (16/600): mục "Khuyến mãi HOT" (ảnh tròn 110), "Theo chương trình" (bộ sưu tập đang chạy, ảnh tròn 110 + tên), "Theo danh mục" (danh mục cấp 1, ảnh tròn 110 + tên). Giữa các phần có đường kẻ.
  - Cột phải rộng 290, tiêu đề "Khuyến mãi nổi bật", danh sách banner dọc (tỉ lệ 2,2:1, bo 8, cách nhau 16), lấy từ `banners` vị trí `MEGA_MENU_PROMO`.
- Điều hướng bàn phím: mũi tên lên/xuống trong sidebar, Enter/→ mở panel, Esc đóng, focus nằm trong panel khi mở.

### 3.4 Thanh thông báo (tham chiếu: 01)

- Nằm đầu vùng nội dung (dưới thanh hình thức mua, bên phải sidebar), cao **48px**, nền `brand-dark`, chữ trắng 16/600 căn giữa.
- Có thể có nút link bên phải chữ (nền `badge-discount`, chữ tối, bo 6, cao 32).
- Nội dung do admin cấu hình (`store_settings.announcement_text`, `announcement_link`); để trống thì ẩn.
- Không có ô nhập SĐT.

### 3.5 Nút chat nổi (tham chiếu: 01)

- Nút tròn 56, nền trắng, viền `border`, bóng nhẹ, logo Zalo, cố định `right: 24px; bottom: 24px`. Trên mobile: `bottom: 80px` (trên bottom nav).
- Mở link Zalo OA của cửa hàng (`store_settings.zalo_url`) trong tab mới; để trống thì ẩn.

### 3.6 Footer (tham chiếu: 11, 15)

- Nền trắng, viền trên `border`, container 1240.
- Hàng 1: logo (cao 36).
- Hàng 2: link ngang 16/400 `text-2`, cách nhau 24 (Chương trình thành viên, Khuyến mãi, Hướng dẫn mua hàng, Liên hệ). Đường kẻ trên và dưới hàng này.
- Hàng 3, 3 cột:
  - Tên doanh nghiệp (16/700), địa chỉ, mã số đăng ký kinh doanh, nơi cấp (16/400, line-height 30).
  - "Liên hệ chăm sóc khách hàng" (16/700), hotline, email, "Chat qua Zalo".
  - Logo "Đã thông báo Bộ Công Thương" (rộng 180). Chỉ gắn sau khi đã đăng ký thật, và link tới đúng trang xác nhận.
- Hàng 4 (nền `page-bg`): link chính sách 15/400 `muted`, cách nhau 20 (Điều khoản, Bảo mật, Giao hàng, Thanh toán, Đổi trả, Hướng dẫn mua hàng).
- Mobile: các cột xếp dọc; hàng link thành danh sách.

### 3.7 Mobile (< 768) và tablet

Không có tham chiếu; dùng cùng token, thẻ, nút như desktop.

**Header mobile** (dính trên cùng, nền `brand`):

```
┌─────────────────────────────────────┐
│ [logo]  🛵 Giao đến: Q.7 ▾      🛒³  │  ← 48px
│ [ 🔍 Tìm sản phẩm...              ] │  ← 44px (ô cao 36)
└─────────────────────────────────────┘
```

- Khi cuộn xuống: hàng logo ẩn, chỉ còn hàng tìm kiếm dính trên cùng.
- Bấm ô tìm kiếm thì mở màn tìm kiếm toàn màn hình.

**Bottom nav** (cố định đáy, 56px + `env(safe-area-inset-bottom)`, nền trắng, viền trên): 🏠 Trang chủ · ▦ Danh mục · % Khuyến mãi · 🛒 Giỏ hàng (badge) · 👤 Tài khoản. Mục đang ở màu `primary`. Ẩn ở trang chi tiết sản phẩm, giỏ hàng, checkout, trang thanh toán (các trang này có thanh hành động dính đáy riêng).

**Trang Danh mục mobile** `/danh-muc`, thay cho sidebar và mega menu:
- Cột trái 88px, danh sách danh mục cấp 1 dọc: icon 40 + tên 12px 2 dòng; mục đang chọn nền trắng, vạch trái `primary`.
- Cột phải: các nhóm cấp 2 (tiêu đề 15/600) + lưới 3 cột danh mục cấp 3 (ảnh tròn 64 + tên 12px).

**Thanh hình thức mua trên mobile**: chip trong hàng logo của header. Thanh thông báo: 36px, chữ 13px, cuộn đi.

### 3.8 Hành vi khi cuộn

- Header (70) luôn dính.
- Sidebar dính dưới header.
- Thanh hình thức mua và thanh thông báo cuộn đi theo trang.
- Trang danh mục: hàng danh mục con thu gọn thành thanh dính dưới header (mục 4.2).

## 4. Trang

### 4.1 Trang chủ `/` (tham chiếu: 01, 02, 03)

Vùng nội dung (bên phải sidebar), từ trên xuống:

1. **Thanh thông báo** (3.4).
2. **Banner chính**:
   - Rộng 100% vùng nội dung, tỉ lệ **3,9 : 1** (khoảng 1195×305 ở viewport 1536), bo 12, cách thanh thông báo 16.
   - Nút mũi tên trái/phải tròn 40 (nền `rgb(17 24 39 / .6)`, chevron trắng), cách mép 20, giữa theo chiều dọc.
   - Bộ đếm `2/5` ở góc dưới phải: chữ 12/600 trắng, nền `rgb(17 24 39 / .7)`, bo 6, padding 4×8.
   - Tự chạy 5 giây, dừng khi rê chuột, vuốt được. Banner đầu tải ưu tiên.
3. **Tab bộ sưu tập** (cách banner 12):
   - Hàng tab bằng nhau, mỗi tab cao 64, tối thiểu rộng 120, cách nhau 4, bo 8.
   - Chữ 15/500 căn giữa, tối đa 2 dòng.
   - Tab thường: nền `page-bg`, chữ `muted`. Tab đang chọn: nền `sale-soft`, chữ `sale`, 600.
   - Tối đa 8 tab; thừa thì hàng tab cuộn ngang.
   - Tab lấy từ `collections` có `show_as_home_tab = true`, theo `home_sort`; tab đầu tiên chọn sẵn.
   - Đổi tab thì nạp sản phẩm của bộ sưu tập đó (không tải lại trang, có skeleton).
4. **Lưới sản phẩm của tab**:
   - 2 hàng thẻ sản phẩm, cuộn ngang theo trang. Số cột theo mục 4.4, cách nhau ngang 8, dọc 12.
   - Nút "›" tròn 40 (như nút banner) ở mép phải, giữa hai hàng; nút "‹" hiện khi đã cuộn.
   - Dưới lưới: link "Xem tất cả" căn giữa (15/600, `primary`), cách 16, dẫn tới `/bo-suu-tap/[slug]`.
5. **Các khối theo danh mục/bộ sưu tập** (tham chiếu 03), cách nhau 32:
   - Đầu khối: dải cao 72, bo 8 trên, nửa trái là ảnh tiêu đề (tỉ lệ 7:1), nửa phải nền `page-bg`. Nếu không có ảnh thì dùng tiêu đề chữ 18/700 + link "Xem tất cả" bên phải.
   - Thân: lưới 2 hàng cuộn ngang như mục 4, kèm link "Xem tất cả".
   - Nguồn: `collections` có `show_on_home` và các danh mục cấp 1 được đánh dấu hiện trang chủ.
6. **Khối cam kết**: 4 ô ngang (icon 32 + tiêu đề 15/600 + mô tả 13/400), nền trắng, viền `border`, bo 8. Nội dung: Giao nhanh trong 40km · Thanh toán chuyển khoản an toàn · Đổi trả · Tích điểm.
7. **Footer**.

**Mobile**: thanh thông báo → banner (16:9, ảnh mobile riêng, bo 8, lề 12) → lưới icon danh mục (2 hàng cuộn ngang, ảnh tròn 56 + tên 12px, thấy khoảng 4,5 cột) → tab bộ sưu tập dạng chip cuộn ngang (cao 36) → lưới 2 cột (6 sản phẩm) + "Xem tất cả" → các khối: tiêu đề chữ + carousel ngang (thấy 2,3 thẻ).

#### 4.1.1 Dialog chọn hình thức nhận hàng
- Mở từ thanh hình thức mua hoặc chip trên mobile. Là modal trên desktop (rộng 520), bottom sheet trên mobile.
- Segmented: "Giao tận nơi" | "Nhận tại cửa hàng".
  - Giao tận nơi: chọn địa chỉ đã lưu (hội viên) hoặc nhập tỉnh/thành, phường/xã, số nhà + ghim bản đồ. Kiểm tra bán kính 40km ngay và báo kết quả.
  - Nhận tại cửa hàng: hiện địa chỉ cửa hàng, giờ mở cửa.
- Lưu lựa chọn vào cookie `delivery_pref` (không nhạy cảm; địa chỉ đầy đủ chỉ lưu khi là hội viên). Checkout điền sẵn từ lựa chọn này.

### 4.2 Trang danh mục `/danh-muc/[...slug]` (tham chiếu: 05, 06, 07)

1. **Breadcrumb**: 14/400. Link màu `primary`, trang hiện tại màu `muted`, phân cách ` / `. Cách trên 16.
2. **H1** tên danh mục (20/600), cách 12.
3. **Khối danh mục con**:
   - Nền trắng, viền `border`, bo 12, padding 20×24.
   - Các mục ngang cách nhau 44, rộng 110: ảnh tròn 72 (nền `page-bg`) + tên 15/400 căn giữa, tối đa 2 dòng, cắt bằng "...".
   - Nhiều mục thì cuộn ngang, có nút mũi tên.
   - Bấm → trang danh mục con.
4. **Khối "Khuyến mãi HOT" trong danh mục** (chỉ hiện nếu có sản phẩm đang giảm giá trong danh mục):
   - Nền `sale-soft`, bo 8, padding 0 20 20.
   - Nhãn góc trên trái: nền `sale`, chữ trắng 18/700, padding 10×20, bo 0 0 8 0.
   - Bên trong: carousel 1 hàng thẻ sản phẩm trên nền trắng bo 8, nút "›".
5. **Thanh lọc và sắp xếp**:
   - "Lọc" (icon phễu + chữ 16/600 `primary`) mở panel lọc.
   - Chip sắp xếp (cao 32, padding ngang 16, bo tròn, nền `page-bg`, chữ 14/500 `muted`; chip đang chọn nền `primary-soft`, chữ `primary`): Khuyến mãi · Giá thấp đến cao · Giá cao đến thấp · Bán chạy.
6. **Dòng đếm**: "Có **1.121** sản phẩm trong {tên danh mục}" (16/400, số 700), cách 20.
7. **Lưới sản phẩm**: số cột theo mục 4.4; khoảng cách ngang 8, dọc 16. Tải thêm bằng nút "Xem thêm sản phẩm" + `?trang=` trên URL.
8. **Khối SEO cuối trang**: "Thông tin về {danh mục}" (nội dung `seo_content`, thu gọn 160px + "Xem thêm") và "Các danh mục khác" (chip link).

**Hành vi cuộn** (tham chiếu 06): khi khối danh mục con cuộn khuất, hiện một thanh dính dưới header: cao 56, nền trắng, bóng dưới nhẹ, các mục dạng icon 24 + tên 15/400 (cắt "...", rộng tối đa 140), cách nhau 40.

**Panel lọc**:
- Desktop là dialog phải rộng 380; mobile là bottom sheet.
- Nhóm lọc: Thương hiệu (checkbox, có ô tìm), Khoảng giá (2 ô số + các mốc nhanh), Đang giảm giá, Còn hàng.
- Nút "Xóa lọc" và "Xem {n} sản phẩm". Bộ lọc lưu trên URL.

**Mobile**: breadcrumb ẩn; H1 16/600; danh mục con thành hàng chip ảnh cuộn ngang (ảnh 48); thanh lọc dính dưới header; lưới 2 cột.

### 4.3 Tìm kiếm (tham chiếu: 10, 11)

**Dropdown desktop**:
- Mở khi focus ô tìm kiếm. Dính sát dưới ô (cách 12), rộng bằng ô + 60 (khoảng 625), nền trắng, bo 8, bóng dropdown, padding 20.
- Phần còn lại của trang phủ `overlay`, header tối nhẹ.
- **Chưa gõ** (11):
  - "Danh mục nổi bật" (14/600): carousel ảnh tròn 80 + tên 15/400, 2 dòng, thấy 6, có nút "›".
  - Đường kẻ.
  - "Sản phẩm nổi bật" (14/600): carousel thẻ sản phẩm thu gọn, thấy 3, có nút "›".
  - Nếu có: "Tìm kiếm gần đây" (chip, lưu trên máy, có nút xóa).
- **Đang gõ** (10), debounce 250ms, từ 1 ký tự:
  - Hàng danh mục khớp: ảnh tròn 80 + tên, tối đa 6.
  - Đường kẻ.
  - "Đề xuất" (14/500 `muted`): tối đa 10 dòng gợi ý. Mỗi dòng cao 55: icon kính lúp 20 + chữ 17px, phần khách đã gõ 400, phần gợi ý thêm **700**.
  - Nguồn gợi ý: từ khóa phổ biến admin cấu hình + tên sản phẩm khớp tiền tố (không dấu vẫn khớp).
  - Bấm gợi ý hoặc Enter → `/tim-kiem?q=`.
- Bàn phím: mũi tên lên/xuống chọn dòng, Enter mở, Esc đóng.

**Mobile**: màn toàn màn hình, nút quay lại + ô tìm kiếm tự focus; nội dung như dropdown, xếp dọc.

**Trang kết quả** `/tim-kiem?q=`: như trang danh mục (thanh lọc, đếm, lưới). Không có kết quả: minh họa, "Không tìm thấy sản phẩm cho '{q}'", gợi ý danh mục nổi bật.

### 4.4 Thẻ sản phẩm (tham chiếu: 02, 03, 07)

```
┌──────────────────────┐  rộng ~191 (viewport 1536, 6 cột)
│[-23%]                │  badge: góc trên trái, cách 4
│                      │
│     ẢNH 1:1, bo 8    │
│                      │
│ [nhãn chiến dịch]    │  (tùy chọn) dải chữ trên ảnh, góc trên phải
└──────────────────────┘
 Cà chua bi VietGAP      ← 14/400/18, 2 dòng, cách ảnh 8
 túi 500g
 22.900đ                 ← 16/700 sale, cách 6
 2̶9̶.̶9̶0̶0̶đ̶  Tiết kiệm 7K   ← 11 faint gạch ngang + 11/700 success
 Flash sale · 02:14:55   ← (tùy chọn) 12/500 sale gạch chân
 [   🛒 Mua   ]          ← cao 40, bo tròn, nền primary-soft, chữ primary 15/600
```

- Thẻ phẳng (không viền, không bóng). Nút luôn nằm đáy thẻ (`flex-col` + `mt-auto`) để các nút trong một hàng thẳng nhau dù thẻ có hay không có dòng phụ.
- Badge giảm giá: nền `badge-discount`, chữ 13/700, padding 2×6, bo 4.
- Nhãn chiến dịch (tùy chọn, từ `collections.card_ribbon_text`, ví dụ "Bán chạy"): dải nền `sale`, chữ trắng 11/700 in hoa, 2 dòng tối đa. Không dùng khung ảnh viền đỏ như bản gốc.
- Dòng phụ dưới giá (tùy chọn): flash sale đang chạy (có đếm ngược) hoặc ghi chú ngắn.
- Nút: "🛒 Mua"; combo thì "🛒 Mua combo". Sau khi thêm, nút đổi thành bộ tăng giảm cùng kích thước: `[−]  2  [+]`, nút tròn 32 nền trắng, chữ số 15/700.
- Nhiều quy cách: bấm "Mua" mở bộ chọn quy cách (popover dưới nút trên desktop, bottom sheet trên mobile), dùng lại thẻ quy cách ở mục 4.5.
- Hết hàng: ảnh mờ 50%, nhãn "Hết hàng" giữa ảnh, nút xám không bấm được.
- Hover (desktop): ảnh phóng nhẹ 1.03, tên đổi màu `primary`.
- Skeleton cùng kích thước.

**Số cột lưới** (vùng nội dung):

| Viewport | Có sidebar | Số cột |
|---|---|---|
| ≥ 1440 | có | 6 |
| 1280–1439 | có | 5 |
| 1024–1279 | không | 5 |
| 768–1023 | không | 4 |
| 600–767 | không | 3 |
| < 600 | không | 2 (khoảng cách 8, lề 12) |

### 4.5 Chi tiết sản phẩm `/san-pham/[slug]` (tham chiếu: 08, 09)

Bố cục 2 cột trong vùng nội dung: **trái co giãn**, **phải cố định 390px**, cách nhau 24.

**Cột trái:**
1. Breadcrumb đầy đủ các cấp (15/400 `muted`, link `primary` khi hover), cách trên 16.
2. **Gallery**:
   - Cột thumbnail dọc bên trái, mỗi ô 78×78, viền `border`, bo 4, cách nhau 8; ô đang chọn viền 2px `primary`.
   - Ảnh chính bên phải cột thumbnail, vuông, tối đa 480.
   - Badge giảm giá lớn ở góc trên trái vùng ảnh chính: nền `danger`, chữ trắng 20/700, padding 6×16, bo 4.
   - Bấm ảnh mở lightbox (vuốt/mũi tên, Esc đóng).
3. **Sản phẩm tương tự**: khối trắng viền `border` bo 8, tiêu đề 18/700, carousel thẻ sản phẩm (thấy 3–4).
4. **Mô tả**: khối trắng viền bo 8, padding 20.
   - Tiêu đề "Mô tả" 18/600.
   - Nội dung 15/400/1,6 `text-2`. Thu gọn cao 220 với lớp mờ dần ở đáy.
   - "Xem chi tiết" 16/600 `primary` căn giữa, mở rộng/thu gọn.
5. **Thông tin sản phẩm**: bảng 2 cột (nhãn `muted` rộng 180, giá trị `text`), các dòng kẻ mảnh: Xuất xứ · Thương hiệu · Quy cách · Hạn sử dụng · Thành phần · Hướng dẫn sử dụng · Bảo quản. Ẩn dòng không có dữ liệu.

**Cột phải — khối mua hàng** (dính `top: 86px` khi cuộn), nền trắng, viền `border`, bo 8, padding 16:
1. **Hàng giá**:
   - Giá 28/700 `sale` (`đ` 18px), giá gốc 16/400 gạch ngang `faint`, "Tiết kiệm 10K" 16/700 `success`.
   - Nút chép link 32×32 (viền, bo 6) ở góc phải.
2. **Tên sản phẩm** 18/600 `text`, cách 8 trên, 12 dưới.
3. **Thẻ quy cách**:
   - Lưới 2 cột, các thẻ liền nhau chung viền.
   - Mỗi thẻ padding 10×12:
     - tên quy cách 16/600,
     - giá 14/700 `sale` + đơn giá quy đổi 12/400 `muted` `(13.500đ / gói)`,
     - dòng trạng thái: nhãn "Còn hàng" (12/600, nền `success-soft`, chữ `success`, bo 4) + "· Giao trong ngày" 12/400 `muted`, hoặc "Chỉ còn 3" (`danger`), hoặc "Hết hàng",
     - badge `-37%` ở góc trên phải (nền `danger`, chữ trắng 14/700, bo góc dưới trái 4).
   - Đang chọn: viền 1,5px `primary`, nền `primary-softer`, tên màu `primary`.
   - Chỉ có 1 quy cách thì vẫn hiện 1 thẻ.
4. **Nút chính**:
   - Cao 44, rộng 100%, bo tròn, nền `primary`, chữ trắng 17/600: "Thêm vào giỏ · 17.000đ" (giá theo quy cách đang chọn), cách trên 12.
   - Đã có trong giỏ: nút chia đôi, trái là bộ tăng giảm, phải là "Xem giỏ hàng".
5. **Dòng thông tin**: mỗi dòng cao 46, icon 20 `muted` + chữ 16/400 `text-2` + chevron, kẻ ngăn giữa các dòng. Nội dung: "Miễn phí giao cho đơn từ 300.000đ", "Chính sách đổi trả". Bấm mở dialog nội dung.
6. **"Thương hiệu: {TÊN}"** 14/400 + tên 14/700 `primary` (link tới tìm kiếm theo thương hiệu).
7. Hàng có cồn: dòng cảnh báo "Chỉ bán cho khách từ 18 tuổi" (13/500 `danger`).

**Mobile**: ảnh vuốt ngang toàn chiều rộng (chấm + "1/4"), badge góc trên trái → khối giá, tên, quy cách (lưới 2 cột) → dòng thông tin → sản phẩm tương tự → mô tả, thông tin (accordion). Thanh dính đáy: `[− 1 +]` + nút "Thêm vào giỏ · 17.000đ".

SEO: `generateMetadata` (tên, mô tả ngắn, ảnh), JSON-LD `Product` + `BreadcrumbList`.

### 4.6 Giỏ hàng `/gio-hang` (tham chiếu: 12)

Không có sidebar.
- Dải tiêu đề: nền trắng, cao 96, "Giỏ hàng" 28/600 căn trái trong container.
- Thân: nền `page-bg`, padding trên 32, container 1240, 2 cột: **trái co giãn** | **phải 405**, cách 24.

**Cột trái** (các khối trắng bo 8, cách nhau 12):
1. **Khối ưu đãi giao hàng**:
   - Cao 56, padding ngang 20.
   - Chữ 16/500 `sale`: "Mua thêm 55.000đ để được miễn phí giao hàng" + thanh tiến độ mảnh (4px) bên dưới. Đủ điều kiện thì "Đơn hàng được miễn phí giao hàng".
2. **Hàng tổng quát**: "{n} sản phẩm" (16/400) bên trái; "Xóa tất cả" (16/600 `primary`, có xác nhận) bên phải.
3. **Nhóm "CÒN HÀNG"** (nhãn 13/600 `muted` in hoa, cách 16) rồi danh sách món. Mỗi món padding 16×20, kẻ ngăn giữa các món:
   - ảnh 48×48 viền `border` bo 4,
   - tên 14/400 `text-2` (2 dòng) + quy cách 12 `muted`,
   - giá 16/700 `sale` + giá gốc 13 gạch ngang `faint`,
   - cảnh báo (15/400 `danger`) nếu có: "Chỉ còn 2 sản phẩm" / "Giá đã thay đổi" / "Flash sale đã kết thúc",
   - icon thùng rác 20 `muted` ở góc dưới trái,
   - bộ tăng giảm ở góc dưới phải: nút tròn 40 nền `primary-soft` icon `primary`, số lượng 16/600 rộng 40.
4. **Nhóm "HẾT HÀNG / NGỪNG BÁN"** (nếu có): món mờ, chỉ có nút xóa. Không tính vào tạm tính.

**Cột phải** (dính `top: 86px`): khối trắng bo 8, padding 20.
- "Tạm tính ({n} món)": 18/600, số món 400.
- Bên phải: "Tiết kiệm 47K" 13/600 `success`, dưới là tổng 20/700 `sale`.
- Dòng phí giao dự kiến (14 `muted`).
- Nút "Tiến hành đặt hàng" cao 44, rộng 100%, bo tròn, nền `primary`, chữ trắng 16/600, cách 16.

**Ngăn giỏ hàng (drawer)** mở từ header, rộng 420: tiêu đề + danh sách món dạng gọn + khối ưu đãi + tạm tính + 2 nút "Xem giỏ hàng" (viền) và "Đặt hàng" (nền).

**Giỏ trống**: minh họa, "Giỏ hàng của bạn đang trống", nút "Tiếp tục mua sắm", carousel sản phẩm nổi bật.

**Mobile**: bỏ dải tiêu đề (dùng header trang có nút quay lại), danh sách món, thanh dính đáy (tổng + nút "Đặt hàng").

### 4.7 Đặt hàng `/thanh-toan` (thiết kế riêng)

Bố cục như giỏ hàng (không sidebar, nền `page-bg`, 2 cột: trái co giãn, phải 405 dính). Các khối trắng bo 8 bên trái:

1. **Hình thức nhận hàng**: segmented `Giao tận nơi | Nhận tại cửa hàng` (điền sẵn từ `delivery_pref`).
2. **Người nhận và địa chỉ**:
   - Hội viên: chọn từ sổ địa chỉ hoặc thêm mới.
   - Khách vãng lai: họ tên, SĐT, tỉnh/thành, phường/xã, số nhà + đường, ghim bản đồ.
   - Ngoài 40km: báo ngay tại khối và gợi ý nhận tại cửa hàng.
   - Nhận tại cửa hàng: địa chỉ + bản đồ nhỏ + chọn khung giờ (chip theo ngày, rồi theo giờ).
3. **Ghi chú cho người giao** (tối đa 300 ký tự).
4. **Điểm thưởng** (hội viên): công tắc "Dùng điểm", số điểm, số tiền được giảm. Khách vãng lai: "Đăng nhập để tích điểm".
5. **Sản phẩm** (thu gọn "{n} sản phẩm ▾").
6. **Thanh toán**: một lựa chọn "Chuyển khoản ngân hàng (VietQR)" + một dòng giải thích xác nhận tự động.
7. **Xác nhận 18+** nếu có hàng có cồn.

Cột phải: tạm tính, phí giao, giảm từ điểm, tổng (20/700 `sale`), nút "Đặt hàng" (44, `primary`), dòng nhỏ về Điều khoản.

Trạng thái:
- Đang gửi: nút spinner và bị khóa.
- `PRICE_CHANGED`: dialog so sánh giá cũ/mới.
- `OUT_OF_STOCK`: liệt kê món thiếu.
- Lỗi form: hiện dưới từng trường, cuộn tới lỗi đầu.

Mobile: các khối xếp dọc, thanh dính đáy (tổng + "Đặt hàng").

### 4.8 Trang đơn hàng và thanh toán `/don-hang/[id]` (thiết kế riêng)

Container 1240, nền `page-bg`.
- **Stepper trạng thái** (khối trắng): Chờ thanh toán → Đã thanh toán → Đang chuẩn bị → Đang giao / Sẵn sàng nhận → Hoàn tất.

**Khi chờ thanh toán** (desktop 2 cột: trái là QR, phải là thông tin):
- QR 280×280 trong khung trắng, bên dưới là nút "Lưu ảnh QR".
- Bảng thông tin: Ngân hàng, Số tài khoản [Chép], Chủ tài khoản, Số tiền [Chép], Nội dung [Chép]. Nội dung tô nền `sale-soft` + cảnh báo "Giữ nguyên nội dung chuyển khoản".
- Đếm ngược "Còn 14:32" theo giờ server.
- Nút "Tôi đã chuyển khoản" (viền) và link "Hủy đơn".
- Mobile: khối QR ở trên cùng, hướng dẫn 3 bước "Lưu ảnh QR → mở app ngân hàng, quét QR, chọn ảnh → xác nhận". Lý do: khách không quét được QR trên chính điện thoại mình.
- Chuyển sang PAID: hiệu ứng thành công ngắn, trang tự cập nhật.

**Sau khi thanh toán**:
- Tóm tắt đơn (món, tiền, địa chỉ hoặc khung giờ).
- Thẻ "Mã nhận hàng" (QR + PIN) chỉ hiện khi đúng trạng thái, kèm cảnh báo chỉ đưa mã khi đã nhận đủ hàng.
- Nút "Mua lại"; hotline.

**Hết hạn / đã hủy / cần đối soát**: thông báo rõ ràng, không dùng chữ "thất bại" khi đang đối soát.

### 4.9 Đăng nhập, đăng ký, quên mật khẩu (thiết kế riêng)

- Desktop: không sidebar, nền `page-bg`, thẻ trắng giữa màn hình rộng 420, bo 12, padding 32.
- Mobile: toàn màn hình.
- Ô SĐT có tiền tố `+84`, `inputMode="tel"`.
- Ô OTP: 6 ô, tự nhảy ô, dán được, `autocomplete="one-time-code"`, gửi lại sau 60 giây.
- Mật khẩu có nút hiện/ẩn. Turnstile trên nút gửi.
- Sau khi đăng nhập, quay lại trang trước (chỉ nhận đường dẫn nội bộ).

### 4.10 Tài khoản và đơn hàng (tham chiếu: 15, và mô tả trang đơn hàng)

**`/tai-khoan`**: không sidebar, nền `page-bg`, container 1100, padding trên 48, 2 cột.
- **Trái 360**: avatar tròn 64 (chữ cái đầu, nền `primary`, chữ trắng 28/600) + tên 24/600 + chevron. Bấm → sửa thông tin cá nhân.
- **Phải co giãn**:
  - Hàng 3 ô: cao 72, nền trắng, bo 4, bóng nhẹ, padding 16, icon 22 + nhãn 16/600, cách nhau 16. Nội dung: "Điểm thưởng" (kèm số điểm), "Đơn hàng", "Sổ địa chỉ".
  - Các nhóm danh sách (khối trắng, cách nhau 24), mỗi dòng cao 48: icon 22 + nhãn 18/400 + chevron, kẻ ngăn.
    - Nhóm 1: Hạng thành viên, Bảo mật (đổi mật khẩu).
    - Nhóm 2: Điều khoản, Chính sách bảo mật, Đăng xuất.

**`/tai-khoan/don-hang`**: container 970 giữa.
- H1 "Đơn hàng của tôi" 28/600.
- **Tab trạng thái**: chữ 16/500, cách nhau 40; tab đang chọn chữ `primary` + gạch dưới 2px `primary`; viền dưới cả hàng `border`. Các tab: Tất cả · Chờ thanh toán · Đã thanh toán · Đang chuẩn bị · Đang giao · Chờ nhận · Hoàn tất · Đã hủy. Mobile cuộn ngang.
- **Chip thời gian**: "Trong 3 tháng", "Trong 6 tháng", "Tất cả" (13/500, viền `border`, bo 4, padding 4×10, nền trắng).
- **Thẻ đơn** (nền trắng, bo 8, padding 12×16, cách nhau 16, trên nền `page-bg`):
  - Hàng 1: ngày "Thứ 7 · 26/09/2026" (15/600) bên trái; tổng tiền 16/700 `primary` + chevron bên phải (bấm vào chi tiết).
  - Hàng 2: icon hình thức + "Giao tận nơi · TVM7K2MQX4P" hoặc "Nhận tại cửa hàng · ..." (14/400 `muted`).
  - Danh sách món: ảnh 40 + tên 15/400, tối đa 3 dòng, rồi "+ {n} sản phẩm khác" (15/400 `muted`).
  - Hàng cuối: badge trạng thái (13/500, bo 4, padding 2×8; màu theo trạng thái: chờ thanh toán `sale-soft`/`sale`, đang xử lý `primary-softer`/`primary`, hoàn tất `success-soft`/`success`, hủy `page-bg`/`muted`) bên trái; bên phải là link "Mua lại" và "Xem chi tiết" (16/600 `primary`, cách nhau 20).
  - Chờ thanh toán thì thêm nút "Thanh toán ngay".

**Mobile**: trang tài khoản thành 1 cột (thẻ tên → 3 ô → danh sách), đơn hàng dùng cùng thẻ đơn.

### 4.11 Trang thành viên `/thanh-vien`

Có sidebar. Từ trên xuống:
- Banner (3,9:1).
- 3–4 ô lợi ích.
- Thẻ các hạng (ngưỡng chi tiêu, tỉ lệ tích, quyền lợi; dữ liệu từ `loyalty_tiers`).
- Cách tích điểm, cách dùng điểm (các bước).
- Câu hỏi thường gặp (accordion có tab nhóm).
- Nút "Đăng ký thành viên".

### 4.12 Khuyến mãi `/khuyen-mai` và bộ sưu tập `/bo-suu-tap/[slug]` (tham chiếu: 14)

- **`/khuyen-mai`**, có sidebar:
  - Banner.
  - Khối trắng viền bo 12, hàng ảnh tròn 110 + tên (các bộ sưu tập đang chạy, rồi danh mục cấp 1), cuộn ngang nếu nhiều.
  - Khối "Khuyến mãi HOT" kiểu mục 4.2 bước 4, nhưng lưới nhiều hàng.
  - Flash sale đang chạy (có đếm ngược).
- **`/bo-suu-tap/[slug]`**: banner riêng (desktop/mobile), mô tả ngắn, thanh sắp xếp, lưới sản phẩm.

### 4.13 Trang tĩnh và trang lỗi

- Chính sách: không sidebar, bài viết rộng tối đa 760, có mục lục dính bên phải trên desktop.
- 404: minh họa, ô tìm kiếm, danh mục nổi bật.
- Offline (PWA): trang đơn giản + nút thử lại.

## 5. Component dùng chung

Khung:
- `SiteHeader`, `DeliveryModeBar`, `CategorySidebar`, `MegaMenuPanel`, `AnnouncementStrip`, `FloatingChatButton`, `SiteFooter`
- `MobileHeader`, `BottomNav`, `MobileCategoryPage`

Sản phẩm:
- `ProductCard`, `ProductRowCarousel` (1 hoặc 2 hàng, cuộn theo trang), `ProductGrid`, `CollectionTabs`
- `SectionHeader` (ảnh hoặc chữ + "Xem tất cả"), `SubcategoryStrip` (thường/dính), `SortChips`, `FilterPanel`
- `PurchaseCard`, `UnitOptionCard`, `ProductGallery`, `CollapsibleDescription`, `SpecTable`
- `SearchBox` + `SearchDropdown`, `BannerCarousel`, `CountdownTimer` (giờ server)

Giỏ hàng, đơn hàng:
- `CartDrawer`, `CartLine`, `FreeShippingProgress`, `SummaryCard`
- `OrderCard`, `StatusBadge`, `StatusStepper`, `QrPaymentPanel`, `CopyField`

Tài khoản:
- `AccountTile`, `MenuList`

Cơ bản:
- `Button` (primary, soft, outline, ghost, danger; sm/md/lg; loading), `IconButton`, `Chip`, `Badge`, `PriceTag`, `QuantityStepper`, `ResponsiveDialog` (modal/bottom sheet), `Drawer`, `Toast`, `Skeleton`, `EmptyState`, `Breadcrumb`, `Tabs`, `Accordion`, `SegmentedControl`, `StickyActionBar`, `OtpInput`, `PhoneInput`, `AddressForm` (2 cấp hành chính), `MapPinPicker`

Mỗi component phải có:
- Đủ trạng thái: mặc định, hover, focus nhìn thấy được, disabled, loading, lỗi.
- Nhãn aria cho icon-only.
- Hiển thị trên trang `/dev/ui` (chỉ ở local).

## 6. Hình ảnh

| Loại | Tỉ lệ | Kích thước gợi ý |
|---|---|---|
| Ảnh sản phẩm | 1:1 | ≥ 800×800, nền trắng |
| Banner chính desktop | 3,9:1 | 1560×400 |
| Banner chính mobile | 16:9 | 750×422 |
| Banner mega menu | 2,2:1 | 580×264 |
| Ảnh tiêu đề khối | 7:1 | 980×140 |
| Icon danh mục (sidebar, danh mục con, mega menu) | 1:1 | 240×240, nền trong |

- Admin upload banner desktop và mobile riêng. Không dùng ảnh lấy từ website khác.
- Văn phong: tiếng Việt thân thiện, xưng "bạn", nhãn nút là động từ.

## 7. Giao diện quản trị

- Tối ưu cho desktop. Các màn nhân viên dùng khi làm việc phải chạy tốt trên điện thoại (thẻ lớn, nút lớn):
  - bảng đơn,
  - checklist đóng gói,
  - giao hàng (nút gọi khách, mở Google Maps),
  - quét bàn giao (camera toàn màn hình, ô PIN lớn).
- Bảng dữ liệu trên mobile chuyển thành danh sách thẻ.
- Màu trạng thái đơn giống phía khách (mục 4.10).

## 8. PWA

- `app/manifest.ts`: tên "Tường Vi Mart", `display: standalone`, `theme_color` = `brand`, icon 192/512 + maskable, `apple-touch-icon`.
- Service worker tối giản:
  - cache tài nguyên tĩnh,
  - có trang offline,
  - KHÔNG cache tài khoản, giỏ hàng, đơn hàng, thanh toán, admin, API.
- Gợi ý cài đặt:
  - Android: dùng `beforeinstallprompt`, hiện sau lần mua thứ 2 hoặc sau 3 lượt truy cập, đóng rồi thì 30 ngày không hiện lại.
  - iOS: hướng dẫn "Chia sẻ → Thêm vào MH chính".

## 9. Tiêu chí nghiệm thu giao diện

- **Khớp tham chiếu**: Playwright chụp ở 1536×696 các trang trang chủ, danh mục, chi tiết sản phẩm, dropdown tìm kiếm, mega menu, giỏ hàng, tài khoản; đặt cạnh ảnh tương ứng trong `docs/reference/kfm-desktop/`.
  - Chủ dự án duyệt theo checklist: vị trí khối, số cột, kích thước header/sidebar/thẻ, khoảng cách.
  - Sai lệch kích thước > 10% so với mục 3–4 phải có lý do.
- Lighthouse mobile (trang chủ, danh mục, chi tiết): Performance ≥ 80, Accessibility ≥ 90, SEO ≥ 90, Best Practices ≥ 90.
- CLS < 0,1; LCP < 2,5 giây (4G mô phỏng).
- Ảnh so sánh hồi quy ở 390px và 1280px cho các trang chính.
- Không cuộn ngang ở 360px.
- Điều hướng bằng bàn phím được: sidebar, mega menu, dropdown tìm kiếm, dialog, carousel.
- Không lộ chữ tiếng Anh hay key kỹ thuật trên giao diện.

## 10. Dữ liệu phục vụ giao diện

Đã đưa vào `DATA_MODEL.md` (mục 3, 9, 10):
- `categories`: `parent_id` (tối đa 3 cấp), `image_path`, `seo_content`, `show_on_home`.
- `products`: `shelf_life`, `ingredients`, `usage_instructions`, `storage_instructions`.
- `banners`: vị trí `HOME_HERO`, `MEGA_MENU_PROMO`, `CATEGORY_TOP`, `PROMO_PAGE`; ảnh desktop/mobile.
- `collections`: `show_as_home_tab`, `show_on_home`, `home_sort`, `card_ribbon_text`, ảnh tiêu đề, banner.
- `store_settings`: `popular_search_terms`, `announcement_text`, `announcement_link`, `zalo_url`.
