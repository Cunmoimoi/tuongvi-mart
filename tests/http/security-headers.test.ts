import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { extractNonce, parseCsp } from "../helpers/csp";
import { startNextServer, type RunningServer } from "./helpers/next-server";

// Test HTTP gọi vào bản build thật (`next start`): chạy `pnpm build` rồi `pnpm test:http`.
// Giá trị bên dưới chỉ là giá trị thử, không phải secret thật; không kết nối tới đâu cả.
const BASE_ENV: Record<string, string> = {
  DATABASE_URL: "postgres://test@127.0.0.1:1/test",
  DATABASE_MIGRATION_URL: "",
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
  STORAGE_PROVIDER: "supabase",
  SMS_HOOK_SECRET: "test-sms-hook-secret",
  TURNSTILE_SECRET_KEY: "test-turnstile-secret",
  HANDOVER_SECRET: "test-handover-secret",
  VIEW_TOKEN_PEPPER: "test-pepper",
  CRON_SECRET: "test-cron-secret",
  OWNER_ALERT_CHANNEL: "",
};

// Có cấu hình đầy đủ: các domain ngoài phải xuất hiện trong CSP.
const CONFIGURED_SERVICES: Record<string, string> = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SENTRY_DSN: "https://testkey@o123456.ingest.sentry.io/789",
  CAPTCHA_PROVIDER: "turnstile",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-turnstile-site-key",
};

// Cấu hình thiếu/hỏng: SUPABASE_URL không dùng được, không Sentry, không Turnstile.
// CSP phải chặt hơn, không được đoán domain.
const UNCONFIGURED_SERVICES: Record<string, string> = {
  SUPABASE_URL: "khong-phai-url",
  SENTRY_DSN: "",
  CAPTCHA_PROVIDER: "always-pass",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
};

const SCENARIOS = {
  local: {
    ...BASE_ENV,
    ...UNCONFIGURED_SERVICES,
    APP_ENV: "local",
    APP_URL: "http://localhost:3000",
  },
  staging: {
    ...BASE_ENV,
    ...CONFIGURED_SERVICES,
    APP_ENV: "staging",
    APP_URL: "https://staging.example.test",
  },
  production: {
    ...BASE_ENV,
    ...CONFIGURED_SERVICES,
    APP_ENV: "production",
    APP_URL: "https://shop.example.test",
  },
} as const;

type ScenarioName = keyof typeof SCENARIOS;

const PAGES = [
  { label: "trang chủ", path: "/", status: 200 },
  { label: "trang không tồn tại (404)", path: "/khong-ton-tai-xyz", status: 404 },
] as const;

const servers = {} as Record<ScenarioName, RunningServer>;

beforeAll(async () => {
  const names = Object.keys(SCENARIOS) as ScenarioName[];
  const started = await Promise.allSettled(names.map((name) => startNextServer(SCENARIOS[name])));
  const failed = started.find((result) => result.status === "rejected");
  // Nếu có server không lên được thì dừng các server đã lên rồi mới báo lỗi, tránh để sót tiến trình.
  if (failed) {
    await Promise.all(
      started.map((result) => (result.status === "fulfilled" ? result.value.stop() : undefined)),
    );
    throw failed.reason;
  }
  started.forEach((result, index) => {
    const name = names[index];
    if (name && result.status === "fulfilled") {
      servers[name] = result.value;
    }
  });
});

afterAll(async () => {
  await Promise.all(Object.values(servers).map((server) => server.stop()));
});

async function fetchPage(scenario: ScenarioName, path: string) {
  const response = await fetch(servers[scenario].baseUrl + path, { redirect: "manual" });
  const html = await response.text();
  return { response, html, headers: response.headers };
}

function cspOf(headers: Headers): string {
  return headers.get("content-security-policy") ?? "";
}

