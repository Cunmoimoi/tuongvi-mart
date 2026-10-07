import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { buildSecurityHeaders, generateNonce } from "@/server/security/headers";

// CLAUDE.md bất biến 2: file này KHÔNG phải ranh giới bảo mật. Chỉ gắn header bảo mật (CSP nonce
// cho từng request, HSTS...) và sau này làm mới cookie phiên. Mọi kiểm tra quyền nằm trong
// Server Action và Route Handler.
//
// Next.js 16 đổi tên convention `middleware` thành `proxy` (chạy trên Node.js runtime).
export function proxy(request: NextRequest) {
  // `env` ném lỗi nếu cấu hình sai: request thất bại thay vì trả trang không có header bảo mật.
  const securityHeaders = buildSecurityHeaders({
    nonce: generateNonce(),
    appEnv: env.APP_ENV,
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: env.SUPABASE_URL,
    sentryDsn: env.SENTRY_DSN,
    captchaProvider: env.CAPTCHA_PROVIDER,
    turnstileSiteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });

  // Next.js lấy nonce từ CSP của *request* để gắn vào mọi <script> nó render. Thiếu bước này thì
  // trình duyệt chặn chính các script của Next.js.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", securityHeaders["Content-Security-Policy"]);

  // TODO(T1.1): làm mới phiên Supabase tại đây (đọc cookie từ `request`, ghi cookie đã làm mới
  // vào `response`) khi có `auth/supabase.adapter.ts` và `@supabase/ssr`. Việc này chỉ làm mới
  // cookie, không quyết định quyền truy cập.

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of Object.entries(securityHeaders)) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: [
    {
      // Bỏ file tĩnh và ảnh tối ưu hóa (không phải tài liệu HTML, không cần CSP) và request
      // prefetch của next/link, theo hướng dẫn CSP của Next.js. Trang HTML và route API đều đi qua.
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
