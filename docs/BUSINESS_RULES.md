# Quy tắc nghiệp vụ

Đây là "hợp đồng" của hệ thống. Code phải khớp tài liệu này; muốn đổi quy tắc thì đổi tài liệu trước (có chủ dự án đồng ý), rồi mới đổi code và test.
Các con số đánh dấu (*) là giá trị mặc định đang chờ chủ dự án xác nhận (xem `docs/README.md`, mục Câu hỏi mở).

## 1. Vai trò và quyền

| Chức năng | Khách vãng lai | Hội viên | Staff | Admin |
|---|---|---|---|---|
| Xem sản phẩm, tìm kiếm, giỏ hàng | có | có | | |
| Đặt hàng, thanh toán | có | có | | |
| Xem đơn của mình | bằng view token | bằng phiên | | |
| Dùng/tích điểm, lưu địa chỉ | | có | | |
| Bảng đơn cần xử lý (từ PAID trở đi) | | | có | có |
| Nhận đóng gói, checklist, giao hàng, quét bàn giao | | | có | có |
| Xem SĐT/địa chỉ khách | | | chỉ đơn đang xử lý | có |
| Hủy đơn đã thanh toán, hoàn tiền | | | | có + MFA step-up |
| Xử lý giao dịch ngoại lệ | | | | có + MFA step-up |
| Sản phẩm, danh mục, flash sale, nhập kho, điều chỉnh kho | | | | có |
| Danh sách khách, khóa khách, điều chỉnh điểm | | | | có (điều chỉnh > 100 điểm cần MFA step-up) |
| Quản lý nhân viên | | | | có + MFA step-up |
| Cài đặt cửa hàng, tích điểm | | | | có (mục liên quan tiền, gồm đổi chính sách phí giao hàng, cần MFA step-up) |
| Báo cáo, xuất CSV, nhật ký audit | | | | có |

Khách bị khóa (`LOCKED`) không đăng nhập và không đặt hàng được.

Không vai trò nào có chức năng "xác nhận đã thu tiền", "đánh dấu đã thanh toán" hay thu tiền mặt (mục 5.0). Staff chỉ làm việc với đơn đã `PAID`.

## 2. Giá, quy cách, flash sale, combo

- Mỗi sản phẩm có đơn vị gốc; mỗi quy cách bán (`sell_units`) = `base_qty` × đơn vị gốc, có giá riêng.
- Giá một dòng tại thời điểm T:
  - Nếu có flash sale đang bật cho quy cách đó với `starts_at <= T < ends_at` và còn suất (`quantity_cap` null hoặc `quantity_sold + qty <= quantity_cap`): dùng `sale_price`.
  - Ngược lại: dùng `sell_units.price`.
  - Một dòng không được trộn hai mức giá. Nếu flash sale còn ít suất hơn số lượng khách đặt, báo lỗi `FLASH_SALE_INSUFFICIENT` để khách giảm số lượng.
- `per_order_limit` của flash sale và `max_per_order` của quy cách được áp dụng ở server.
- Combo là một sản phẩm có giá riêng. Tồn khả dụng của combo = min(floor(khả dụng thành phần / `base_qty` thành phần)).
- `subtotal` = tổng `line_total` các dòng.
- Hàm `priceCart(lines, catalogSnapshot, now)` là hàm thuần, có unit test cho: giá thường, flash sale đang chạy, vừa hết hạn, chưa bắt đầu, hết suất, combo, nhiều quy cách của cùng sản phẩm.

## 3. Máy trạng thái đơn hàng

