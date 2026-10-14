#!/usr/bin/env bash
# TẠM THỜI (T0.7, sẽ gỡ ở commit sau): chứng minh test (a)(b)(c) của T0.3 có ý nghĩa trên Postgres
# thường của CI. Mỗi trường hợp cố ý làm hỏng một quy tắc phân quyền, chạy lại
# tests/integration/db-privileges.test.ts và yêu cầu test đỏ, rồi khôi phục.
set -uo pipefail

psql_admin() {
  docker exec -i "${PG_CONTAINER}" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -At
}

failed_tests() {
  node -e '
    const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const failed = r.testResults.flatMap((f) => f.assertionResults.filter((t) => t.status !== "passed"));
    console.log(`  ${r.numPassedTests} đạt, ${r.numFailedTests} đỏ. Test đỏ:`);
    for (const t of failed) console.log(`    - ${t.fullName}`);
  ' "$1"
}

overall=0

run_case() {
  local name="$1" break_sql="$2" fix_sql="$3"
  echo "${break_sql}" | psql_admin || { echo "::error::Không áp được đột biến ${name}"; overall=1; return; }
  local report="${RUNNER_TEMP}/dot-bien-${name}.json"
  VITEST_JSON_REPORT="${report}" pnpm test:int tests/integration/db-privileges.test.ts >/dev/null 2>&1
  local status=$?
  echo "${fix_sql}" | psql_admin || { echo "::error::Không khôi phục được sau đột biến ${name}"; overall=1; }
  echo "Đột biến ${name}: pnpm test:int exit=${status}"
  failed_tests "${report}"
  if [ "${status}" -eq 0 ]; then
    echo "::error::Đột biến ${name} không làm test đỏ: test không bắt được lỗi này."
    overall=1
  fi
}

# (a) anon đọc được schema app: cấp USAGE và quyền mặc định trên bảng mới cho anon.
run_case "a-anon-doc-duoc-app" \
  "grant usage on schema app to anon; alter default privileges in schema app grant select, insert on tables to anon;" \
  "revoke usage on schema app from anon; alter default privileges in schema app revoke select, insert on tables from anon;"

# (b) app_runtime mất quyền mặc định trên bảng mới.
run_case "b-app-runtime-mat-quyen" \
  "alter default privileges in schema app revoke all on tables from app_runtime;" \
  "alter default privileges in schema app grant select, insert, update, delete on tables to app_runtime;"

# (c) app.make_append_only bị thay bằng hàm rỗng: bảng ledger không còn chỉ-ghi-thêm.
original_fn="$(echo "select pg_get_functiondef('app.make_append_only(text,text[])'::regprocedure);" | psql_admin)"
run_case "c-ledger-sua-xoa-duoc" \
  "create or replace function app.make_append_only(p_table text, p_updatable_columns text[] default '{}') returns void language plpgsql set search_path = '' as \$fn\$ begin end \$fn\$;" \
  "${original_fn};"

# Sau khi khôi phục, bộ test phải xanh trở lại.
VITEST_JSON_REPORT="${RUNNER_TEMP}/dot-bien-khoi-phuc.json" pnpm test:int tests/integration/db-privileges.test.ts >/dev/null 2>&1
status=$?
echo "Sau khôi phục: pnpm test:int exit=${status}"
failed_tests "${RUNNER_TEMP}/dot-bien-khoi-phuc.json"
if [ "${status}" -ne 0 ]; then
  echo "::error::Khôi phục xong mà test vẫn đỏ."
  overall=1
fi

exit "${overall}"
