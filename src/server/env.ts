import "server-only";
import { z } from "zod";

const APP_ENVS = ["local", "test", "staging", "production"] as const;
type AppEnv = (typeof APP_ENVS)[number];

const PRODUCTION_LIKE_ENVS: readonly AppEnv[] = ["staging", "production"];

const rawEnvSchema = z.object({
  APP_ENV: z.enum(APP_ENVS),
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  DATABASE_MIGRATION_URL: z.string().optional(),

  SUPABASE_URL: z.string().min(1).optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),

  SEPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  SEPAY_API_TOKEN: z.string().min(1).optional(),

  PAYEE_BANK_BIN: z.string().min(1).optional(),
  PAYEE_BANK_NAME: z.string().min(1).optional(),
  PAYEE_ACCOUNT_NO: z.string().min(1).optional(),
  PAYEE_ACCOUNT_NAME: z.string().min(1).optional(),

  PAYMENT_PROVIDER: z.string().min(1),
  SMS_PROVIDER: z.string().min(1),
  CAPTCHA_PROVIDER: z.string().min(1),
  STORAGE_PROVIDER: z.string().min(1),

  SMS_HOOK_SECRET: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),

  HANDOVER_SECRET: z.string().min(1).optional(),
  VIEW_TOKEN_PEPPER: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),

  SENTRY_DSN: z.string().optional(),
  OWNER_ALERT_CHANNEL: z.string().optional(),
});

type RawEnv = z.infer<typeof rawEnvSchema>;

// Biến bắt buộc phải có ở staging/production nhưng có thể để trống ở local/test
// (nơi các adapter giả thay thế cho dịch vụ thật).
const REQUIRED_ONLY_IN_PRODUCTION_LIKE: readonly (keyof RawEnv)[] = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SEPAY_WEBHOOK_SECRET",
  "SEPAY_API_TOKEN",
  "PAYEE_BANK_BIN",
  "PAYEE_BANK_NAME",
  "PAYEE_ACCOUNT_NO",
  "PAYEE_ACCOUNT_NAME",
  "SMS_HOOK_SECRET",
  "TURNSTILE_SECRET_KEY",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "HANDOVER_SECRET",
  "VIEW_TOKEN_PEPPER",
  "CRON_SECRET",
];

// Giá trị đánh dấu adapter giả: không được dùng ở staging/production.
const MOCK_PROVIDER_VALUES: readonly [keyof RawEnv, string][] = [
  ["PAYMENT_PROVIDER", "fake"],
  ["SMS_PROVIDER", "console"],
  ["CAPTCHA_PROVIDER", "always-pass"],
  ["STORAGE_PROVIDER", "memory"],
];

const envSchema = rawEnvSchema.superRefine((value, ctx) => {
  if (!PRODUCTION_LIKE_ENVS.includes(value.APP_ENV)) {
    return;
  }

  for (const [key, mockValue] of MOCK_PROVIDER_VALUES) {
    if (value[key] === mockValue) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} không được là "${mockValue}" (adapter giả) khi APP_ENV=${value.APP_ENV}`,
      });
    }
  }

  for (const key of REQUIRED_ONLY_IN_PRODUCTION_LIKE) {
    if (!value[key]) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} là bắt buộc khi APP_ENV=${value.APP_ENV}`,
      });
    }
  }
});

export type Env = RawEnv;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join(".") || "(gốc)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Cấu hình biến môi trường không hợp lệ:\n${details}`);
  }
  return result.data;
}

let cachedEnv: Env | undefined;

function loadEnv(): Env {
  if (!cachedEnv) {
    cachedEnv = parseEnv(process.env);
  }
  return cachedEnv;
}

// Lazy: chỉ đọc và kiểm tra process.env khi lần đầu có nơi thực sự dùng `env`,
// để import module này (ví dụ trong test) không tự động parse process.env thật của máy chạy.
export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    return loadEnv()[prop as keyof Env];
  },
});