| Từ | Sang | Ai | Điều kiện / tác dụng phụ |
|---|---|---|---|
| (mới) | `PENDING_PAYMENT` | khách | Đã giữ kho, giữ điểm, giữ suất flash sale |
| `PENDING_PAYMENT` | `PAID` | PAYMENT | Giao dịch khớp (mục 5.4). Trừ kho thật, trừ điểm thật, sinh `handover_nonce` |
| `PENDING_PAYMENT` | `EXPIRED` | SYSTEM | `now > expires_at + 5 phút`. Trả kho giữ, điểm giữ, suất flash sale |
| `PENDING_PAYMENT` | `CANCELLED` | chủ đơn hoặc admin | Trả kho giữ, điểm giữ, suất flash sale |
| `PAID` | `PACKING` | staff | Nhân viên nhận đơn (`assigned_staff_id`) |
| `PACKING` | `PAID` | staff (của chính mình) hoặc admin | Trả đơn về hàng chờ, bắt buộc lý do |
| `PACKING` | `READY_FOR_PICKUP` | staff | Đơn lấy tại quầy, đã tích đủ checklist |
| `PACKING` | `READY_TO_SHIP` | staff | Đơn giao tận nơi, đã tích đủ checklist |
| `READY_TO_SHIP` | `OUT_FOR_DELIVERY` | staff | Người giao nhận đơn đi giao |
| `OUT_FOR_DELIVERY` | `DELIVERY_FAILED` | staff | Bắt buộc lý do (không liên lạc được, sai địa chỉ...) |
| `DELIVERY_FAILED` | `OUT_FOR_DELIVERY` | staff | Giao lại |
| `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY` | `COMPLETED` | staff | CHỈ khi xác thực bàn giao thành công (mục 6) |
| `PAID`, `PACKING`, `READY_*`, `DELIVERY_FAILED` | `CANCELLED` | admin + MFA | Bắt buộc lý do; nhập lại kho (`CANCEL_RETURN`); trả điểm đã dùng; `refund_status = PENDING` |
| `EXPIRED` | `PAID` | admin + MFA | Chỉ qua màn xử lý giao dịch ngoại lệ, phải giữ lại được đủ kho |

`COMPLETED` và `CANCELLED` là trạng thái cuối. Hoàn tiền sau khi hoàn tất được ghi bằng bản ghi `refunds`, không đổi trạng thái đơn.

Từ `PENDING_PAYMENT` chỉ có đúng 3 đường đi: `PAID`, `EXPIRED`, `CANCELLED`. Không có đường tới `PACKING`, `READY_FOR_PICKUP`, `READY_TO_SHIP`, `OUT_FOR_DELIVERY`, `DELIVERY_FAILED` hay `COMPLETED`, với bất kỳ vai trò hay loại đơn nào, kể cả `PICKUP` (mục 5.0).

Cài đặt: `orders/state-machine.ts` định nghĩa bảng chuyển trạng thái. Hàm `transition(tx, orderId, from, to, actor, reason?)` thực hiện `UPDATE ... WHERE id = $1 AND status = $from`; nếu 0 dòng bị ảnh hưởng thì ném `ConcurrentStateChange`. Mỗi lần chuyển ghi `order_status_history` và `audit_logs` (nếu actor là staff/admin). Có test cho mọi cặp chuyển hợp lệ và một số cặp không hợp lệ.

## 4. Đặt hàng (checkout)

### 4.1 Input `placeOrder`

```
idempotencyKey: uuid (client sinh cho mỗi lần bấm "Đặt hàng")
items: 1..50 dòng { sellUnitId: uuid, qty: int 1..999 }, không trùng sellUnitId
delivery:
  | { type: "DELIVERY", recipientName, recipientPhone, provinceCode, wardCode, street, lat, lng, addressId? }
  | { type: "PICKUP", recipientName, recipientPhone, pickupSlotStart }
pointsToUse: int >= 0 (chỉ hội viên)
note: string <= 300 ký tự
expectedTotal: int (tổng tiền khách đang nhìn thấy)
ageConfirmed?: boolean (bắt buộc true nếu giỏ có hàng có cồn)
captchaToken?: string (bắt buộc với khách vãng lai)
```

### 4.2 Các bước ở server

