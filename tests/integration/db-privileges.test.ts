import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const appUrl = process.env.DATABASE_URL;
if (migrationUrl === undefined || appUrl === undefined) {
  throw new Error(
    "Thiếu DATABASE_MIGRATION_URL hoặc DATABASE_URL. Chạy test tích hợp bằng `pnpm test:int`.",
  );
}

// Kết nối bằng role có quyền DDL: dựng và dọn bảng dùng cho test, đọc catalog.
// max: 1 để SET ROLE và RESET ROLE luôn tác động lên đúng một kết nối.
const migrationSql = postgres(migrationUrl, { max: 1, onnotice: () => undefined });

// Kết nối đúng như ứng dụng khi chạy: role app_runtime qua DATABASE_URL.
const appSql = postgres(appUrl, { max: 1, prepare: false, onnotice: () => undefined });

// Bảng chỉ tồn tại trong lúc test: tạo ở beforeAll, xóa ở afterAll. Chúng nằm thật trong
// schema `app` (không phải TEMP TABLE) vì mục đích là kiểm tra chính default privileges
// của schema đó — bảng nghiệp vụ tạo về sau sẽ nhận đúng bộ quyền này.
const suffix = randomBytes(6).toString("hex");
const PLAIN_TABLE = `tmp_test_plain_${suffix}`;
const LEDGER_TABLE = `tmp_test_ledger_${suffix}`;
const LEDGER_WITH_EXCEPTION_TABLE = `tmp_test_ledger_bank_${suffix}`;
const ALL_TABLES = [PLAIN_TABLE, LEDGER_TABLE, LEDGER_WITH_EXCEPTION_TABLE];

const DATA_API_ROLES = ["anon", "authenticated", "service_role"];

/** Supabase Data API kết nối bằng role `authenticator` rồi SET ROLE sang anon/authenticated. */
async function asDataApiRole<T>(role: string, run: () => Promise<T>): Promise<T> {
  await migrationSql`set role ${migrationSql(role)}`;
  try {
    return await run();
  } finally {
    await migrationSql`reset role`;
  }
}

// 42501 = insufficient_privilege
async function expectPermissionDenied(run: () => Promise<unknown>): Promise<void> {
  await expect(run()).rejects.toMatchObject({ code: "42501" });
}

beforeAll(async () => {
  await migrationSql`
    create table app.${migrationSql(PLAIN_TABLE)} (
      id uuid primary key default gen_random_uuid(),
      label text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `;
  await migrationSql`select app.enable_app_rls(${PLAIN_TABLE})`;
  await migrationSql`select app.attach_updated_at(${PLAIN_TABLE})`;

  await migrationSql`
    create table app.${migrationSql(LEDGER_TABLE)} (
      id bigint generated always as identity primary key,
      note text not null,
      created_at timestamptz not null default now()
    )
  `;
  await migrationSql`select app.enable_app_rls(${LEDGER_TABLE})`;
  await migrationSql`select app.make_append_only(${LEDGER_TABLE})`;

  await migrationSql`
    create table app.${migrationSql(LEDGER_WITH_EXCEPTION_TABLE)} (
      id bigint generated always as identity primary key,
      note text not null,
      process_status text not null default 'RECEIVED',
      processed_at timestamptz,
      created_at timestamptz not null default now()
    )
  `;
  await migrationSql`select app.enable_app_rls(${LEDGER_WITH_EXCEPTION_TABLE})`;
  await migrationSql`
    select app.make_append_only(
      ${LEDGER_WITH_EXCEPTION_TABLE},
      ${["process_status", "processed_at"]}::text[]
    )
  `;
});

afterAll(async () => {
  for (const table of ALL_TABLES) {
    await migrationSql`drop table if exists app.${migrationSql(table)} cascade`;
  }
  await Promise.all([migrationSql.end(), appSql.end()]);
});

