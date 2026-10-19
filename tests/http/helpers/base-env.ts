// Giá trị bên dưới chỉ là giá trị thử, không phải secret thật; không kết nối tới đâu cả.
// Dùng chung cho các test HTTP khởi động `next start` thật (tests/http/*.test.ts).

export const BASE_ENV: Record<string, string> = {
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
export const CONFIGURED_SERVICES: Record<string, string> = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SENTRY_DSN: "https://testkey@o123456.ingest.sentry.io/789",
  CAPTCHA_PROVIDER: "turnstile",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-turnstile-site-key",
};

// Cấu hình không dùng được: SUPABASE_URL không phải http(s), không Sentry, không Turnstile. CSP phải
// chặt hơn, không được đoán domain. (Trường hợp biến hoàn toàn vắng mặt do unit test phủ: .env.local
// trên máy dev sẽ tự điền vào biến vắng mặt nên không dựng được ở đây. Còn SUPABASE_URL sai
// định dạng thì `next.config.ts` đã từ chối khởi động.)
export const UNCONFIGURED_SERVICES: Record<string, string> = {
  SUPABASE_URL: "ftp://khong-dung-duoc.example.test",
  SENTRY_DSN: "",
  CAPTCHA_PROVIDER: "always-pass",
  // Có site key nhưng nhà cung cấp là always-pass: Turnstile vẫn phải đóng.
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-turnstile-site-key",
};
