import "server-only";
import type { CaptchaPort } from "@/server/adapters/captcha/port";
import { assertFakeAdapterAllowed } from "@/server/adapters/select";
import type { AppEnv } from "@/server/env";

// ADAPTER GIẢ, chỉ nạp được khi APP_ENV là local hoặc test: cho qua mọi token để thử form mà không
// cần widget Turnstile.

export interface AlwaysPassCaptchaOptions {
  readonly appEnv: AppEnv;
}

export function createAlwaysPassCaptcha(options: AlwaysPassCaptchaOptions): CaptchaPort {
  assertFakeAdapterAllowed(options.appEnv, "captcha/always-pass");
  return {
    provider: "always-pass",
    async verify() {
      return { ok: true };
    },
  };
}
