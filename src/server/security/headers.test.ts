import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildContentSecurityPolicy,
  buildCspDirectives,
  buildSecurityHeaders,
  generateNonce,
  relaxCspForDevelopment,
  type SecurityHeadersInput,
} from "@/server/security/headers";
import { parseCsp } from "../../../tests/helpers/csp";

const NONCE = "dGVzdC1ub25jZS0xMjM0NQ==";
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

type AppEnvValue = SecurityHeadersInput["appEnv"];

// Cấu hình đầy đủ: mọi dịch vụ ngoài đều được khai báo trong biến môi trường.
function fullInput(overrides: Partial<SecurityHeadersInput> = {}): SecurityHeadersInput {
  return {
    nonce: NONCE,
    appEnv: "production",
    nodeEnv: "production",
    supabaseUrl: "https://abcdefgh.supabase.co",
    sentryDsn: "https://testkey@o123456.ingest.sentry.io/789",
    captchaProvider: "turnstile",
    turnstileSiteKey: "0x4AAAAAAA-test-site-key",
    ...overrides,
  };
}

// Cấu hình trống: không có biến môi trường tùy chọn nào.
function bareInput(overrides: Partial<SecurityHeadersInput> = {}): SecurityHeadersInput {
  return { nonce: NONCE, appEnv: "production", nodeEnv: "production", ...overrides };
}

function directive(input: SecurityHeadersInput, name: string): string[] {
  return parseCsp(buildContentSecurityPolicy(input)).get(name) ?? [];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateNonce", () => {
  it("trả về base64 của ít nhất 128 bit ngẫu nhiên", () => {
    const nonce = generateNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(Buffer.from(nonce, "base64").length).toBeGreaterThanOrEqual(16);
  });

  it("không trùng nhau trong 10.000 lần sinh", () => {
    const nonces = new Set(Array.from({ length: 10_000 }, () => generateNonce()));
    expect(nonces.size).toBe(10_000);
  });

  it("dùng crypto.getRandomValues và không bao giờ gọi Math.random", () => {
    const mathRandom = vi.spyOn(Math, "random");
    const getRandomValues = vi.spyOn(globalThis.crypto, "getRandomValues");

    generateNonce();

    expect(mathRandom).not.toHaveBeenCalled();
    expect(getRandomValues).toHaveBeenCalledTimes(1);
  });
});

describe("buildContentSecurityPolicy: các directive bắt buộc", () => {
  it("script-src dùng nonce + strict-dynamic, không có nguồn nào khác ngoài danh sách cho phép", () => {
    expect(directive(fullInput(), "script-src")).toStrictEqual([
      "'self'",
      `'nonce-${NONCE}'`,
      "'strict-dynamic'",
      TURNSTILE_ORIGIN,
    ]);
    expect(directive(bareInput(), "script-src")).toStrictEqual([
      "'self'",
      `'nonce-${NONCE}'`,
      "'strict-dynamic'",
    ]);
  });

  it("chặn nhúng khung, đổi base URI, form ra ngoài và plugin", () => {
    const csp = parseCsp(buildContentSecurityPolicy(fullInput()));
    expect(csp.get("frame-ancestors")).toStrictEqual(["'none'"]);
    expect(csp.get("base-uri")).toStrictEqual(["'self'"]);
    expect(csp.get("object-src")).toStrictEqual(["'none'"]);
    expect(csp.get("form-action")).toStrictEqual(["'self'"]);
    expect(csp.get("default-src")).toStrictEqual(["'self'"]);
  });

  it("style-src giữ 'unsafe-inline' theo SECURITY.md mục 2 (ngoại lệ có chủ đích, chỉ cho style)", () => {
    expect(directive(fullInput(), "style-src")).toStrictEqual(["'self'", "'unsafe-inline'"]);
  });

  it("không bao giờ cho javascript:, data:, blob: hay ký tự đại diện vào script-src", () => {
    for (const source of directive(fullInput(), "script-src")) {
      expect(source).not.toMatch(/^(javascript:|data:|blob:|\*|https?:)$/);
    }
  });

  it("nonce khác nhau cho ra CSP khác nhau", () => {
    const a = buildContentSecurityPolicy(fullInput({ nonce: "QUFBQUFBQUFBQUFBQUFBQQ==" }));
    const b = buildContentSecurityPolicy(fullInput({ nonce: "QkJCQkJCQkJCQkJCQkJCQg==" }));
    expect(a).not.toBe(b);
    expect(a).toContain("'nonce-QUFBQUFBQUFBQUFBQUFBQQ=='");
    expect(b).toContain("'nonce-QkJCQkJCQkJCQkJCQkJCQg=='");
  });

  it.each([
    "",
    "abc",
    "'; script-src * ; '",
    "dGVzdC1ub25jZS0xMjM0NQ== 'unsafe-inline'",
    "dGVzdC1ub25jZS0xMjM0NQ==\r\nX-Evil: 1",
  ])("từ chối nonce không hợp lệ: %j", (nonce) => {
    expect(() => buildContentSecurityPolicy(fullInput({ nonce }))).toThrow();
  });

  it("CSP đầy đủ cho production khớp đúng bản đã duyệt (đổi CSP phải đổi cả test và ghi lý do)", () => {
    expect(buildContentSecurityPolicy(fullInput())).toBe(
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${NONCE}' 'strict-dynamic' ${TURNSTILE_ORIGIN}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https://abcdefgh.supabase.co",
        "connect-src 'self' https://o123456.ingest.sentry.io",
        `frame-src ${TURNSTILE_ORIGIN}`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
      ].join("; "),
    );
  });
});

