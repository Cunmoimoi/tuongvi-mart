# Mô hình dữ liệu

## 1. Quy ước chung

- Tất cả bảng nghiệp vụ nằm trong schema `app` (không đặt ở `public`, không expose qua Supabase Data API).
- Khóa chính: `uuid` (`gen_random_uuid()`), trừ khi ghi khác.
- Tiền: `bigint` VND, luôn `CHECK (>= 0)`. Tỷ lệ: `integer` basis points.
- Số lượng tồn kho: `integer` theo **đơn vị gốc** (đơn vị nhỏ nhất bán được). Mọi quy cách bán là bội số nguyên của đơn vị gốc.
- Thời gian: `timestamptz`. Mọi bảng có `created_at`; bảng sửa được có `updated_at` (trigger tự cập nhật).
- Trạng thái dùng Postgres `enum` hoặc `text` + `CHECK`, không để text tự do.
- Xóa mềm (`deleted_at`) cho sản phẩm, danh mục; không xóa cứng dữ liệu đã dính tới đơn hàng.
- Bảng lịch sử (ledger) chỉ INSERT: `inventory_movements`, `point_ledger`, `order_status_history`, `audit_logs`, `bank_transactions` (chỉ cho UPDATE cột trạng thái xử lý).

## 2. Quyền database

- Role `app_runtime` (ứng dụng dùng khi chạy): `USAGE` trên schema `app` và `extensions`; `SELECT, INSERT, UPDATE, DELETE` trên bảng nghiệp vụ; với bảng ledger chỉ `SELECT, INSERT` (riêng `bank_transactions` được UPDATE các cột `process_status`, `processed_at`, `order_id`, `exception_reason`, `attempts`). Không có quyền DDL.
- Role migration (chủ sở hữu schema) chỉ dùng từ CI hoặc máy local, không cấu hình trên Vercel.
  Migration phải **luôn** chạy bằng cùng một role, vì `ALTER DEFAULT PRIVILEGES` chỉ áp dụng cho đối tượng do chính role đã đặt nó tạo ra. `scripts/db-migrate.mts` dừng lại nếu role đang chạy không phải chủ sở hữu schema `app`.
- `anon`, `authenticated` và `service_role` (role của Supabase Data API): KHÔNG có `USAGE` trên schema `app`. `service_role` cũng bị thu hồi vì nó có `BYPASSRLS`, nên RLS một mình không chặn được nó.
- Bật RLS trên mọi bảng `app.*` làm lớp phòng thủ thứ hai, chỉ có policy `FOR ALL TO app_runtime USING (true) WITH CHECK (true)`. Không dùng `FORCE ROW LEVEL SECURITY` để role migration vẫn nạp được dữ liệu seed.
- Migration đầu tiên phải tạo role, grant, RLS; có test tích hợp kiểm tra `anon` không đọc được bảng nào.

### 2.1 Quyền mặc định và các hàm dùng lại

Migration nền (`drizzle/0000_foundation.sql`) đặt `ALTER DEFAULT PRIVILEGES` trong schema `app`, nên **bảng tạo về sau tự động** có `SELECT, INSERT, UPDATE, DELETE` cho `app_runtime`, sequence có `USAGE, SELECT`, và function mới bị thu hồi `EXECUTE` khỏi `PUBLIC`. Không cần viết lại GRANT trong từng migration.

Sau mỗi `CREATE TABLE` trong schema `app`, gọi các hàm sau (chúng đã bị thu hồi `EXECUTE` khỏi `PUBLIC`, nên `app_runtime` không gọi được):

| Hàm | Việc |
|---|---|
| `app.enable_app_rls('<bảng>')` | Bật RLS và tạo policy `app_runtime_all`. Gọi cho **mọi** bảng. |
| `app.attach_updated_at('<bảng>')` | Gắn trigger `set_updated_at` (dùng `app.set_updated_at()`). Gọi cho bảng có cột `updated_at`. |
| `app.make_append_only('<bảng>')` | Quy ước bảng ledger: thu hồi `UPDATE, DELETE, TRUNCATE` của `app_runtime`, chỉ còn `SELECT, INSERT`. |
| `app.make_append_only('<bảng>', array['cột1','cột2'])` | Như trên nhưng cấp lại `UPDATE` theo từng cột. Chỉ dùng cho `bank_transactions`. |