describe("(a) anon và authenticated không đọc được gì trong schema app", () => {
  it("không role nào của Data API có USAGE trên schema app", async () => {
    const rows = await migrationSql<{ role: string; hasUsage: boolean }[]>`
      select rolname as role, has_schema_privilege(rolname, 'app', 'USAGE') as "hasUsage"
      from pg_roles
      where rolname = any(${DATA_API_ROLES}::text[])
      order by rolname
    `;
    expect(rows.map((row) => row.role)).toStrictEqual([...DATA_API_ROLES].sort());
    for (const row of rows) {
      expect(row.hasUsage, `${row.role} không được có USAGE trên schema app`).toBe(false);
    }
  });

  it("không có quyền nào trên bảng vừa được tạo trong app", async () => {
    for (const role of DATA_API_ROLES) {
      for (const table of ALL_TABLES) {
        const rows = await migrationSql<{ canSelect: boolean; canInsert: boolean }[]>`
          select has_table_privilege(${role}, ${`app.${table}`}, 'SELECT') as "canSelect",
                 has_table_privilege(${role}, ${`app.${table}`}, 'INSERT') as "canInsert"
        `;
        expect(rows[0], `${role} trên app.${table}`).toStrictEqual({
          canSelect: false,
          canInsert: false,
        });
      }
    }
  });

  it("SET ROLE anon hoặc authenticated rồi đọc hay ghi thì bị từ chối", async () => {
    for (const role of ["anon", "authenticated"]) {
      await asDataApiRole(role, async () => {
        await expectPermissionDenied(
          () => migrationSql`select * from app.${migrationSql(PLAIN_TABLE)}`,
        );
        await expectPermissionDenied(
          () =>
            migrationSql`insert into app.${migrationSql(PLAIN_TABLE)} (label) values ('khong duoc')`,
        );
      });
    }
  });
});

describe("(b) app_runtime đọc và ghi được bảng thường", () => {
  it("kết nối bằng DATABASE_URL đúng là role app_runtime", async () => {
    const rows = await appSql<{ currentUser: string }[]>`select current_user as "currentUser"`;
    expect(rows[0]?.currentUser).toBe("app_runtime");
  });

  it("INSERT, SELECT, UPDATE, DELETE đều chạy và trigger updated_at hoạt động", async () => {
    await appSql`insert into app.${appSql(PLAIN_TABLE)} (label) values ('ban dau')`;

    const selected = await appSql<{ label: string }[]>`
      select label from app.${appSql(PLAIN_TABLE)}
    `;
    expect(selected.map((row) => row.label)).toStrictEqual(["ban dau"]);

    await appSql`update app.${appSql(PLAIN_TABLE)} set label = 'da sua' where label = 'ban dau'`;
    const updated = await appSql<{ label: string; touched: boolean }[]>`
      select label, updated_at > created_at as touched from app.${appSql(PLAIN_TABLE)}
    `;
    expect(updated[0]).toStrictEqual({ label: "da sua", touched: true });

    await appSql`delete from app.${appSql(PLAIN_TABLE)} where label = 'da sua'`;
    const remaining = await appSql<{ count: number }[]>`
      select count(*)::int as count from app.${appSql(PLAIN_TABLE)}
    `;
    expect(remaining[0]?.count).toBe(0);
  });

  it("app_runtime vẫn không có quyền DDL và không gọi được hàm phân quyền", async () => {
    await expectPermissionDenied(() => appSql`create table app.tmp_test_khong_duoc_tao (id int)`);
    await expectPermissionDenied(() => appSql`select app.make_append_only(${PLAIN_TABLE})`);
  });
});