1. Rate limit (theo IP: 10 lần/10 phút; theo hội viên: 20 lần/giờ). Khách vãng lai phải qua Turnstile.
2. `idempotencyKey` đã tồn tại và cùng chủ → trả lại đơn cũ, không tạo mới.
3. Nạp quy cách, sản phẩm, flash sale, thành phần combo từ DB. Quy cách/sản phẩm ngừng bán → lỗi `ITEM_UNAVAILABLE`.
4. Tính giá bằng `priceCart`.
5. Chọn kho (`fulfillment/strategy.ts`); đơn giao tận nơi phải có tọa độ và nằm trong bán kính giao của kho, nếu không trả `OUT_OF_DELIVERY_RANGE` và gợi ý lấy tại cửa hàng. Tính `distanceKm` ở bước này.
6. Tính phí giao bằng `ShippingFeePolicy.quote(...)` (mục 4.3) và điểm (mục 8), suy ra `total`. Kiểm tra `min_order_amount`, hàng có cồn cần `ageConfirmed`.
7. Nếu `expectedTotal` khác tổng tính được → trả `PRICE_CHANGED` kèm báo giá mới, KHÔNG tạo đơn. Giao diện hiện rõ khác biệt, khách xác nhận lại.
8. Mở transaction:
   - Quy đổi mọi dòng (kể cả combo) về `(product_id, base_qty_total)`, cộng dồn theo sản phẩm, sắp xếp theo `product_id` để tránh deadlock.
   - Giữ kho từng sản phẩm: `UPDATE stock_levels SET reserved = reserved + $q WHERE warehouse_id = $w AND product_id = $p AND on_hand - reserved - safety_stock >= $q`. 0 dòng → rollback, trả `OUT_OF_STOCK` kèm danh sách sản phẩm thiếu.
   - Giữ suất flash sale: `UPDATE flash_sales SET quantity_sold = quantity_sold + $q WHERE id = $id AND (quantity_cap IS NULL OR quantity_sold + $q <= quantity_cap)`.
   - Giữ điểm: `SELECT ... FROM customers WHERE id = $c FOR UPDATE`, kiểm tra điểm khả dụng, tăng `points_held`, ghi ledger `HOLD`.
   - Sinh `order_code` (mục 5.1), thử lại tối đa 5 lần nếu trùng.
   - Tạo `orders` (kèm `shipping_fee`, `shipping_policy`, `shipping_breakdown` chốt tại đây), `order_items` (snapshot tên, quy cách, giá, thành phần combo), `stock_reservations`, `order_status_history`. Mọi đơn, kể cả `PICKUP`, bắt đầu ở `PENDING_PAYMENT`.
   - Khách vãng lai: sinh view token 32 byte, lưu HMAC của token, hạn 60 ngày.
9. Trả về `orderId`, `orderCode`, thông tin chuyển khoản, chuỗi VietQR, `expiresAt`. Khách vãng lai: set cookie httpOnly `ov_<orderId>` chứa view token (path `/don-hang/<orderId>`), đồng thời hiện link có token để khách lưu lại.

### 4.3 Giao nhận và phí giao hàng

- `PICKUP`: chọn khung giờ lấy trong giờ mở cửa (`opening_hours`, khung 30 phút), sớm nhất sau 60 phút tính từ lúc đặt. Vẫn phải chuyển khoản trước như mọi đơn (mục 5.0); đến quầy chỉ để nhận hàng.
- `DELIVERY`: bắt buộc ghim vị trí trên bản đồ + địa chỉ (tỉnh/thành, phường/xã, số nhà đường). Khoảng cách Haversine từ kho ≤ `delivery_radius_km` (mặc định 40). Kiểm tra bán kính này áp dụng cho mọi chính sách phí, kể cả khi phí bằng 0.
- Ngoài giờ mở cửa vẫn nhận đơn, nhưng hiện thông báo thời điểm bắt đầu xử lý.

**Phí giao hàng do một chính sách riêng quyết định** (module `src/server/modules/fulfillment/shipping/`, interface `ShippingFeePolicy`, xem ARCHITECTURE mục 14):

```
quote({ deliveryType, subtotal, distanceKm?, provinceCode, wardCode, warehouseId, now })
  → { fee: int VND >= 0, policy: "FREE" | "FLAT" | "BY_DISTANCE" | "BY_ZONE", breakdown: jsonb }
```