Ví dụ cho các bảng ledger ở mục 1:

```sql
select app.enable_app_rls('point_ledger');
select app.make_append_only('point_ledger');

select app.enable_app_rls('bank_transactions');
select app.make_append_only(
  'bank_transactions',
  array['process_status', 'processed_at', 'order_id', 'exception_reason', 'attempts']
);
```

## 3. Danh mục và sản phẩm

**categories**: `id`, `parent_id NULL` FK (tối đa 3 cấp, kiểm trong service + test), `name`, `slug` UNIQUE, `image_path` (icon danh mục), `seo_content text NULL` (khối "Thông tin về danh mục"), `show_on_home bool default false`, `sort_order int`, `is_active bool`, `deleted_at`, timestamps. Index `(parent_id, sort_order)`.

**products**: `id`, `category_id` FK (gắn vào danh mục cấp thấp nhất), `name`, `slug` UNIQUE, `description`, `origin`, `brand`, `shelf_life`, `ingredients`, `usage_instructions`, `storage_instructions`, `base_unit_name` (vd "Chai", "Gói", "100g"), `type` (`SIMPLE` | `COMBO`), `is_active`, `is_alcohol bool default false`, `badges text[]`, `search_vector tsvector` (generated, dùng `unaccent`), `deleted_at`, timestamps.

**product_images**: `id`, `product_id` FK, `storage_path`, `alt`, `sort_order`, `is_primary`. Một sản phẩm tối đa 8 ảnh. UNIQUE partial `(product_id) WHERE is_primary`.

**sell_units** (quy cách bán, thay cho `unitConversions` cũ): `id`, `product_id` FK, `sku` UNIQUE, `barcode`, `name` (vd "Lốc 4", "Thùng 24"), `base_qty int CHECK (base_qty >= 1)`, `price bigint CHECK (price >= 0)`, `compare_at_price bigint NULL`, `is_default bool`, `is_active`, `max_per_order int default 50`. UNIQUE partial `(product_id) WHERE is_default`.
Quy tắc: không còn phép "chia". Nếu cần bán 500g từ hàng tính theo kg, đặt đơn vị gốc là 100g.

**combo_components**: `combo_product_id` FK (type COMBO), `component_product_id` FK (type SIMPLE), `base_qty int CHECK (> 0)`. PK `(combo_product_id, component_product_id)`. Combo không có dòng tồn kho riêng; bán combo nghĩa là trừ kho các thành phần.

**flash_sales**: `id`, `sell_unit_id` FK, `sale_price bigint CHECK (>= 0)`, `starts_at`, `ends_at` (`CHECK ends_at > starts_at`), `quantity_cap int NULL`, `quantity_sold int default 0` (tính cả suất đang giữ cho đơn chờ thanh toán; trả lại khi đơn hết hạn/hủy), `per_order_limit int NULL`, `is_active`, `created_by`. Index `(sell_unit_id, starts_at, ends_at)`.
Ràng buộc: không cho hai flash sale đang bật chồng thời gian trên cùng `sell_unit_id` (exclusion constraint với `tstzrange`, cần extension `btree_gist`).

## 4. Kho

**warehouses**: `id`, `code` UNIQUE, `name`, `address`, `province_code`, `ward_code`, `lat numeric(9,6)`, `lng numeric(9,6)`, `delivery_radius_km int default 40`, `is_active`, `is_default_online bool`. Seed một kho `ONLINE_MAIN`.

**stock_levels**: PK `(warehouse_id, product_id)`, `on_hand int`, `reserved int default 0`, `safety_stock int default 0`, `low_stock_threshold int default 5`, `updated_at`.
`CHECK (on_hand >= 0 AND reserved >= 0 AND reserved <= on_hand)`.
Số bán được online = `on_hand - reserved - safety_stock`.

**stock_reservations**: `id`, `order_id` FK, `warehouse_id`, `product_id`, `qty int CHECK (> 0)`, `status` (`ACTIVE` | `CONSUMED` | `RELEASED`), `created_at`, `closed_at`. Index `(order_id)`, `(status) WHERE status = 'ACTIVE'`.