describe("CSP production và staging KHÔNG có 'unsafe-eval' / 'unsafe-inline' cho script", () => {
  const appEnvs: AppEnvValue[] = ["staging", "production"];
  const nodeEnvs = ["production", "development", "test", undefined];
  const inputs = [
    ["cấu hình đầy đủ", fullInput],
    ["cấu hình trống", bareInput],
  ] as const;

  for (const appEnv of appEnvs) {
    for (const nodeEnv of nodeEnvs) {
      for (const [label, make] of inputs) {
        it(`APP_ENV=${appEnv}, NODE_ENV=${String(nodeEnv)}, ${label}`, () => {
          const csp = buildContentSecurityPolicy(make({ appEnv, nodeEnv }));
          const directives = parseCsp(csp);

          expect(csp).not.toContain("'unsafe-eval'");
          expect(csp).not.toContain("wasm-unsafe-eval");
          expect(directives.get("script-src")).not.toContain("'unsafe-inline'");
          // 'unsafe-inline' chỉ được xuất hiện ở style-src, không ở directive nào khác.
          const withUnsafeInline = [...directives]
            .filter(([, sources]) => sources.includes("'unsafe-inline'"))
            .map(([name]) => name);
          expect(withUnsafeInline).toStrictEqual(["style-src"]);
          // Không có directive script nào khác có thể nới lỏng script-src.
          expect(directives.has("script-src-elem")).toBe(false);
          expect(directives.has("script-src-attr")).toBe(false);
        });
      }
    }
  }
});

