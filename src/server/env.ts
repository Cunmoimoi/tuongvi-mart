import "server-only";
import { z } from "zod";
import {
  ADAPTER_PORT_NAMES,
  ADAPTER_PORTS,
  providerKind,
  providerNames,
} from "@/server/adapters/providers";

const APP_ENVS = ["local", "test", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

const PRODUCTION_LIKE_ENVS: readonly AppEnv[] = ["staging", "production"];

// Một nơi duy nhất định nghĩa "môi trường giống production" để env.ts, HSTS và CSP không lệch nhau.
export function isProductionLike(appEnv: AppEnv): boolean {
  return PRODUCTION_LIKE_ENVS.includes(appEnv);
}

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

  // Chọn adapter (ARCHITECTURE mục 9). Chỉ nhận tên có trong src/server/adapters/providers.ts; gõ
  // sai thì ứng dụng không khởi động thay vì lỗi ở lần gọi đầu tiên.
  PAYMENT_PROVIDER: z.enum(providerNames("payment")),
  SMS_PROVIDER: z.enum(providerNames("sms")),
  CAPTCHA_PROVIDER: z.enum(providerNames("captcha")),
  STORAGE_PROVIDER: z.enum(providerNames("storage")),
  NOTIFIER_PROVIDER: z.enum(providerNames("notifier")),

  SMS_HOOK_SECRET: z.string().min(1).optional(),
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),

  HANDOVER_SECRET: z.string().min(1).optional(),
  VIEW_TOKEN_PEPPER: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),

  SENTRY_DSN: z.string().optional(),
  // Kênh cảnh báo cho chủ shop khi NOTIFIER_PROVIDER=telegram.
  OWNER_ALERT_TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  OWNER_ALERT_TELEGRAM_CHAT_ID: z.string().min(1).optional(),
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
  // Staging/production không được dùng notifier `noop` (adapter giả), nên kênh thật là bắt buộc.
  "OWNER_ALERT_TELEGRAM_BOT_TOKEN",
  "OWNER_ALERT_TELEGRAM_CHAT_ID",
];

const envSchema = rawEnvSchema.superRefine((value, ctx) => {
  if (!isProductionLike(value.APP_ENV)) {
    return;
  }

  // Lớp chặn thứ nhất với adapter giả; lớp thứ hai nằm trong hàm chọn adapter
  // (src/server/adapters/select.ts), lớp thứ ba trong chính factory của adapter giả.
  for (const port of ADAPTER_PORT_NAMES) {
    const key = ADAPTER_PORTS[port].envVar;
    const provider = value[key];
    if (providerKind(port, provider) === "fake") {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} không được là "${provider}" (adapter giả) khi APP_ENV=${value.APP_ENV}`,
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

// File .env sao chép từ .env.example thường để trống biến chưa dùng (`SEPAY_API_TOKEN=`). Coi chuỗi
// rỗng như chưa đặt: biến tùy chọn thành undefined, biến bắt buộc vẫn báo thiếu, và ở
// staging/production các biến trong REQUIRED_ONLY_IN_PRODUCTION_LIKE vẫn bị từ chối (kiểm tra
// bằng `!value[key]`). Nhờ vậy local không sập vì giá trị trống mà production không dễ dãi hơn.
function treatEmptyAsUnset(
  raw: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value || undefined]));
}

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(treatEmptyAsUnset(raw));
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
