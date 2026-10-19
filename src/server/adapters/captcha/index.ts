import "server-only";
import { createAlwaysPassCaptcha } from "@/server/adapters/captcha/fakes/always-pass";
import type { CaptchaPort } from "@/server/adapters/captcha/port";
import { createTurnstileCaptcha } from "@/server/adapters/captcha/turnstile";
import {
  requireSetting,
  selectAdapter,
  type AdapterDeps,
  type AdapterRegistry,
} from "@/server/adapters/select";
import { env, type Env } from "@/server/env";

// Nơi DUY NHẤT chọn adapter captcha (ARCHITECTURE mục 9). Code nghiệp vụ gọi `getCaptcha()`; adapter
// giả trong `fakes/` chỉ được import ở đây và trong test (ESLint `local/no-fake-adapter-import`).

export type CaptchaAdapterEnv = Pick<Env, "APP_ENV" | "CAPTCHA_PROVIDER" | "TURNSTILE_SECRET_KEY">;

export const CAPTCHA_ADAPTERS: AdapterRegistry<"captcha", CaptchaAdapterEnv, CaptchaPort> = {
  turnstile: {
    status: "not-implemented",
    create: (config, deps) =>
      createTurnstileCaptcha({
        secretKey: requireSetting(
          config.TURNSTILE_SECRET_KEY,
          "TURNSTILE_SECRET_KEY",
          "captcha/turnstile",
        ),
        fetch: deps.fetch ?? globalThis.fetch,
      }),
  },
  "always-pass": {
    status: "implemented",
    create: (config) => createAlwaysPassCaptcha({ appEnv: config.APP_ENV }),
  },
};

export function selectCaptchaAdapter(
  config: CaptchaAdapterEnv,
  deps: AdapterDeps = {},
): CaptchaPort {
  return selectAdapter("captcha", CAPTCHA_ADAPTERS, config.CAPTCHA_PROVIDER, config, deps);
}

let selected: CaptchaPort | undefined;

/** Adapter captcha của ứng dụng, chọn một lần theo `env` ở lần gọi đầu tiên. */
export function getCaptcha(): CaptchaPort {
  selected ??= selectCaptchaAdapter(env);
  return selected;
}