describe("(c) bảng kiểu ledger chỉ cho ghi thêm", () => {
  it("app_runtime chỉ có SELECT và INSERT trên bảng ledger", async () => {
    const rows = await migrationSql<
      { canSelect: boolean; canInsert: boolean; canUpdate: boolean; canDelete: boolean }[]
    >`
      select has_table_privilege('app_runtime', ${`app.${LEDGER_TABLE}`}, 'SELECT') as "canSelect",
             has_table_privilege('app_runtime', ${`app.${LEDGER_TABLE}`}, 'INSERT') as "canInsert",
             has_table_privilege('app_runtime', ${`app.${LEDGER_TABLE}`}, 'UPDATE') as "canUpdate",
             has_table_privilege('app_runtime', ${`app.${LEDGER_TABLE}`}, 'DELETE') as "canDelete"
    `;
    expect(rows[0]).toStrictEqual({
      canSelect: true,
      canInsert: true,
      canUpdate: false,
      canDelete: false,
    });
  });

  it("INSERT và SELECT chạy được, UPDATE, DELETE và TRUNCATE bị từ chối", async () => {
    await appSql`insert into app.${appSql(LEDGER_TABLE)} (note) values ('ghi so 1')`;
    const rows = await appSql<{ note: string }[]>`select note from app.${appSql(LEDGER_TABLE)}`;
    expect(rows.map((row) => row.note)).toStrictEqual(["ghi so 1"]);

    await expectPermissionDenied(
      () => appSql`update app.${appSql(LEDGER_TABLE)} set note = 'sua' where note = 'ghi so 1'`,
    );
    await expectPermissionDenied(
      () => appSql`delete from app.${appSql(LEDGER_TABLE)} where note = 'ghi so 1'`,
    );
    await expectPermissionDenied(() => appSql`truncate app.${appSql(LEDGER_TABLE)}`);

    const stillThere = await appSql<{ count: number }[]>`
      select count(*)::int as count from app.${appSql(LEDGER_TABLE)}
    `;
    expect(stillThere[0]?.count).toBe(1);
  });

  it("ngoại lệ kiểu bank_transactions: chỉ UPDATE được đúng những cột được phép", async () => {
    await appSql`insert into app.${appSql(LEDGER_WITH_EXCEPTION_TABLE)} (note) values ('gd 1')`;
    await appSql`
      update app.${appSql(LEDGER_WITH_EXCEPTION_TABLE)}
      set process_status = 'MATCHED', processed_at = now()
      where note = 'gd 1'
    `;
    const rows = await appSql<{ processStatus: string }[]>`
      select process_status as "processStatus" from app.${appSql(LEDGER_WITH_EXCEPTION_TABLE)}
    `;
    expect(rows[0]?.processStatus).toBe("MATCHED");

    await expectPermissionDenied(
      () =>
        appSql`update app.${appSql(LEDGER_WITH_EXCEPTION_TABLE)} set note = 'sua' where note = 'gd 1'`,
    );
    await expectPermissionDenied(
      () => appSql`delete from app.${appSql(LEDGER_WITH_EXCEPTION_TABLE)}`,
    );
  });
});

describe("RLS là lớp phòng thủ thứ hai", () => {
  it("mọi bảng trong app bật RLS và chỉ có policy dành cho app_runtime", async () => {
    const rows = await migrationSql<
      { table: string; rlsEnabled: boolean; policyRoles: string[] }[]
    >`
      select c.relname as table,
             c.relrowsecurity as "rlsEnabled",
             coalesce(
               (select array_agg(distinct role_name order by role_name)
                from pg_policies p, unnest(p.roles) as role_name
                where p.schemaname = 'app' and p.tablename = c.relname),
               '{}'
             ) as "policyRoles"
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app' and c.relkind = 'r' and c.relname = any(${ALL_TABLES}::text[])
      order by c.relname
    `;
    expect(rows).toHaveLength(ALL_TABLES.length);
    for (const row of rows) {
      expect(row.rlsEnabled, `${row.table} phải bật RLS`).toBe(true);
      expect(row.policyRoles, `${row.table} chỉ được có policy cho app_runtime`).toStrictEqual([
        "app_runtime",
      ]);
    }
  });
});
