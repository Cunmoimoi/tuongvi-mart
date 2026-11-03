import { describe, expect, it } from "vitest";
import { createAlwaysPassCaptcha } from "@/server/adapters/captcha/fakes/always-pass";

describe("captcha/always-pass", () => {
  it.each(["local", "test"] as const)("APP_ENV=%s: cho qua mọi token", async (appEnv) => {
    const captcha = createAlwaysPassCaptcha({ appEnv });
    expect(captcha.provider).toBe("always-pass");
    for (const token of ["", "bat-ky", "x".repeat(2048)]) {
      expect(await captcha.verify({ token })).toStrictEqual({ ok: true });
    }
  });

  it.each(["staging", "production"] as const)("từ chối APP_ENV=%s", (appEnv) => {
    expect(() => createAlwaysPassCaptcha({ appEnv })).toThrow(/adapter giả/);
  });
});
