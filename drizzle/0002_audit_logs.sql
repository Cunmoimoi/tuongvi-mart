-- Nhật ký audit (T0.6), theo DATA_MODEL mục 9.
--
-- Sinh từ `pnpm db:generate` rồi sửa tay: viết lại cho dễ đọc, bỏ tiền tố bảng trong CHECK và
-- thêm bước bật RLS, chỉ cho ghi thêm. KHÔNG chứa mật khẩu.
--
-- Quyền: ALTER DEFAULT PRIVILEGES của 0000 cấp SELECT, INSERT, UPDATE, DELETE cho `app_runtime`;
-- app.make_append_only() thu hồi lại UPDATE, DELETE, TRUNCATE, nên ứng dụng chỉ đọc và ghi thêm.
-- `anon`, `authenticated`, `service_role` không có quyền nào (0000 thu hồi mặc định trên schema app).
--
-- Các CHECK là lớp phòng thủ thứ hai; danh sách action hợp lệ nằm trong code
-- (src/server/audit/actions.ts), database chỉ kiểm định dạng `thực_thể.hành_động`.

create table app.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  request_id text,
  created_at timestamp with time zone not null default now(),
  constraint audit_logs_actor_type_valid
    check (actor_type in ('SYSTEM', 'CUSTOMER', 'STAFF', 'ADMIN', 'PAYMENT')),
  constraint audit_logs_action_format
    check (char_length(action) <= 100 and action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint audit_logs_entity_type_format
    check (entity_type ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint audit_logs_entity_id_length
    check (char_length(entity_id) between 1 and 128),
  constraint audit_logs_entity_id_requires_type
    check (entity_id is null or entity_type is not null),
  constraint audit_logs_user_agent_length
    check (char_length(user_agent) <= 255),
  constraint audit_logs_request_id_length
    check (char_length(request_id) between 1 and 128)
);
--> statement-breakpoint
create index audit_logs_entity_idx on app.audit_logs using btree (entity_type, entity_id);
--> statement-breakpoint
create index audit_logs_actor_id_created_at_idx on app.audit_logs using btree (actor_id, created_at);
--> statement-breakpoint
create index audit_logs_action_created_at_idx on app.audit_logs using btree (action, created_at);
--> statement-breakpoint
select app.enable_app_rls('audit_logs');
--> statement-breakpoint
select app.make_append_only('audit_logs');
--> statement-breakpoint
comment on table app.audit_logs is
  'Nhật ký audit, chỉ ghi thêm. Ghi qua src/server/audit/service.ts (đã che dữ liệu nhạy cảm).';