**inventory_movements** (chỉ INSERT): `id`, `warehouse_id`, `product_id`, `qty_delta int` (âm là xuất), `type` (`RECEIPT` | `SALE` | `ADJUSTMENT` | `CANCEL_RETURN` | `CUSTOMER_RETURN` | `DAMAGE`), `ref_type`, `ref_id`, `unit_cost bigint NULL`, `note`, `actor_id`, `created_at`. Index `(warehouse_id, product_id, created_at)`.

**goods_receipts** (phiếu nhập): `id`, `code` UNIQUE, `warehouse_id`, `supplier_name`, `note`, `created_by`, `created_at`; **goods_receipt_lines**: `receipt_id`, `product_id`, `qty`, `unit_cost`.

## 5. Khách hàng, địa chỉ, nhân viên

**admin_units**: `code` PK, `name`, `level` (`PROVINCE` | `WARD`), `parent_code` NULL, `is_active`. Dữ liệu 34 tỉnh/thành và phường/xã theo đơn vị hành chính mới (áp dụng từ 01/07/2025). Nguồn dữ liệu phải là danh mục chính thức; ghi nguồn và ngày cập nhật trong script import.

**customers**: `id` = `auth.users.id` (uuid, PK), `phone_e164` UNIQUE, `full_name`, `email NULL`, `tier` (`BRONZE` | `SILVER` | `GOLD` | `DIAMOND`), `points_balance int default 0 CHECK (>= 0)`, `points_held int default 0 CHECK (>= 0)`, `lifetime_spent bigint default 0`, `status` (`ACTIVE` | `LOCKED`), `locked_reason`, `consent_analytics bool default false`, `consent_marketing bool default false`, `consent_updated_at`, timestamps.
Điểm có thể dùng = `points_balance - points_held`.

**customer_addresses**: `id`, `customer_id` FK, `recipient_name`, `recipient_phone`, `province_code` FK, `ward_code` FK, `street`, `lat`, `lng`, `is_default`. Tối đa 10 địa chỉ mỗi khách.

**staff_members**: `user_id` PK (= `auth.users.id`), `username` UNIQUE (chữ thường, `^[a-z0-9._]{3,32}$`), `full_name`, `phone`, `role` (`ADMIN` | `STAFF`), `warehouse_id NULL` (dự phòng đa kho), `is_active`, `must_change_password bool`, `created_by`, timestamps.

## 6. Đơn hàng

**orders**:
- Định danh: `id`, `order_code` UNIQUE (`TVM` + 8 ký tự, xem BUSINESS_RULES 5.1), `idempotency_key uuid` UNIQUE.
- Chủ đơn: `customer_id NULL` FK, `guest_view_token_hash bytea NULL`, `guest_view_token_expires_at`.
- Giao nhận: `delivery_type` (`DELIVERY` | `PICKUP`), `warehouse_id` FK, `recipient_name`, `recipient_phone`, `province_code`, `ward_code`, `street`, `lat`, `lng`, `distance_km numeric(6,2)`, `pickup_slot_start`, `pickup_slot_end`, `customer_note`.
- Tiền (snapshot lúc đặt): `subtotal`, `shipping_fee`, `points_used int`, `points_discount`, `total` (tất cả `bigint CHECK >= 0`), `CHECK (total = subtotal + shipping_fee - points_discount)`.
- Điểm: `points_to_earn int` (ước tính lúc đặt, chỉ để hiển thị), `points_earned int NULL` (ghi khi COMPLETED).
- Trạng thái: `status` (xem BUSINESS_RULES 3), `expires_at`, `paid_at`, `packing_started_at`, `packed_at`, `out_for_delivery_at`, `completed_at`, `cancelled_at`, `cancel_reason`, `refund_status` (`NONE` | `PENDING` | `PARTIAL` | `DONE`), `assigned_staff_id NULL`.
- Bàn giao: `handover_nonce bytea NULL` (sinh khi PAID; token/PIN được tính từ nonce + `HANDOVER_SECRET`, không lưu), `handover_failed_attempts int default 0`, `handover_locked bool default false`, `handover_verified_at`, `handover_verified_by`.
- `contains_alcohol bool`, `age_confirmed_at NULL`.
- `version int` (tăng mỗi lần cập nhật, dùng cho optimistic locking ở màn admin), timestamps.
- Index: `(status, created_at)`, `(customer_id, created_at DESC)`, `(expires_at) WHERE status = 'PENDING_PAYMENT'`, `(assigned_staff_id, status)`.

