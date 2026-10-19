import { inspect } from "node:util";
import type { Env } from "@/server/env";

// Công cụ dùng chung cho test adapter (src/server/adapters/**). Giá trị bên dưới là giá trị thử,
// không phải secret thật; mỗi giá trị có chuỗi riêng dễ nhận ra để dò xem có bị lộ ra ngoài không.

export const TEST_SECRETS = {
  SEPAY_WEBHOOK_SECRET: "whsec-LEAKCHECK-sepay-webhook-0001",
  SEPAY_API_TOKEN: "apitok-LEAKCHECK-sepay-api-0002",
  SUPABASE_SECRET_KEY: "sb_secret_LEAKCHECK-supabase-0003",
  TURNSTILE_SECRET_KEY: "0x4AAAAAAA-LEAKCHECK-turnstile-0004",
  OWNER_ALERT_TELEGRAM_BOT_TOKEN: "123456789:LEAKCHECK-telegram-bot-0005",
} as const;

// URL gọi API Telegram chứa nguyên bot token: không bao giờ được xuất hiện trong lỗi hay log.
export const TELEGRAM_URL_WITH_TOKEN = `https://api.telegram.org/bot${TEST_SECRETS.OWNER_ALERT_TELEGRAM_BOT_TOKEN}/sendMessage`;

export type AdapterEnv = Pick<
  Env,
  | "APP_ENV"
  | "PAYMENT_PROVIDER"
  | "SMS_PROVIDER"
  | "STORAGE_PROVIDER"
  | "CAPTCHA_PROVIDER"
  | "NOTIFIER_PROVIDER"
  | "SEPAY_WEBHOOK_SECRET"
  | "SEPAY_API_TOKEN"
  | "SUPABASE_URL"
  | "SUPABASE_SECRET_KEY"
  | "TURNSTILE_SECRET_KEY"
  | "OWNER_ALERT_TELEGRAM_BOT_TOKEN"
  | "OWNER_ALERT_TELEGRAM_CHAT_ID"
>;

/** Cấu hình đủ mọi secret: nhà cung cấp mặc định là adapter thật. */
export function adapterEnv(overrides: Partial<AdapterEnv> = {}): AdapterEnv {
  return {
    APP_ENV: "test",
    PAYMENT_PROVIDER: "sepay",
    SMS_PROVIDER: "esms",
    STORAGE_PROVIDER: "supabase",
    CAPTCHA_PROVIDER: "turnstile",
    NOTIFIER_PROVIDER: "telegram",
    SUPABASE_URL: "https://abcdefgh.supabase.co",
    OWNER_ALERT_TELEGRAM_CHAT_ID: "-1001234567890",
    ...TEST_SECRETS,
    ...overrides,
  };
}

/** `fetch` giả: ghi lại mọi lần gọi và luôn từ chối. Task này không được gọi mạng ra ngoài. */
export function createNetworkGuard() {
  const calls: string[] = [];
  const guardedFetch: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    calls.push(
      `${init?.method ?? "GET"} ${url} ${typeof init?.body === "string" ? init.body : ""}`,
    );
    throw new Error("Test không cho phép gọi mạng");
  };
  return { fetch: guardedFetch, calls };
}

/** Nơi ghi thay cho console của adapter giả, để test đọc lại được. */
export function createWriteSink() {
  const lines: string[] = [];
  return { write: (line: string) => void lines.push(line), lines };
}

export type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

/** Chạy một lời gọi, gom cả lỗi ném đồng bộ lẫn Promise bị từ chối. */
export async function settle<T>(call: () => T | Promise<T>): Promise<Outcome<Awaited<T>>> {
  try {
    return { ok: true, value: await call() };
  } catch (error) {
    return { ok: false, error };
  }
}

/** Mọi dạng chữ của một lỗi mà người khác có thể nhìn thấy: message, stack, JSON, inspect, cause. */
export function errorTexts(error: unknown, depth = 0): string[] {
  if (depth > 5) {
    return [];
  }
  const texts = [String(error), inspect(error, { depth: 6, showHidden: true })];
  try {
    texts.push(JSON.stringify(error) ?? "");
  } catch {
    // Lỗi có tham chiếu vòng: inspect ở trên đã đủ.
  }
  if (error instanceof Error) {
    texts.push(error.message, error.stack ?? "");
    if (error.cause !== undefined) {
      texts.push(...errorTexts(error.cause, depth + 1));
    }
  }
  return texts;
}

/** Các chuỗi cần giấu xuất hiện trong `texts`. Rỗng nghĩa là không lộ gì. */
export function findLeaks(texts: readonly string[], needles: readonly string[]): string[] {
  return needles.filter((needle) => texts.some((text) => text.includes(needle)));
}

/** Mọi thứ đã rời khỏi adapter: dòng đã in, request mạng, và lỗi ném ra (nếu có). */
export function outgoingTexts(
  outcome: Outcome<unknown>,
  sink: { lines: readonly string[] },
  network: { calls: readonly string[] },
): string[] {
  return [...sink.lines, ...network.calls, ...(outcome.ok ? [] : errorTexts(outcome.error))];
}
