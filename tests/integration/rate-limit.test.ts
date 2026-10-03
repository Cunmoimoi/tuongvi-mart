import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import * as schema from "@/server/db/schema";
import type { Clock } from "@/server/lib/clock";
import { consumeRateLimit, type RateLimitResult } from "@/server/lib/rate-limit";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const appUrl = process.env.DATABASE_URL;
if (migrationUrl === undefined || appUrl === undefined) {
  throw new Error(
    "Thiếu DATABASE_MIGRATION_URL hoặc DATABASE_URL. Chạy test tích hợp bằng `pnpm test:int`.",
  );
}

// Kết nối có quyền DDL: chỉ để đọc catalog và SET ROLE kiểm tra quyền.
const migrationSql = postgres(migrationUrl, { max: 1, onnotice: () => undefined });

// Mỗi "instance" là một pool riêng tới database bằng role app_runtime, giống nhiều
// instance serverless của Vercel cùng ghi vào một bảng đếm. max > 1 để các lệnh thật sự
// chạy song song trên nhiều kết nối.
const createInstance = () => {
  const client = postgres(appUrl, { max: 10, prepare: false });
  return { client, db: drizzle(client, { schema }) };
};
const instanceA = createInstance();
const instanceB = createInstance();
const instanceC = createInstance();
const instances = [instanceA, instanceB, instanceC];
const dbA = instanceA.db;
const dbB = instanceB.db;
const dbC = instanceC.db;
const appSql = instanceA.client;

// Khóa riêng cho mỗi lần chạy để không đụng dữ liệu của lần chạy khác.
const runId = randomBytes(6).toString("hex");
const keyOf = (name: string) => `test:${runId}:${name}`;

// Đồng hồ cố định: mọi lời gọi cùng nằm trong một cửa sổ, kết quả không phụ thuộc tốc độ máy.
function clockAt(iso: string): Clock {
  return { now: () => new Date(iso) };
}
const FIXED = clockAt("2026-10-03T07:30:20.000Z");

const DATA_API_ROLES = ["anon", "authenticated", "service_role"];

afterAll(async () => {
  // Dọn bằng chính app_runtime: đồng thời chứng minh role này được DELETE bảng đếm.
  await appSql`delete from app.rate_limits where key like ${`test:${runId}:%`}`;
  await Promise.all([migrationSql.end(), ...instances.map((instance) => instance.client.end())]);
});

async function storedCount(key: string): Promise<number | undefined> {
  const rows = await appSql<{ total: number }[]>`
    select sum(count)::int as total from app.rate_limits where key = ${key}
  `;
  return rows[0]?.total ?? undefined;
}

describe("(c) rate limit đúng ngưỡng khi gọi song song", () => {
  it("50 lần gọi cùng lúc, ngưỡng 10: đúng 10 lần được qua, 40 lần bị chặn", async () => {
    const rule = { key: keyOf("parallel-single"), limit: 10, windowSeconds: 60 };

    const results = await Promise.all(
      Array.from({ length: 50 }, () => consumeRateLimit(dbA, rule, FIXED)),
    );

    expect(results.filter((r) => r.allowed)).toHaveLength(10);
    expect(results.filter((r) => !r.allowed)).toHaveLength(40);
    // Mỗi lần gọi nhận một số đếm riêng 1..50: không có hai lần gọi nào "thấy" cùng một số.
    expect(results.map((r) => r.count).sort((a, b) => a - b)).toStrictEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
    expect(await storedCount(rule.key)).toBe(50);
  });

  it("nhiều instance cùng lúc dùng chung một bộ đếm: 3 x 20 lần gọi, ngưỡng 25 thì đúng 25 lần qua", async () => {
    const rule = { key: keyOf("parallel-multi-instance"), limit: 25, windowSeconds: 60 };

    const batches = await Promise.all(
      [dbA, dbB, dbC].map((db) =>
        Promise.all(Array.from({ length: 20 }, () => consumeRateLimit(db, rule, FIXED))),
      ),
    );
    const results: RateLimitResult[] = batches.flat();

    expect(results).toHaveLength(60);
    expect(results.filter((r) => r.allowed)).toHaveLength(25);
    expect(results.filter((r) => !r.allowed)).toHaveLength(35);
    expect(await storedCount(rule.key)).toBe(60);
  });

  it("ngưỡng chính xác khi gọi tuần tự: lần thứ limit còn qua, lần limit + 1 bị chặn", async () => {
    const rule = { key: keyOf("sequential"), limit: 3, windowSeconds: 60 };

    const allowed: boolean[] = [];
    for (let i = 0; i < 5; i += 1) {
      allowed.push((await consumeRateLimit(dbA, rule, FIXED)).allowed);
    }

    expect(allowed).toStrictEqual([true, true, true, false, false]);
  });

  it("các khóa khác nhau không ảnh hưởng nhau", async () => {
    const ruleA = { key: keyOf("independent-a"), limit: 1, windowSeconds: 60 };
    const ruleB = { key: keyOf("independent-b"), limit: 1, windowSeconds: 60 };

    expect((await consumeRateLimit(dbA, ruleA, FIXED)).allowed).toBe(true);
    expect((await consumeRateLimit(dbA, ruleA, FIXED)).allowed).toBe(false);
    expect((await consumeRateLimit(dbA, ruleB, FIXED)).allowed).toBe(true);
  });

  it("sang cửa sổ mới thì đếm lại từ đầu, trong cùng cửa sổ thì dùng chung bộ đếm", async () => {
    const rule = { key: keyOf("window-rollover"), limit: 1, windowSeconds: 60 };

    const first = await consumeRateLimit(dbA, rule, clockAt("2026-10-03T07:30:05.000Z"));
    const sameWindow = await consumeRateLimit(dbA, rule, clockAt("2026-10-03T07:30:59.000Z"));
    const nextWindow = await consumeRateLimit(dbA, rule, clockAt("2026-10-03T07:31:00.000Z"));

    expect(first.allowed).toBe(true);
    expect(sameWindow).toMatchObject({ allowed: false, count: 2 });
    expect(nextWindow).toMatchObject({ allowed: true, count: 1 });
  });
});