**order_items**: `id`, `order_id` FK, `product_id`, `sell_unit_id`, snapshot `product_name`, `sell_unit_name`, `sku`, `base_qty int`, `qty int CHECK (qty BETWEEN 1 AND 999)`, `unit_price bigint`, `line_total bigint`, `CHECK (line_total = unit_price * qty)`, `flash_sale_id NULL`, `is_combo`, `combo_snapshot jsonb NULL` (danh sách thành phần + số lượng tại thời điểm đặt), `image_path`.

**order_status_history** (chỉ INSERT): `id`, `order_id`, `from_status`, `to_status`, `actor_type` (`SYSTEM` | `CUSTOMER` | `STAFF` | `ADMIN` | `PAYMENT`), `actor_id NULL`, `reason`, `created_at`. Index `(order_id, created_at)`.

## 7. Thanh toán và hoàn tiền

**bank_transactions**: một dòng cho mỗi giao dịch tiền vào nhận từ SePay (qua webhook hoặc đối soát).
- `id`, `provider` (`SEPAY`), `sepay_webhook_id bigint NULL` UNIQUE, `sepay_api_id uuid NULL` UNIQUE, `reference_code`, `gateway`, `account_number`, `sub_account`, `amount bigint CHECK (> 0)`, `content`, `extracted_code NULL`, `transaction_date`, `source` (`WEBHOOK` | `RECONCILE` | `MANUAL`), `raw jsonb` (đã bỏ trường không cần), `received_at`.
- Xử lý: `process_status` (`RECEIVED` | `MATCHED` | `EXCEPTION` | `IGNORED`), `exception_reason` (`NO_CODE` | `ORDER_NOT_FOUND` | `AMOUNT_MISMATCH` | `ORDER_NOT_PENDING` | `ORDER_EXPIRED` | `WRONG_ACCOUNT` | `DUPLICATE_OR_EXTRA`), `order_id NULL`, `attempts int`, `processed_at`, `resolved_by NULL`, `resolved_at NULL`, `resolution_note`.
- UNIQUE partial `(account_number, reference_code) WHERE reference_code <> ''` làm lớp chống trùng thứ hai giữa webhook và đối soát (kiểm tra với dữ liệu SePay thật trước khi bật; nếu `reference_code` không ổn định giữa hai nguồn thì bỏ ràng buộc này và ghi lại quyết định).
- Index `(process_status) WHERE process_status IN ('RECEIVED','EXCEPTION')`, `(order_id)`.

**payments**: liên kết đơn và giao dịch đã khớp: `id`, `order_id` UNIQUE, `bank_transaction_id` UNIQUE, `amount`, `matched_at`, `matched_by` (`AUTO` | admin id).

**refunds**: `id`, `order_id` FK, `amount bigint CHECK (> 0)`, `reason`, `method` (`BANK_TRANSFER`), `recipient_bank`, `recipient_account`, `recipient_name`, `bank_reference`, `status` (`PENDING` | `DONE`), `restock bool`, `created_by`, `completed_by`, `created_at`, `completed_at`.
Ràng buộc nghiệp vụ (kiểm trong service + test): tổng hoàn ≤ số đã thanh toán.

## 8. Tích điểm

**loyalty_settings** (một dòng, có `version`): `point_value_vnd int default 1000`, `max_redeem_bps int default 5000`, `earn_on` (`COMPLETED`), `updated_by`, `updated_at`.

**loyalty_tiers**: `tier` PK, `name`, `min_lifetime_spent bigint`, `earn_bps int`, `badge_color`, `benefits text[]`. Seed mặc định (chờ chủ dự án xác nhận): BRONZE 0 / 100bps, SILVER 2.000.000 / 200bps, GOLD 5.000.000 / 300bps, DIAMOND 10.000.000 / 500bps.

**point_ledger** (chỉ INSERT): `id`, `customer_id`, `type` (`HOLD` | `RELEASE` | `REDEEM` | `REDEEM_RETURN` | `EARN` | `EARN_REVERSAL` | `ADJUST`), `points int` (có dấu), `order_id NULL`, `refund_id NULL`, `reason`, `actor_id NULL`, `balance_after int`, `held_after int`, `created_at`.
UNIQUE partial `(order_id, type) WHERE type IN ('HOLD','RELEASE','REDEEM','REDEEM_RETURN','EARN')` để chống cộng/trừ trùng cho cùng một đơn.

