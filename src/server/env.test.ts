import { describe, expect, it } from "vitest";
import { isProductionLike, parseEnv } from "@/server/env";

function baseEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    APP_ENV: "local",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: "postgres://app_runtime:pass@localhost:54322/postgres",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    SUPABASE_SECRET_KEY: "secret-key",
    SEPAY_WEBHOOK_SECRET: "sepay-webhook-secret",
    SEPAY_API_TOKEN: "sepay-api-token",
    PAYEE_BANK_BIN: "970436",
    PAYEE_BANK_NAME: "Vietcombank",
    PAYEE_ACCOUNT_NO: "0123456789",
    PAYEE_ACCOUNT_NAME: "TUONG VI MART",
    PAYMENT_PROVIDER: "sepay",
    SMS_PROVIDER: "console",
    CAPTCHA_PROVIDER: "always-pass",
    STORAGE_PROVIDER: "memory",
    SMS_HOOK_SECRET: "sms-hook-secret",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
    HANDOVER_SECRET: "handover-secret",
    VIEW_TOKEN_PEPPER: "view-token-pepper",
    CRON_SECRET: "cron-secret",
    ...overrides,
  };
}

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return baseEnv({
    APP_ENV: "production",
    APP_URL: "https://tuongvimart.vn",
    SMS_PROVIDER: "esms",
    CAPTCHA_PROVIDER: "turnstile",
    STORAGE_PROVIDER: "supabase",
    ...overrides,
  });
}

describe("parseEnv", () => {
  it("chấp nhận cấu hình hợp lệ cho môi trường local", () => {
    const env = parseEnv(baseEnv({ APP_ENV: "local" }));
    expect(env.APP_ENV).toBe("local");
  });

  it("chấp nhận cấu hình hợp lệ cho môi trường test", () => {
    const env = parseEnv(baseEnv({ APP_ENV: "test" }));
    expect(env.APP_ENV).toBe("test");
  });

  it("chấp nhận cấu hình hợp lệ cho môi trường staging (không dùng adapter giả)", () => {
    const env = parseEnv(
      baseEnv({
        APP_ENV: "staging",
        APP_URL: "https://staging.tuongvimart.vn",
        SMS_PROVIDER: "esms",
        CAPTCHA_PROVIDER: "turnstile",
        STORAGE_PROVIDER: "supabase",
      }),
    );
    expect(env.APP_ENV).toBe("staging");
  });

  it("chấp nhận cấu hình hợp lệ cho môi trường production (không dùng adapter giả)", () => {
    const env = parseEnv(productionEnv());
    expect(env.APP_ENV).toBe("production");
  });

  it("production mà SMS_PROVIDER=console thì ném lỗi", () => {
    expect(() => parseEnv(productionEnv({ SMS_PROVIDER: "console" }))).toThrow();
  });

  it("production thiếu SEPAY_WEBHOOK_SECRET thì ném lỗi", () => {
    expect(() => parseEnv(productionEnv({ SEPAY_WEBHOOK_SECRET: undefined }))).toThrow();
  });

  it("production mà PAYMENT_PROVIDER=fake thì ném lỗi", () => {
    expect(() => parseEnv(productionEnv({ PAYMENT_PROVIDER: "fake" }))).toThrow();
  });

  it("production mà CAPTCHA_PROVIDER=always-pass thì ném lỗi", () => {
    expect(() => parseEnv(productionEnv({ CAPTCHA_PROVIDER: "always-pass" }))).toThrow();
  });

  it("production mà STORAGE_PROVIDER=memory thì ném lỗi", () => {
    expect(() => parseEnv(productionEnv({ STORAGE_PROVIDER: "memory" }))).toThrow();
  });

  it("staging mà SMS_PROVIDER=console thì ném lỗi", () => {
    expect(() =>
      parseEnv(
        baseEnv({
          APP_ENV: "staging",
          SMS_PROVIDER: "console",
          CAPTCHA_PROVIDER: "turnstile",
          STORAGE_PROVIDER: "supabase",
        }),
      ),
    ).toThrow();
  });

  it("production thiếu HANDOVER_SECRET thì ném lỗi", () => {
    expect(() => parseEnv(productionEnv({ HANDOVER_SECRET: undefined }))).toThrow();
  });

  it("production thiếu PAYEE_ACCOUNT_NO thì ném lỗi", () => {
    expect(() => parseEnv(productionEnv({ PAYEE_ACCOUNT_NO: undefined }))).toThrow();
  });

  it("thiếu APP_ENV thì ném lỗi ở mọi môi trường", () => {
    expect(() => parseEnv(baseEnv({ APP_ENV: undefined }))).toThrow();
  });

  it("thiếu DATABASE_URL thì ném lỗi ở mọi môi trường", () => {
    expect(() => parseEnv(baseEnv({ DATABASE_URL: undefined }))).toThrow();
  });

  it("local vẫn dùng được adapter giả (SMS_PROVIDER=console, STORAGE_PROVIDER=memory)", () => {
    const env = parseEnv(baseEnv({ APP_ENV: "local" }));
    expect(env.SMS_PROVIDER).toBe("console");
    expect(env.STORAGE_PROVIDER).toBe("memory");
  });
});