- `distanceKm` chỉ có với `DELIVERY`. Với `PICKUP`, `provinceCode` và `wardCode` là của kho.
- `FREE` (đã hiện thực, mặc định): `fee = 0` cho cả `DELIVERY` lẫn `PICKUP`, bất kể `subtotal` và khoảng cách. Giai đoạn đầu mở bán MIỄN PHÍ giao hàng cho mọi đơn trong bán kính giao.
- `FLAT`, `BY_DISTANCE`, `BY_ZONE`: CHƯA LÀM. Chưa quyết định tính theo km hay theo khu vực (Q16). `FLAT` dùng `shipping_fee_flat` và `free_shipping_threshold` của `store_settings` làm tham số dự phòng; hai cột này không có tác dụng khi chính sách là `FREE`.
- Chính sách đang dùng lấy từ `store_settings.shipping_policy`. Cài đặt chọn chính sách chưa hiện thực thì bị từ chối khi lưu; nếu giá trị đó vẫn xuất hiện trong database thì ứng dụng từ chối khởi động và `placeOrder` báo lỗi nội bộ, không bao giờ tự rơi về 0 hay một mức phí mặc định. Đổi chính sách cần MFA step-up và ghi audit.
- Đơn đã đặt giữ nguyên phí đã chốt: `orders.shipping_fee`, `shipping_policy`, `shipping_breakdown` được ghi lúc đặt, đổi chính sách về sau không tính lại đơn cũ. Công thức `total = subtotal + shipping_fee - points_discount` giữ nguyên.
- Lưu ý khi làm chính sách theo km: tọa độ do khách gửi, nên phải xác định vị trí phía server (geocoding địa chỉ) hoặc để nhân viên xác nhận, tránh khách sửa tọa độ để giảm phí (Q16).

## 5. Thanh toán

### 5.0 Thanh toán trước 100% (quy tắc tường minh)

- Mọi đơn, kể cả `PICKUP`, phải chuyển khoản đủ `total` qua VietQR và được xác nhận theo mục 5.3–5.5 rồi mới được xử lý. Chưa `PAID` thì chỉ giữ kho, không đóng gói, không giao, không bàn giao.
- KHÔNG có COD, không trả tiền khi nhận hàng, không thu tiền mặt (hay quẹt thẻ) tại quầy cho đơn online. Khách đến lấy hàng chỉ để nhận hàng (mục 6).
- Nhân viên KHÔNG có chức năng "xác nhận đã thu tiền", "đánh dấu đã thanh toán" hay nhập số tiền đã thu. Giao diện và API của staff không có hành động nào làm đơn sang `PAID`.
- Chỉ 3 nguồn đưa đơn sang `PAID`: webhook SePay có chữ ký hợp lệ, job đối soát SePay, và admin xử lý giao dịch ngoại lệ (MFA step-up, ghi chú bắt buộc, audit). Đây cũng là bất biến 3 và 19 trong CLAUDE.md.
- Máy trạng thái (mục 3): từ `PENDING_PAYMENT` chỉ đi được tới `PAID`, `EXPIRED`, `CANCELLED`.
- Lớp phòng thủ thứ hai ở database: `orders` có `CHECK` buộc mọi đơn ngoài `PENDING_PAYMENT`, `EXPIRED`, `CANCELLED` phải có `paid_at` (DATA_MODEL mục 6).
- Muốn nhận tiền mặt hay COD sau này thì phải đổi tài liệu này trước (có chủ dự án đồng ý), không thêm tùy chọn ẩn trong code.

### 5.1 Mã đơn / mã thanh toán

- Định dạng: `TVM` + 8 ký tự từ bảng chữ `23456789ABCDEFGHJKMNPQRSTVWXYZ` (bỏ 0, 1, I, L, O, U để khỏi nhầm), sinh bằng `crypto.randomInt`.
- Mã này vừa là mã đơn hiển thị, vừa là nội dung chuyển khoản. Biết mã KHÔNG cho phép xem đơn hay nhận hàng.
- Cấu hình SePay (chủ dự án làm): Cấu trúc mã thanh toán, tiền tố `TVM`, hậu tố tối thiểu 8 tối đa 8, loại "Số và chữ".

### 5.2 Thông tin chuyển khoản và QR

- Tài khoản nhận lấy từ env `PAYEE_*`.
- Chuỗi VietQR (chuẩn EMVCo của NAPAS) tạo tại server trong `server/lib/vietqr.ts`: BIN ngân hàng, số tài khoản, số tiền, nội dung = `order_code`, CRC16 (CCITT-FALSE). Ảnh QR render bằng thư viện QR chạy tại chỗ, không gọi dịch vụ tạo QR bên ngoài.
- Unit test với chuỗi mẫu đã biết; trước khi mở bán, chủ dự án quét thử bằng ít nhất 2 app ngân hàng khác nhau.
- Trang thanh toán hiện: QR, tên ngân hàng, số tài khoản, tên chủ tài khoản, số tiền, nội dung (có nút sao chép), đồng hồ đếm ngược theo `expiresAt` của server, cảnh báo "Giữ nguyên nội dung chuyển khoản".
- Cập nhật trạng thái bằng polling `GET /api/orders/:id/status` (3 giây trong 2 phút đầu, sau đó 10 giây, gọi ngay khi `visibilitychange` sang visible; dừng khi trạng thái khác `PENDING_PAYMENT`). Nút "Tôi đã chuyển khoản" chỉ kích hoạt một lần kiểm tra ngay.