describe.each(PAGES)("$label ($path)", ({ path, status }) => {
  describe.each(Object.keys(SCENARIOS) as ScenarioName[])("APP_ENV=%s", (scenario) => {
    it(`trả về đúng mã ${status} và có đủ header bảo mật`, async () => {
      const { response, headers } = await fetchPage(scenario, path);

      expect(response.status).toBe(status);
      const csp = parseCsp(cspOf(headers));
      expect(csp.get("frame-ancestors")).toStrictEqual(["'none'"]);
      expect(csp.get("base-uri")).toStrictEqual(["'self'"]);
      expect(csp.get("object-src")).toStrictEqual(["'none'"]);
      expect(csp.get("form-action")).toStrictEqual(["'self'"]);
      expect(csp.get("script-src")).toContain("'strict-dynamic'");
      expect(extractNonce(cspOf(headers))).toBeTruthy();
      expect(headers.get("x-content-type-options")).toBe("nosniff");
      expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
      expect(headers.get("permissions-policy")).toBe(
        "camera=(self), geolocation=(self), microphone=(), payment=()",
      );
      expect(headers.get("x-powered-by")).toBeNull();
    });

    it("HSTS chỉ xuất hiện ở staging và production", async () => {
      const { headers } = await fetchPage(scenario, path);
      const hsts = headers.get("strict-transport-security");

      if (scenario === "local") {
        expect(hsts).toBeNull();
      } else {
        expect(hsts).toBe("max-age=63072000; includeSubDomains; preload");
      }
    });

    it("upgrade-insecure-requests chỉ có ở staging và production", async () => {
      const { headers } = await fetchPage(scenario, path);
      expect(parseCsp(cspOf(headers)).has("upgrade-insecure-requests")).toBe(scenario !== "local");
    });
  });

  describe.each(["staging", "production"] as const)("CSP của APP_ENV=%s", (scenario) => {
    it("script-src không có 'unsafe-eval' và 'unsafe-inline'", async () => {
      const { headers } = await fetchPage(scenario, path);
      const csp = cspOf(headers);
      const scriptSrc = parseCsp(csp).get("script-src") ?? [];

      expect(scriptSrc.length).toBeGreaterThan(0);
      expect(csp).not.toContain("'unsafe-eval'");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    });
  });

  describe("nonce", () => {
    it("mỗi request có nonce khác nhau", async () => {
      const nonces = await Promise.all(
        Array.from({ length: 8 }, async () => {
          const { headers } = await fetchPage("production", path);
          return extractNonce(cspOf(headers));
        }),
      );

      expect(nonces.every(Boolean)).toBe(true);
      expect(new Set(nonces).size).toBe(nonces.length);
    });

    it("nonce trong header khớp với nonce Next.js gắn vào mọi thẻ <script> của trang", async () => {
      const { html, headers } = await fetchPage("production", path);
      const nonce = extractNonce(cspOf(headers));
      const scriptTags = html.match(/<script\b[^>]*>/gi) ?? [];

      expect(nonce).toBeTruthy();
      expect(scriptTags.length).toBeGreaterThan(0);
      for (const tag of scriptTags) {
        expect(tag, `thẻ script thiếu nonce hợp lệ: ${tag}`).toContain(`nonce="${nonce}"`);
      }
    });
  });
});

describe("domain cho phép lấy từ biến môi trường", () => {
  it("cấu hình đầy đủ: Supabase, Sentry, Turnstile xuất hiện đúng chỗ", async () => {
    const { headers } = await fetchPage("production", "/");
    const csp = parseCsp(cspOf(headers));

    expect(csp.get("img-src")).toContain("https://abcdefgh.supabase.co");
    expect(csp.get("connect-src")).toContain("https://o123456.ingest.sentry.io");
    expect(csp.get("script-src")).toContain("https://challenges.cloudflare.com");
    expect(csp.get("frame-src")).toStrictEqual(["https://challenges.cloudflare.com"]);
  });

  it("cấu hình thiếu hoặc hỏng: CSP không có host ngoài nào và chặn khung nhúng", async () => {
    const { headers } = await fetchPage("local", "/");
    const csp = cspOf(headers);

    expect(csp).not.toMatch(/https?:\/\//);
    expect(parseCsp(csp).get("frame-src")).toStrictEqual(["'none'"]);
  });
});
