-- Bảng đếm rate limit (T0.4), theo DATA_MODEL mục 9.
--
-- Sinh từ `pnpm db:generate` rồi sửa tay: bỏ `CREATE SCHEMA "app"` (schema đã có từ 0000) và
-- thêm bước bật RLS. Quyền cho `app_runtime` (SELECT, INSERT, UPDATE, DELETE) tự có nhờ
-- ALTER DEFAULT PRIVILEGES của 0000, nên không cần GRANT ở đây. Đây không phải bảng ledger:
-- cron `cleanup` phải DELETE được các dòng cũ, vì vậy không gọi app.make_append_only().

create table app.rate_limits (
  key text not null,
  window_start timestamp with time zone not null,
  count integer not null default 1,
  created_at timestamp with time zone not null default now(),
  constraint rate_limits_key_window_start_pk primary key (key, window_start),
  constraint rate_limits_count_positive check (count > 0),
  constraint rate_limits_key_length check (char_length(key) between 1 and 256)
);
--> statement-breakpoint
select app.enable_app_rls('rate_limits');