### 5.3 Webhook `POST /api/webhooks/sepay`

1. Đọc raw body (`await req.text()`), giới hạn 64 KB.
2. Header `X-SePay-Timestamp` phải cách thời gian server không quá 300 giây.
3. Tính `"sha256=" + hex(HMAC_SHA256(SEPAY_WEBHOOK_SECRET, timestamp + "." + rawBody))`, so với `X-SePay-Signature` bằng `safeEqual`. Sai → 401, ghi audit `payment.webhook_bad_signature` (không lưu body), tăng bộ đếm cảnh báo.
4. Parse JSON bằng Zod (trường: `id`, `gateway`, `transactionDate`, `accountNumber`, `subAccount`, `code`, `content`, `transferType`, `description`, `transferAmount`, `accumulated`, `referenceCode`). Sai định dạng → 400.
5. `transferType !== "in"` → trả thành công, không xử lý.
6. `INSERT INTO bank_transactions (... sepay_webhook_id = id, source = 'WEBHOOK') ON CONFLICT DO NOTHING`. Nếu đã tồn tại và `process_status <> 'RECEIVED'` → trả thành công ngay (SePay gửi lại).
7. Gọi `processBankTransaction(txId)`.
8. Thành công → HTTP 200, body đúng `{"success": true}`. Lỗi bất ngờ → HTTP 500 để SePay gửi lại (job `retry-bank-tx` cũng xử lý các dòng còn `RECEIVED`). Toàn bộ phải xong trong 30 giây.

### 5.4 `processBankTransaction(txId)` (dùng chung cho webhook, đối soát, thử lại)

Trong một transaction:
1. `SELECT ... FOR UPDATE` giao dịch; nếu `process_status <> 'RECEIVED'` thì dừng.
2. `account_number` khác `PAYEE_ACCOUNT_NO` → `EXCEPTION / WRONG_ACCOUNT`.
3. Mã = `code` SePay trả về, hoặc tìm bằng regex `/TVM[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}/i` trong `content`, đổi sang chữ hoa. Không có → `EXCEPTION / NO_CODE`.
4. `SELECT ... FROM orders WHERE order_code = $code FOR UPDATE`. Không có → `EXCEPTION / ORDER_NOT_FOUND`.
5. Theo trạng thái đơn:
   - `PENDING_PAYMENT`, chưa quá `expires_at + 5 phút`, `amount == total` → chuyển `PAID`: tiêu thụ giữ kho (`on_hand -= q`, `reserved -= q`, movement `SALE`, reservation `CONSUMED`), điểm giữ → `REDEEM`, tạo `payments`, sinh `handover_nonce`, giao dịch `MATCHED`.
   - `PENDING_PAYMENT` nhưng `amount != total` → `EXCEPTION / AMOUNT_MISMATCH` (đơn vẫn chờ).
   - `EXPIRED`, hoặc đã quá hạn ân hạn → `EXCEPTION / ORDER_EXPIRED`.
   - Đã `PAID` hoặc sau đó → `EXCEPTION / DUPLICATE_OR_EXTRA`.
   - `CANCELLED` → `EXCEPTION / ORDER_NOT_PENDING`.
6. Mọi `EXCEPTION` gửi cảnh báo cho chủ shop và hiện trong màn "Giao dịch cần xử lý".

Không bao giờ tự động chấp nhận tiền thừa, tiền thiếu hay tiền đến trễ.

### 5.5 Admin xử lý giao dịch ngoại lệ (MFA step-up, bắt buộc ghi chú)

- Gắn một hoặc nhiều giao dịch vào một đơn và xác nhận thanh toán: tổng các giao dịch phải bằng `total`; nếu đơn đã `EXPIRED` thì phải giữ lại được đủ kho, không đủ thì không cho xác nhận và phải hoàn tiền.
- Đánh dấu "Đã hoàn trả cho khách" (nhập mã giao dịch ngân hàng của lần hoàn).
- Đánh dấu "Không phải tiền bán hàng" (ví dụ tiền cá nhân chuyển vào).