// File .env sao chép từ .env.example thường để trống biến chưa dùng (`SEPAY_API_TOKEN=`).
// Chuỗi rỗng phải được coi như chưa đặt, không phải một giá trị hợp lệ và cũng không làm sập
// local, nhưng cũng không được làm production dễ dãi hơn.
describe("parseEnv: biến để trống", () => {
  const BLANK_OPTIONALS = {
    SEPAY_WEBHOOK_SECRET: "",
    SEPAY_API_TOKEN: "",
    PAYEE_BANK_BIN: "",
    PAYEE_ACCOUNT_NO: "",
    SMS_HOOK_SECRET: "",
    TURNSTILE_SECRET_KEY: "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    HANDOVER_SECRET: "",
    VIEW_TOKEN_PEPPER: "",
    CRON_SECRET: "",
    SENTRY_DSN: "",
    DATABASE_MIGRATION_URL: "",
    OWNER_ALERT_CHANNEL: "",
  };

  it.each(["local", "test"])("%s: biến tùy chọn để trống được coi là chưa đặt", (appEnv) => {
    const env = parseEnv(baseEnv({ APP_ENV: appEnv, ...BLANK_OPTIONALS }));
    expect(env.SEPAY_WEBHOOK_SECRET).toBeUndefined();
    expect(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY).toBeUndefined();
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it.each(Object.keys(BLANK_OPTIONALS).filter((key) => !/SENTRY|MIGRATION|OWNER/.test(key)))(
    "production: %s để trống vẫn bị từ chối như thiếu",
    (key) => {
      expect(() => parseEnv(productionEnv({ [key]: "" }))).toThrow(new RegExp(key));
    },
  );

  it("staging: biến bắt buộc để trống vẫn bị từ chối", () => {
    expect(() =>
      parseEnv(
        baseEnv({
          APP_ENV: "staging",
          SMS_PROVIDER: "esms",
          CAPTCHA_PROVIDER: "turnstile",
          STORAGE_PROVIDER: "supabase",
          SEPAY_API_TOKEN: "",
        }),
      ),
    ).toThrow(/SEPAY_API_TOKEN/);
  });

  it.each(["APP_ENV", "APP_URL", "DATABASE_URL", "PAYMENT_PROVIDER", "SMS_PROVIDER"])(
    "biến luôn bắt buộc %s để trống vẫn bị từ chối ở local",
    (key) => {
      expect(() => parseEnv(baseEnv({ [key]: "" }))).toThrow();
    },
  );

  it("adapter giả vẫn bị từ chối ở production dù các biến khác để trống", () => {
    expect(() => parseEnv(productionEnv({ SMS_PROVIDER: "console", CRON_SECRET: "" }))).toThrow(
      /SMS_PROVIDER/,
    );
  });
});

describe("isProductionLike", () => {
  it.each([
    ["staging", true],
    ["production", true],
    ["local", false],
    ["test", false],
  ] as const)("APP_ENV=%s → %s", (appEnv, expected) => {
    expect(isProductionLike(appEnv)).toBe(expected);
  });
});
