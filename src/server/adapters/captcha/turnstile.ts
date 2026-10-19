import "server-only";
import type { CaptchaPort } from "@/server/adapters/captcha/port";
import { assertConfigured } from "@/server/adapters/select";
import { NotImplementedError } from "@/server/lib/errors";

// Adapter Cloudflare Turnstile: chưa làm (làm cùng các form cần captcha ở giai đoạn 1, đối chiếu
// tài liệu Turnstile chính thức). Cho tới lúc đó `verify` ném NotImplementedError; nơi gọi coi lỗi
// là "không qua", nên không có request nào lọt qua nhờ adapter chưa xong.

export interface TurnstileConfig {
  readonly secretKey: string;
  readonly fetch: typeof fetch;
}

const ID = "captcha/turnstile";

export function createTurnstileCaptcha(config: TurnstileConfig): CaptchaPort {
  assertConfigured(config, ID);
  return {
    provider: "turnstile",
    async verify() {
      throw new NotImplementedError(`${ID}.verify`);
    },
  };
}