### 5.6 Hết hạn và đối soát

- `expires_at = created_at + payment_window_minutes` (15*). Job `expire-orders` chuyển `EXPIRED` khi `now > expires_at + 5 phút`.
- Khi khách tải trang/poll trạng thái của đơn đã quá hạn ân hạn, server chạy expire cho riêng đơn đó (không chờ cron).
- Job `reconcile-payments` lấy giao dịch mới từ SePay API v2 (`since_id` lưu trong `sync_state`), tối đa 100 giao dịch/trang, tôn trọng giới hạn 3 request/giây, đưa từng giao dịch qua `processBankTransaction`. Trước khi bật ở production, kiểm tra bằng SePay Test mode cách đối chiếu một giao dịch giữa webhook và API để chống trùng đúng.

## 6. Bàn giao hàng

- Khi đơn sang `PAID`, sinh `handover_nonce` 16 byte ngẫu nhiên.
- Token bàn giao = base64url(HMAC_SHA256(`HANDOVER_SECRET`, `order_id || nonce`)); PIN 6 số = lấy từ HMAC với nhãn khác, mod 10^6. Không lưu token/PIN; server tính lại khi cần.
- Khách xem được QR (`TVH1.<orderId>.<token>`) và PIN trên trang đơn khi đơn ở `READY_FOR_PICKUP`, `READY_TO_SHIP`, `OUT_FOR_DELIVERY`. Kèm cảnh báo: chỉ đưa mã khi đã nhận đủ hàng.
- Giao diện staff và admin không bao giờ gọi hàm tính token/PIN.
- Staff xác nhận bằng: quét QR (camera trong trang admin) hoặc nhập mã đơn + PIN.
- Điều kiện: đơn ở `READY_FOR_PICKUP` hoặc `OUT_FOR_DELIVERY`, `handover_locked = false`.
- Sai → `handover_failed_attempts + 1`; đủ 5 lần → khóa bàn giao, báo admin; admin mở khóa có ghi audit.
- Đúng → `COMPLETED`, ghi người xác nhận, cộng điểm (mục 8), cập nhật `lifetime_spent` và hạng.

## 7. Hủy đơn và hoàn tiền

- Khách tự hủy: chỉ khi `PENDING_PAYMENT` (nút trên trang đơn).
- Sau khi đã thanh toán: khách liên hệ hotline; admin hủy (MFA) → nhập lại kho, trả điểm đã dùng (`REDEEM_RETURN`), `refund_status = PENDING`.
- Ghi nhận hoàn tiền: admin nhập số tiền, lý do, tài khoản nhận của khách, có nhập lại kho hay không. Sau khi tự chuyển khoản trong app ngân hàng, admin đánh dấu `DONE` kèm mã giao dịch ngân hàng. Tổng hoàn ≤ số đã thanh toán.
- Hoàn một phần cho đơn đã hoàn tất (hàng lỗi...): thu hồi điểm tương ứng (mục 8), giảm `lifetime_spent`.
- Đơn lấy tại quầy không đến lấy sau 3 ngày*: hiện trong danh sách cần xử lý để admin liên hệ, hủy và hoàn tiền.

## 8. Tích điểm

Tham số (từ `loyalty_settings`, `loyalty_tiers`): `point_value_vnd = 1000`, `max_redeem_bps = 5000` (50%), hạng mặc định* BRONZE 0đ/1%, SILVER 2.000.000đ/2%, GOLD 5.000.000đ/3%, DIAMOND 10.000.000đ/5%.

Công thức (số nguyên, làm tròn xuống):
- `maxPointsUsable = floor(subtotal * max_redeem_bps / (10000 * point_value_vnd))`
- `pointsUsed = min(pointsRequested, points_balance - points_held, maxPointsUsable)`
- `points_discount = pointsUsed * point_value_vnd`
- `eligibleAmount = subtotal - points_discount` (không tính phí giao hàng)
- `pointsEarned = floor(eligibleAmount * earn_bps / (10000 * point_value_vnd))`, với `earn_bps` là hạng của khách tại thời điểm hoàn tất

Ví dụ kiểm tra (phải có trong unit test):
- subtotal 350.000, BRONZE, không dùng điểm → eligible 350.000 → 3 điểm.
- subtotal 350.000, SILVER, dùng 50 điểm → giảm 50.000 → eligible 300.000 → 6 điểm.
- subtotal 99.000, max 50% → dùng tối đa 49 điểm.

