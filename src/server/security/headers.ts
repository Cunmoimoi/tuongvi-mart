import "server-only";
import { isProductionLike, type AppEnv } from "@/server/env";

// Toàn bộ file này là hàm thuần: không đọc process.env, không dùng Next.js. Cấu hình đi vào qua
// tham số để unit test được từng kịch bản. `src/middleware.ts` là nơi duy nhất đọc `env`.
// Chạy được cả trên Edge runtime nên chỉ dùng API chuẩn của web (Web Crypto, URL, btoa).
// Nguồn quy tắc: docs/SECURITY.md mục 2 ("HTTP headers").

export interface SecurityHeadersInput {
  /** Nonce của request này, sinh bằng `generateNonce()`. */
  nonce: string;
  appEnv: AppEnv;
  /** `process.env.NODE_ENV`: chỉ để phân biệt `next dev` với bản build. */
  nodeEnv: string | undefined;
  /** `SUPABASE_URL`: lấy origin để cho phép ảnh từ Supabase Storage. */
  supabaseUrl?: string | undefined;
  /** `SENTRY_DSN`: lấy host ingest để cho phép gửi báo lỗi. */
  sentryDsn?: string | undefined;
  /** `CAPTCHA_PROVIDER`: chỉ `turnstile` mới mở domain Cloudflare. */
  captchaProvider?: string | undefined;
  /** `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: thiếu khóa thì widget không chạy, không mở domain. */
  turnstileSiteKey?: string | undefined;
}

/** Tên directive → danh sách nguồn. Mảng rỗng là directive dạng cờ (`upgrade-insecure-requests`). */
export type CspDirectives = Readonly<Record<string, readonly string[]>>;

export type SecurityHeaders = Record<string, string> & { "Content-Security-Policy": string };

// Origin của Turnstile do Cloudflare quy định, không có biến môi trường nào chứa nó. Việc có mở
// hay không được quyết định bởi env (CAPTCHA_PROVIDER, NEXT_PUBLIC_TURNSTILE_SITE_KEY).
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

const HSTS_VALUE = "max-age=63072000; includeSubDomains; preload";
const PERMISSIONS_POLICY = "camera=(self), geolocation=(self), microphone=(), payment=()";

const NONCE_BYTES = 16; // 128 bit
// Ký tự hợp lệ của nonce-source trong CSP (base64 và base64url). Chặn mọi ký tự có thể phá cú pháp
// header như khoảng trắng, dấu nháy, dấu chấm phẩy, xuống dòng.
const NONCE_PATTERN = /^[A-Za-z0-9+/_-]{22,}={0,2}$/;
// Chỉ nhận hostname gồm chữ thường, số, dấu chấm, gạch ngang: loại ký tự đại diện (`*.x.co`) mà
// URL parser vẫn chấp nhận.
const HOSTNAME_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/;

/** Nonce ngẫu nhiên 128 bit (Web Crypto), mã hóa base64. Mỗi request phải gọi một lần. */
export function generateNonce(): string {
  const bytes = new Uint8Array(NONCE_BYTES);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Chuyển một URL lấy từ env thành origin an toàn để đưa vào CSP, hoặc `undefined` nếu không dùng
 * được. "Không dùng được" luôn dẫn tới CSP chặt hơn (không có nguồn đó), không bao giờ lỏng hơn.
 * Đi qua `URL` để chỉ lấy `origin`: bỏ đường dẫn, query, thông tin đăng nhập, và để chuỗi độc hại
 * (chứa `;`, khoảng trắng, xuống dòng) không chèn thêm được directive hay header.
 */
function toOrigin(value: string | undefined, protocols: readonly string[]): string | undefined {
  if (!value) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (!protocols.includes(url.protocol) || !HOSTNAME_PATTERN.test(url.hostname)) {
    return undefined;
  }
  return url.origin;
}

/**
 * Nới lỏng riêng cho `next dev`: React dùng `eval` để dựng lại stack lỗi phía server trong trình
 * duyệt (docs Next.js, "Content Security Policy" → "Development Environment"). Production không
 * cần. Hàm này tách riêng và chỉ được gọi từ `buildCspDirectives` khi `appEnv` là `local` và
 * `nodeEnv` là `development`; có test chứng minh staging/production không bao giờ đi qua nó.
 */
export function relaxCspForDevelopment(directives: CspDirectives): CspDirectives {
  return { ...directives, "script-src": [...(directives["script-src"] ?? []), "'unsafe-eval'"] };
}

export function buildCspDirectives(input: SecurityHeadersInput): CspDirectives {
  if (!NONCE_PATTERN.test(input.nonce)) {
    throw new Error("Nonce CSP không hợp lệ: cần chuỗi base64 từ generateNonce()");
  }

  const productionLike = isProductionLike(input.appEnv);
  const turnstile = input.captchaProvider === "turnstile" && Boolean(input.turnstileSiteKey);
  // Supabase local chạy http://127.0.0.1; staging/production bắt buộc https.
  const supabaseOrigin = toOrigin(
    input.supabaseUrl,
    productionLike ? ["https:"] : ["https:", "http:"],
  );
  const sentryOrigin = toOrigin(input.sentryDsn, ["https:"]);

  const directives: Record<string, readonly string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${input.nonce}'`,
      "'strict-dynamic'",
      ...(turnstile ? [TURNSTILE_ORIGIN] : []),
    ],
    // Ngoại lệ có chủ đích theo SECURITY.md: thuộc tính style của React/Tailwind là inline.
    // Chỉ áp cho style; script tuyệt đối không có 'unsafe-inline'.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...(supabaseOrigin ? [supabaseOrigin] : [])],
    "connect-src": ["'self'", ...(sentryOrigin ? [sentryOrigin] : [])],
    "frame-src": turnstile ? [TURNSTILE_ORIGIN] : ["'none'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
  };

  // Chỉ staging/production: bản local chạy http://localhost nên không được nâng cấp lên https.
  if (productionLike) {
    directives["upgrade-insecure-requests"] = [];
  }

  const isNextDev = input.appEnv === "local" && input.nodeEnv === "development";
  return isNextDev ? relaxCspForDevelopment(directives) : directives;
}

export function buildContentSecurityPolicy(input: SecurityHeadersInput): string {
  return Object.entries(buildCspDirectives(input))
    .map(([name, sources]) => [name, ...sources].join(" "))
    .join("; ");
}

export function buildSecurityHeaders(input: SecurityHeadersInput): SecurityHeaders {
  const headers: SecurityHeaders = {
    "Content-Security-Policy": buildContentSecurityPolicy(input),
    "X-Content-Type-Options": "nosniff",
    // Trang có token trên URL cần `no-referrer` (SECURITY.md); các trang đó chưa tồn tại.
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": PERMISSIONS_POLICY,
  };

  // HSTS làm trình duyệt ghi nhớ "chỉ dùng https" tới 2 năm: tuyệt đối không gửi ở local/test.
  if (isProductionLike(input.appEnv)) {
    headers["Strict-Transport-Security"] = HSTS_VALUE;
  }
  return headers;
}
