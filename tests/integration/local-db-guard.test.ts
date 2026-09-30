import { describe, expect, it } from "vitest";
import { LocalDbGuardError, requireLocalDatabase } from "../../scripts/lib/local-db-guard.mts";

const LOCAL_URLS = {
  DATABASE_URL: "postgresql://app_runtime:pw@127.0.0.1:54322/postgres",
  DATABASE_MIGRATION_URL: "postgresql://postgres:postgres@localhost:54322/postgres",
};

const INTEGRATION_APP_ENVS = ["local", "test"] as const;

/**
 * Guard này là thứ ngăn `pnpm test:int` chạy DDL trên database thật. Nếu nó hỏng thì các
 * test khác trong thư mục này (tạo rồi xóa bảng trong schema app) trở thành nguy hiểm.
 */
describe("guard chặn test tích hợp chạy ngoài database local", () => {
  it("từ chối khi APP_ENV là production", () => {
    expect(() =>
      requireLocalDatabase({
        appEnv: "production",
        allowedAppEnvs: INTEGRATION_APP_ENVS,
        connectionUrls: LOCAL_URLS,
      }),
    ).toThrow(LocalDbGuardError);
  });

  it("từ chối khi APP_ENV là staging hoặc chưa đặt", () => {
    for (const appEnv of ["staging", undefined]) {
      expect(() =>
        requireLocalDatabase({
          appEnv,
          allowedAppEnvs: INTEGRATION_APP_ENVS,
          connectionUrls: LOCAL_URLS,
        }),
      ).toThrow(/APP_ENV phải là một trong \[local, test\]/);
    }
  });

  it("từ chối khi DATABASE_URL trỏ ra ngoài máy này", () => {
    expect(() =>
      requireLocalDatabase({
        appEnv: "local",
        allowedAppEnvs: INTEGRATION_APP_ENVS,
        connectionUrls: {
          ...LOCAL_URLS,
          DATABASE_URL: "postgresql://app_runtime:pw@db.abcdefghijkl.supabase.co:5432/postgres",
        },
      }),
    ).toThrow(/DATABASE_URL: trỏ tới "db\.abcdefghijkl\.supabase\.co"/);
  });

  it("từ chối khi DATABASE_MIGRATION_URL trỏ ra ngoài máy này", () => {
    expect(() =>
      requireLocalDatabase({
        appEnv: "test",
        allowedAppEnvs: INTEGRATION_APP_ENVS,
        connectionUrls: {
          ...LOCAL_URLS,
          DATABASE_MIGRATION_URL: "postgresql://postgres:pw@10.20.30.40:5432/postgres",
        },
      }),
    ).toThrow(/DATABASE_MIGRATION_URL: trỏ tới "10\.20\.30\.40"/);
  });

  it("từ chối khi thiếu chuỗi kết nối hoặc chuỗi kết nối không phải Postgres", () => {
    expect(() =>
      requireLocalDatabase({
        appEnv: "local",
        allowedAppEnvs: INTEGRATION_APP_ENVS,
        connectionUrls: { ...LOCAL_URLS, DATABASE_URL: undefined },
      }),
    ).toThrow(/DATABASE_URL chưa được đặt/);

    expect(() =>
      requireLocalDatabase({
        appEnv: "local",
        allowedAppEnvs: INTEGRATION_APP_ENVS,
        connectionUrls: { ...LOCAL_URLS, DATABASE_URL: "https://127.0.0.1/postgres" },
      }),
    ).toThrow(/không phải Postgres/);
  });

  it("cho chạy khi APP_ENV là local hoặc test và mọi chuỗi kết nối đều ở máy này", () => {
    for (const appEnv of INTEGRATION_APP_ENVS) {
      const config = requireLocalDatabase({
        appEnv,
        allowedAppEnvs: INTEGRATION_APP_ENVS,
        connectionUrls: LOCAL_URLS,
      });
      expect(config.appEnv).toBe(appEnv);
      expect(config.connectionUrls).toStrictEqual(LOCAL_URLS);
    }
  });

  it("môi trường đang chạy chính lệnh test:int này cũng phải qua được guard", () => {
    const config = requireLocalDatabase({
      appEnv: process.env.APP_ENV,
      allowedAppEnvs: INTEGRATION_APP_ENVS,
      connectionUrls: {
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_MIGRATION_URL: process.env.DATABASE_MIGRATION_URL,
      },
    });
    expect(INTEGRATION_APP_ENVS).toContain(config.appEnv);
  });
});