Vòng đời:
- Đặt đơn: `HOLD` (tăng `points_held`).
- `PAID`: `REDEEM` (giảm `points_balance` và `points_held`).
- `EXPIRED`/`CANCELLED` trước khi trả tiền: `RELEASE`.
- Hủy sau khi trả tiền: `REDEEM_RETURN` (cộng lại điểm đã dùng).
- `COMPLETED`: `EARN` (*đề xuất cộng khi hoàn tất thay vì khi thanh toán, để tránh cộng điểm cho đơn sau đó bị hủy), `lifetime_spent += eligibleAmount`, nâng hạng nếu đủ ngưỡng (không tự hạ hạng).
- Hoàn tiền sau hoàn tất: `EARN_REVERSAL` = ceil(`points_earned` × tiền hàng được hoàn / `eligibleAmount`), tối đa bằng điểm khả dụng; phần thiếu ghi vào lý do; `lifetime_spent` giảm tương ứng.
- Admin điều chỉnh: `ADJUST`, bắt buộc lý do; > 100 điểm cần MFA step-up.
- Điểm không hết hạn (giai đoạn này).

## 9. Kho

- Nhập kho bằng phiếu nhập (`RECEIPT`). Điều chỉnh (`ADJUSTMENT`, `DAMAGE`) bắt buộc lý do; không được làm `on_hand < reserved`.
- Khách thấy: "Còn hàng", "Chỉ còn N" (khi N ≤ 5), "Hết hàng". Không hiện số tồn thật khi lớn hơn 5.
- `low_stock_threshold` theo sản phẩm; dashboard admin liệt kê sản phẩm dưới ngưỡng.
- Tồn kho luôn tính theo đơn vị gốc; khả dụng của quy cách = floor(khả dụng / `base_qty`).

## 10. Xem đơn

- Hội viên: phiên đăng nhập, `orders.customer_id` khớp.
- Khách vãng lai: cookie `ov_<orderId>` hoặc link có token; server so HMAC của token với `guest_view_token_hash`, kiểm tra hạn. Trang có token trong URL đặt `Referrer-Policy: no-referrer` và sau khi set cookie thì chuyển hướng về URL sạch.
- Đơn khách vãng lai KHÔNG tự gắn vào tài khoản có cùng SĐT.
- API trạng thái chỉ trả `{ status, expiresAt, secondsLeft }`; rate limit 60 request/phút theo IP + đơn.

## 11. Hàng có cồn

- Sản phẩm có `is_alcohol = true`: checkout bắt buộc tích "Tôi xác nhận đã đủ 18 tuổi", lưu `age_confirmed_at`.
- Nhân viên có quyền từ chối giao nếu người nhận chưa đủ tuổi; đơn chuyển `DELIVERY_FAILED` với lý do tương ứng.
- Chủ dự án cần xác nhận điều kiện kinh doanh với tư vấn pháp lý trước khi mở bán mặt hàng này.

## 12. Giới hạn mặc định

| Mục | Giá trị |
|---|---|
| Thời gian chờ thanh toán | 15 phút* + 5 phút ân hạn |
| Số dòng mỗi đơn | 50 |
| Số lượng mỗi dòng | theo `max_per_order` (mặc định 50) |
| Gửi OTP | 1 lần/60 giây/SĐT, 5 lần/ngày/SĐT, 20 lần/ngày/IP, chỉ số di động Việt Nam |
| Đăng nhập sai | từ lần thứ 5 trong 15 phút bắt buộc CAPTCHA; 20 lần/giờ/SĐT thì tạm khóa 1 giờ |
| Nhập PIN bàn giao sai | 5 lần thì khóa bàn giao của đơn |
| Poll trạng thái | 60 request/phút theo IP + đơn |
| Đặt hàng | 10 lần/10 phút/IP |
| Ảnh sản phẩm (ảnh gốc admin tải lên) | JPEG/PNG/WebP, ≤ 12 MB, ≤ 40 megapixel, tối đa 8 ảnh mỗi sản phẩm; hệ thống tự nén theo kích thước hiển thị (ARCHITECTURE mục 15) |
| Nhập Excel | ≤ 2.000 dòng/lần, ≤ 5 MB |
