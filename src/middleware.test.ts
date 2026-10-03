import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractNonce, parseCsp } from "../tests/helpers/csp";

// Biến môi trường hợp lệ cho `env.ts`; middleware đọc cấu hình qua `env` chứ không đọc rải rác.
const BASE_ENV: Record<string, string> = {
  APP_ENV: "local",
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://test@127.0.0.1:1/test",
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  SUPABASE_SECRET_KEY: "test-secret-key",
  SEPAY_WEBHOOK_SECRET: "test-webhook-secret",
  SEPAY_API_TOKEN: "test-api-token",
  PAYEE_BANK_BIN: "970436",
  PAYEE_BANK_NAME: "Test Bank",
  PAYEE_ACCOUNT_NO: "0000000000",
  PAYEE_ACCOUNT_NAME: "TEST ACCOUNT",
  PAYMENT_PROVIDER: "sepay",
  SMS_PROVIDER: "esms",
  CAPTCHA_PROVIDER: "turnstile",
  STORAGE_PROVIDER: "supabase",
  SMS_HOOK_SECRET: "test-sms-hook-secret",
  TURNSTILE_SECRET_KEY: "test-turnstile-secret",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-turnstile-site-key",
  HANDOVER_SECRET: "test-handover-secret",
  VIEW_TOKEN_PEPPER: "test-pepper",
  CRON_SECRET: "test-cron-secret",
  SENTRY_DSN: "https://testkey@o123456.ingest.sentry.io/789",
  NODE_ENV: "production",
};

// `env.ts` giữ kết quả parse trong module nên mỗi kịch bản phải nạp lại module từ đầu.
async function loadMiddleware(overrides: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...overrides })) {
    vi.stubEnv(key, value);
  }
  const { middleware } = await import("@/middleware");
  return middleware;
}

function request(path = "/") {
  return new NextRequest(`http://localhost:3000${path}`);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("middleware", () => {
  it("đặt đủ header bảo mật, lấy cấu hình từ env", async () => {
    const middleware = await loadMiddleware();
    const response = middleware(request());

    const csp = response.headers.get("Content-Security-Policy") ?? "";
    expect(extractNonce(csp)).toBeTruthy();
    expect(parseCsp(csp).get("img-src")).toContain("https://abcdefgh.supabase.co");
    expect(parseCsp(csp).get("connect-src")).toContain("https://o123456.ingest.sentry.io");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("Permissions-Policy")).toContain("camera=(self)");
  });

  it("mỗi request có nonce khác nhau", async () => {
    const middleware = await loadMiddleware();
    const nonces = new Set<string | undefined>();
    for (let i = 0; i < 50; i += 1) {
      const response = middleware(request());
      nonces.add(extractNonce(response.headers.get("Content-Security-Policy") ?? ""));
    }
    expect(nonces.size).toBe(50);
    expect(nonces.has(undefined)).toBe(false);
  });

  it("chỉ gửi HSTS ở staging và production", async () => {
    const hsts = async (appEnv: string) => {
      const middleware = await loadMiddleware(
        appEnv === "staging" || appEnv === "production"
          ? { APP_ENV: appEnv, APP_URL: "https://shop.example.test" }
          : { APP_ENV: appEnv },
      );
      return middleware(request()).headers.get("Strict-Transport-Security");
    };

    expect(await hsts("local")).toBeNull();
    expect(await hsts("test")).toBeNull();
    expect(await hsts("staging")).toBe("max-age=63072000; includeSubDomains; preload");
    expect(await hsts("production")).toBe("max-age=63072000; includeSubDomains; preload");
  });

  it("NODE_ENV=development ở local thì nới 'unsafe-eval', ở production thì không", async () => {
    const dev = (await loadMiddleware({ NODE_ENV: "development" }))(request());
    expect(parseCsp(dev.headers.get("Content-Security-Policy") ?? "").get("script-src")).toContain(
      "'unsafe-eval'",
    );

    const prod = (
      await loadMiddleware({
        APP_ENV: "production",
        APP_URL: "https://shop.example.test",
        NODE_ENV: "development",
      })
    )(request());
    expect(prod.headers.get("Content-Security-Policy")).not.toContain("'unsafe-eval'");
  });

  it("cấu hình môi trường sai thì ném lỗi, không trả phản hồi thiếu header", async () => {
    const middleware = await loadMiddleware({ APP_ENV: "khong-hop-le" });
    expect(() => middleware(request())).toThrow();
  });
});