describe("relaxCspForDevelopment (chế độ dev, tách riêng khỏi hàm dựng CSP)", () => {
  it("chỉ thêm 'unsafe-eval' vào script-src, không đụng directive nào khác", () => {
    const strict = buildCspDirectives(fullInput({ appEnv: "local", nodeEnv: "production" }));
    const relaxed = relaxCspForDevelopment(strict);

    const withoutScriptSrc = (directives: Record<string, readonly string[]>) =>
      Object.entries(directives).filter(([name]) => name !== "script-src");

    expect(relaxed["script-src"]).toStrictEqual([...(strict["script-src"] ?? []), "'unsafe-eval'"]);
    expect(withoutScriptSrc(relaxed)).toStrictEqual(withoutScriptSrc(strict));
    expect(relaxed["script-src"]).not.toContain("'unsafe-inline'");
  });

  it("không sửa đối tượng đầu vào", () => {
    const strict = buildCspDirectives(fullInput({ appEnv: "local", nodeEnv: "production" }));
    const before = structuredClone(strict);
    relaxCspForDevelopment(strict);
    expect(strict).toStrictEqual(before);
  });

  it("local + NODE_ENV=development: có 'unsafe-eval' để công cụ dev của React chạy được", () => {
    const scriptSrc = directive(
      fullInput({ appEnv: "local", nodeEnv: "development" }),
      "script-src",
    );
    expect(scriptSrc).toContain("'unsafe-eval'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("local + bản build production (NODE_ENV=production): KHÔNG nới", () => {
    expect(
      directive(fullInput({ appEnv: "local", nodeEnv: "production" }), "script-src"),
    ).not.toContain("'unsafe-eval'");
  });

  it.each(["test", undefined, "", "Development"])(
    "local + NODE_ENV=%j: KHÔNG nới (chỉ đúng chuỗi 'development' mới nới)",
    (nodeEnv) => {
      expect(directive(fullInput({ appEnv: "local", nodeEnv }), "script-src")).not.toContain(
        "'unsafe-eval'",
      );
    },
  );

  it("APP_ENV=test: KHÔNG nới dù NODE_ENV=development", () => {
    expect(
      directive(fullInput({ appEnv: "test", nodeEnv: "development" }), "script-src"),
    ).not.toContain("'unsafe-eval'");
  });

  it.each<AppEnvValue>(["staging", "production"])(
    "%s + NODE_ENV=development: kết quả giống hệt bản production, không bị nới",
    (appEnv) => {
      const input = fullInput({ appEnv });
      expect(buildContentSecurityPolicy({ ...input, nodeEnv: "development" })).toBe(
        buildContentSecurityPolicy({ ...input, nodeEnv: "production" }),
      );
    },
  );
});

describe("domain cho phép lấy từ biến môi trường", () => {
  describe("Supabase Storage (SUPABASE_URL) → img-src", () => {
    it("chỉ lấy origin, bỏ đường dẫn, thông tin đăng nhập, query", () => {
      expect(
        directive(
          fullInput({ supabaseUrl: "https://user:pw@abcdefgh.supabase.co/rest/v1/?apikey=x#y" }),
          "img-src",
        ),
      ).toStrictEqual(["'self'", "data:", "blob:", "https://abcdefgh.supabase.co"]);
    });

    it("local và test cho phép http (Supabase chạy trong Docker), staging/production thì không", () => {
      const local = "http://127.0.0.1:54321";
      expect(directive(fullInput({ appEnv: "local", supabaseUrl: local }), "img-src")).toContain(
        local,
      );
      expect(directive(fullInput({ appEnv: "test", supabaseUrl: local }), "img-src")).toContain(
        local,
      );
      for (const appEnv of ["staging", "production"] as const) {
        expect(directive(fullInput({ appEnv, supabaseUrl: local }), "img-src")).toStrictEqual([
          "'self'",
          "data:",
          "blob:",
        ]);
      }
    });
  });

  describe("Sentry (SENTRY_DSN) → connect-src", () => {
    it("chỉ lấy đúng host ingest trong DSN, không lộ khóa công khai của DSN", () => {
      const csp = buildContentSecurityPolicy(fullInput());
      expect(parseCsp(csp).get("connect-src")).toStrictEqual([
        "'self'",
        "https://o123456.ingest.sentry.io",
      ]);
      expect(csp).not.toContain("testkey");
    });

    it.each([
      ["DSN dùng http", "http://testkey@o123456.ingest.sentry.io/789"],
      ["DSN không phải URL", "not-a-dsn"],
      ["DSN rỗng", ""],
      ["host chứa ký tự đại diện", "https://testkey@*.sentry.io/789"],
    ])("bỏ qua %s", (_label, sentryDsn) => {
      expect(directive(fullInput({ sentryDsn }), "connect-src")).toStrictEqual(["'self'"]);
    });
  });

  describe("Cloudflare Turnstile (CAPTCHA_PROVIDER + NEXT_PUBLIC_TURNSTILE_SITE_KEY)", () => {
    it("bật: có trong script-src và frame-src", () => {
      expect(directive(fullInput(), "script-src")).toContain(TURNSTILE_ORIGIN);
      expect(directive(fullInput(), "frame-src")).toStrictEqual([TURNSTILE_ORIGIN]);
    });

    it.each([
      ["nhà cung cấp captcha là always-pass", { captchaProvider: "always-pass" }],
      ["thiếu CAPTCHA_PROVIDER", { captchaProvider: undefined }],
      ["thiếu site key", { turnstileSiteKey: undefined }],
      ["site key rỗng", { turnstileSiteKey: "" }],
    ])("tắt khi %s: không có trong script-src, frame-src là 'none'", (_label, overrides) => {
      const input = fullInput(overrides);
      expect(directive(input, "script-src")).not.toContain(TURNSTILE_ORIGIN);
      expect(directive(input, "frame-src")).toStrictEqual(["'none'"]);
    });
  });

  describe("chuỗi cấu hình độc hại không chèn được directive hay header", () => {
    it.each([
      "https://abcdefgh.supabase.co; script-src *",
      "https://abcdefgh.supabase.co\r\nSet-Cookie: a=b",
      "https://*.supabase.co",
      "https://abcdefgh.supabase.co 'unsafe-eval'",
      "javascript:alert(1)",
      "not-a-url",
      "",
    ])("SUPABASE_URL=%j bị bỏ qua", (supabaseUrl) => {
      const csp = buildContentSecurityPolicy(fullInput({ supabaseUrl }));
      expect(parseCsp(csp).get("img-src")).toStrictEqual(["'self'", "data:", "blob:"]);
      expect(csp).not.toMatch(/[\r\n]/);
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp.match(/script-src/g)).toHaveLength(1);
    });
  });

  it("thiếu biến môi trường thì CSP chỉ chặt hơn: không có host ngoài nào, và mọi nguồn đều nằm trong bản đầy đủ", () => {
    const bareCsp = buildContentSecurityPolicy(bareInput());
    const fullCsp = buildContentSecurityPolicy(fullInput());

    expect(bareCsp).not.toMatch(/https?:\/\//);

    const full = parseCsp(fullCsp);
    for (const [name, sources] of parseCsp(bareCsp)) {
      const isFullyBlocked = sources.length === 1 && sources[0] === "'none'";
      if (isFullyBlocked) {
        continue; // 'none' là mức chặt nhất, không thể "lỏng hơn" bản đầy đủ.
      }
      expect(full.has(name), `directive ${name} phải có trong bản đầy đủ`).toBe(true);
      for (const source of sources) {
        expect(full.get(name), `${name}: ${source}`).toContain(source);
      }
    }
  });
});

describe("buildContentSecurityPolicy: upgrade-insecure-requests", () => {
  it.each<[AppEnvValue, boolean]>([
    ["production", true],
    ["staging", true],
    ["local", false],
    ["test", false],
  ])("APP_ENV=%s → có upgrade-insecure-requests: %s", (appEnv, expected) => {
    expect(
      parseCsp(buildContentSecurityPolicy(fullInput({ appEnv }))).has("upgrade-insecure-requests"),
    ).toBe(expected);
  });
});

describe("buildSecurityHeaders", () => {
  it("có đủ các header bắt buộc với giá trị đúng SECURITY.md", () => {
    const headers = buildSecurityHeaders(fullInput());

    expect(headers["Content-Security-Policy"]).toBe(buildContentSecurityPolicy(fullInput()));
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBe(
      "camera=(self), geolocation=(self), microphone=(), payment=()",
    );
  });

  it("camera và geolocation chỉ cho 'self'; micro và thanh toán bị tắt", () => {
    const policy = buildSecurityHeaders(fullInput())["Permissions-Policy"] ?? "";
    expect(policy).toContain("camera=(self)");
    expect(policy).toContain("geolocation=(self)");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("payment=()");
    expect(policy).not.toContain("*");
  });

  it.each<[AppEnvValue, boolean]>([
    ["production", true],
    ["staging", true],
    ["local", false],
    ["test", false],
  ])("APP_ENV=%s → gửi HSTS: %s", (appEnv, expected) => {
    const headers = buildSecurityHeaders(fullInput({ appEnv }));
    expect("Strict-Transport-Security" in headers).toBe(expected);
    if (expected) {
      expect(headers["Strict-Transport-Security"]).toBe(
        "max-age=63072000; includeSubDomains; preload",
      );
    }
  });

  it("HSTS không phụ thuộc NODE_ENV: staging chạy dev vẫn có, local chạy production vẫn không", () => {
    expect(
      "Strict-Transport-Security" in
        buildSecurityHeaders(fullInput({ appEnv: "staging", nodeEnv: "development" })),
    ).toBe(true);
    expect(
      "Strict-Transport-Security" in
        buildSecurityHeaders(fullInput({ appEnv: "local", nodeEnv: "production" })),
    ).toBe(false);
  });

  it("giá trị header không chứa ký tự xuống dòng", () => {
    for (const value of Object.values(buildSecurityHeaders(fullInput()))) {
      expect(value).not.toMatch(/[\r\n]/);
    }
  });
});