describe("bảng app.rate_limits tuân thủ quyền của app_runtime", () => {
  it("app_runtime đọc, ghi, sửa và xóa được (cần để cron dọn bảng cũ)", async () => {
    const rows = await migrationSql<
      { canSelect: boolean; canInsert: boolean; canUpdate: boolean; canDelete: boolean }[]
    >`
      select has_table_privilege('app_runtime', 'app.rate_limits', 'SELECT') as "canSelect",
             has_table_privilege('app_runtime', 'app.rate_limits', 'INSERT') as "canInsert",
             has_table_privilege('app_runtime', 'app.rate_limits', 'UPDATE') as "canUpdate",
             has_table_privilege('app_runtime', 'app.rate_limits', 'DELETE') as "canDelete"
    `;
    expect(rows[0]).toStrictEqual({
      canSelect: true,
      canInsert: true,
      canUpdate: true,
      canDelete: true,
    });
  });

  it("anon, authenticated và service_role không có quyền nào trên bảng", async () => {
    for (const role of DATA_API_ROLES) {
      const rows = await migrationSql<{ canSelect: boolean; canInsert: boolean }[]>`
        select has_table_privilege(${role}, 'app.rate_limits', 'SELECT') as "canSelect",
               has_table_privilege(${role}, 'app.rate_limits', 'INSERT') as "canInsert"
      `;
      expect(rows[0], role).toStrictEqual({ canSelect: false, canInsert: false });
    }
  });

  it("SET ROLE anon hoặc authenticated rồi đọc, ghi thì bị từ chối (42501)", async () => {
    for (const role of ["anon", "authenticated"]) {
      await migrationSql`set role ${migrationSql(role)}`;
      try {
        await expect(migrationSql`select * from app.rate_limits`).rejects.toMatchObject({
          code: "42501",
        });
        await expect(
          migrationSql`insert into app.rate_limits (key, window_start) values ('x', now())`,
        ).rejects.toMatchObject({ code: "42501" });
      } finally {
        await migrationSql`reset role`;
      }
    }
  });

  it("bật RLS và chỉ có policy dành cho app_runtime", async () => {
    const rows = await migrationSql<{ rlsEnabled: boolean; policyRoles: string[] }[]>`
      select c.relrowsecurity as "rlsEnabled",
             coalesce(
               (select array_agg(distinct role_name order by role_name)
                from pg_policies p, unnest(p.roles) as role_name
                where p.schemaname = 'app' and p.tablename = c.relname),
               '{}'
             ) as "policyRoles"
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app' and c.relname = 'rate_limits'
    `;
    expect(rows[0]).toStrictEqual({ rlsEnabled: true, policyRoles: ["app_runtime"] });
  });

  it("app_runtime không có quyền DDL trên bảng", async () => {
    await expect(
      appSql`alter table app.rate_limits add column tmp_khong_duoc int`,
    ).rejects.toMatchObject({ code: "42501" });
    await expect(appSql`drop table app.rate_limits`).rejects.toMatchObject({ code: "42501" });
  });

  it("khóa chính (key, window_start) chặn dòng trùng; count phải dương", async () => {
    const key = keyOf("constraints");
    await appSql`insert into app.rate_limits (key, window_start, count) values (${key}, '2026-10-03T07:30:00Z', 1)`;

    await expect(
      appSql`insert into app.rate_limits (key, window_start, count) values (${key}, '2026-10-03T07:30:00Z', 1)`,
    ).rejects.toMatchObject({ code: "23505" }); // unique_violation
    await expect(
      appSql`insert into app.rate_limits (key, window_start, count) values (${key}, '2026-10-03T07:31:00Z', 0)`,
    ).rejects.toMatchObject({ code: "23514" }); // check_violation
  });
});