## 9. Cài đặt, bảo mật, phân tích

**store_settings** (một dòng, có `version`): `shipping_fee_flat bigint default 20000`, `free_shipping_threshold bigint default 300000`, `payment_window_minutes int default 15`, `opening_hours jsonb`, `pickup_slot_minutes int default 30`, `hotline`, `store_name`, `min_order_amount bigint default 0`, `popular_search_terms text[]`, `announcement_text varchar(160) NULL`, `announcement_link` (chỉ đường dẫn nội bộ), `zalo_url NULL`, `updated_by`.
KHÔNG chứa thông tin tài khoản nhận tiền.

**audit_logs** (chỉ INSERT): `id`, `actor_type`, `actor_id`, `action` (vd `product.update`, `refund.complete`, `staff.deactivate`, `auth.login_failed`), `entity_type`, `entity_id`, `before jsonb` và `after jsonb` (đã che dữ liệu nhạy cảm), `ip inet`, `user_agent`, `request_id`, `created_at`. Index `(entity_type, entity_id)`, `(actor_id, created_at)`, `(action, created_at)`.

**rate_limits**: `key text`, `window_start timestamptz`, `count int`, PK `(key, window_start)`. Tăng bằng `INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`.

**analytics_events**: `id bigint identity`, `session_id uuid`, `customer_id NULL` (chỉ ghi khi `consent_analytics = true`), `type` (`PRODUCT_VIEW` | `DWELL` | `SEARCH` | `CATEGORY_VIEW` | `ADD_TO_CART` | `CHECKOUT_START` | `PURCHASE`), `product_id NULL`, `category_id NULL`, `query text NULL` (cắt 100 ký tự), `value int NULL`, `created_at`. Giữ 12 tháng. Index `(type, created_at)`, `(product_id, created_at)`.

**sync_state**: `key text` PK, `value text`, `updated_at`. Dùng lưu `sepay_since_id` cho job đối soát.

**notification_outbox** (giai đoạn sau): `id`, `channel` (`SMS` | `ZALO` | `TELEGRAM`), `to`, `template`, `payload jsonb`, `status`, `attempts`, `next_attempt_at`, `sent_at`, `error`.

## 10. Nội dung hiển thị (banner, bộ sưu tập)

**banners**: `id`, `placement` (`HOME_HERO` | `MEGA_MENU_PROMO` | `CATEGORY_TOP` | `PROMO_PAGE`), `category_id NULL`, `title` (dùng làm alt), `image_desktop_path`, `image_mobile_path`, `link_path` (chỉ đường dẫn nội bộ, bắt đầu bằng `/`), `starts_at`, `ends_at NULL`, `sort_order`, `is_active`, timestamps. Index `(placement, is_active, sort_order)`.

**collections** (bộ sưu tập/chiến dịch): `id`, `name`, `slug` UNIQUE, `description`, `title_image_path NULL`, `hero_image_desktop_path NULL`, `hero_image_mobile_path NULL`, `starts_at`, `ends_at NULL`, `show_on_home bool`, `show_as_home_tab bool`, `home_sort int`, `card_ribbon_text varchar(40) NULL` (nhãn trên thẻ sản phẩm, ví dụ "Bán chạy"), `is_active`, timestamps.

**collection_products**: `collection_id` FK, `product_id` FK, `sort_order`. PK `(collection_id, product_id)`.

Chỉ hiển thị banner/bộ sưu tập đang hiệu lực theo giờ server; sản phẩm ẩn hoặc hết hàng xếp cuối bộ sưu tập.

## 11. Dữ liệu seed

- Local (`scripts/seed-local.ts`): danh mục, khoảng 30 sản phẩm mẫu, 1 kho, tồn kho mẫu, cài đặt mặc định. Không tạo tài khoản đăng nhập nào ngoài qua `create-admin.ts`.
- Production: chỉ `store_settings`, `loyalty_settings`, `loyalty_tiers`, kho `ONLINE_MAIN`, `admin_units`. Không có sản phẩm hay tài khoản mẫu.
