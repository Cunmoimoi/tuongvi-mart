-- Migration nền (T0.3): schema `app`, extension, role `app_runtime`, phân quyền,
-- RLS và các hàm dùng lại cho những task sau.
--
-- KHÔNG chứa mật khẩu. Role `app_runtime` được tạo không mật khẩu nên không đăng nhập
-- được cho tới khi có người đặt mật khẩu: local dùng `pnpm db:setup:local` (đọc từ
-- .env.local), staging/production đặt tay và không bao giờ commit.
--
-- Migration phải luôn chạy bằng cùng một role (DATABASE_MIGRATION_URL), vì
-- ALTER DEFAULT PRIVILEGES chỉ áp dụng cho đối tượng do role đó tạo ra.
-- `scripts/db-migrate.mts` kiểm tra điều kiện này trước khi chạy.

create schema if not exists app;
--> statement-breakpoint
create schema if not exists extensions;
--> statement-breakpoint
create extension if not exists pgcrypto with schema extensions;
--> statement-breakpoint
create extension if not exists unaccent with schema extensions;
--> statement-breakpoint
create extension if not exists pg_trgm with schema extensions;
--> statement-breakpoint
create extension if not exists btree_gist with schema extensions;
--> statement-breakpoint

-- Role ứng dụng dùng khi chạy: đăng nhập được nhưng không có quyền DDL và không
-- bỏ qua được RLS. Lệnh ALTER bên dưới cố ý không nhắc tới PASSWORD để việc chạy
-- lại migration không xóa mật khẩu đã đặt ở production.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime with login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
  else
    alter role app_runtime with login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end
$$;
--> statement-breakpoint

-- Ở Postgres thường (ví dụ CI) ba role của Supabase Data API chưa tồn tại. Tạo dạng
-- NOLOGIN để phần thu hồi quyền bên dưới và test bảo mật chạy được ở mọi môi trường.
do $$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role']
  loop
    if not exists (select 1 from pg_roles where rolname = role_name) then
      execute format('create role %I with nologin noinherit', role_name);
    end if;
  end loop;
end
$$;
--> statement-breakpoint

grant usage on schema app to app_runtime;
--> statement-breakpoint
grant usage on schema extensions to app_runtime;
--> statement-breakpoint
revoke all on schema app from public;
--> statement-breakpoint

-- Schema `app` không bao giờ được expose qua Supabase Data API. `service_role` bỏ qua
-- RLS nên cũng bị thu hồi, không chỉ `anon` và `authenticated`.
do $$
declare
  role_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role']
  loop
    execute format('revoke all on schema app from %I', role_name);
    execute format('revoke all on all tables in schema app from %I', role_name);
    execute format('revoke all on all sequences in schema app from %I', role_name);
    execute format('revoke all on all functions in schema app from %I', role_name);
    execute format('alter default privileges in schema app revoke all on tables from %I', role_name);
    execute format('alter default privileges in schema app revoke all on sequences from %I', role_name);
    execute format('alter default privileges in schema app revoke all on functions from %I', role_name);
  end loop;
end
$$;
--> statement-breakpoint

-- Bảng nghiệp vụ tạo về sau tự động có đủ quyền cho `app_runtime`; bảng kiểu ledger
-- gọi thêm app.make_append_only() để bỏ UPDATE/DELETE.
alter default privileges in schema app grant select, insert, update, delete on tables to app_runtime;
--> statement-breakpoint
alter default privileges in schema app grant usage, select on sequences to app_runtime;
--> statement-breakpoint
alter default privileges in schema app revoke execute on functions from public;
--> statement-breakpoint

create or replace function app.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
--> statement-breakpoint

create or replace function app.attach_updated_at(p_table text) returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('drop trigger if exists set_updated_at on app.%I', p_table);
  execute format(
    'create trigger set_updated_at before update on app.%I'
    || ' for each row execute function app.set_updated_at()',
    p_table
  );
end
$$;
--> statement-breakpoint

-- Bật RLS làm lớp phòng thủ thứ hai (DATA_MODEL mục 2). Không dùng FORCE ROW LEVEL
-- SECURITY để role chạy migration vẫn nạp được dữ liệu seed.
create or replace function app.enable_app_rls(p_table text) returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('alter table app.%I enable row level security', p_table);
  execute format('drop policy if exists app_runtime_all on app.%I', p_table);
  execute format(
    'create policy app_runtime_all on app.%I for all to app_runtime'
    || ' using (true) with check (true)',
    p_table
  );
end
$$;
--> statement-breakpoint

-- Quy ước bảng kiểu ledger (chỉ ghi thêm): `app_runtime` chỉ còn SELECT và INSERT.
-- p_updatable_columns dành cho ngoại lệ duy nhất là bank_transactions, nơi vài cột
-- trạng thái xử lý được phép UPDATE (DATA_MODEL mục 2).
create or replace function app.make_append_only(
  p_table text,
  p_updatable_columns text[] default '{}'
) returns void
language plpgsql
set search_path = ''
as $$
declare
  column_name text;
begin
  execute format('revoke update, delete, truncate on app.%I from app_runtime', p_table);
  foreach column_name in array coalesce(p_updatable_columns, '{}'::text[])
  loop
    execute format('grant update (%I) on app.%I to app_runtime', column_name, p_table);
  end loop;
end
$$;
--> statement-breakpoint

-- Các hàm trên thực hiện DDL và GRANT nên không được để PUBLIC gọi.
revoke execute on all functions in schema app from public;
--> statement-breakpoint
grant execute on function app.set_updated_at() to app_runtime;
--> statement-breakpoint

comment on schema app is 'Bảng nghiệp vụ của Tường Vi Mart. Không expose qua Supabase Data API.';
--> statement-breakpoint
comment on function app.make_append_only(text, text[]) is
  'Gọi sau khi tạo bảng kiểu ledger: thu hồi UPDATE/DELETE/TRUNCATE của app_runtime, giữ lại SELECT và INSERT.';
--> statement-breakpoint
comment on function app.enable_app_rls(text) is
  'Gọi sau khi tạo mọi bảng trong app: bật RLS và policy app_runtime_all.';
