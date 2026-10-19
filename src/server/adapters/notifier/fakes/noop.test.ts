import { describe, expect, it } from "vitest";
import { createNoopNotifier } from "@/server/adapters/notifier/fakes/noop";

describe("notifier/noop", () => {
  it.each(["local", "test"] as const)("APP_ENV=%s: nhận cảnh báo, không gửi đi đâu", async (appEnv) => {
    const original = { info: console.info, log: console.log, warn: console.warn, error: console.error };
    const printed: unknown[] = [];
    const capture = (...args: unknown[]) => void printed.push(args);
    Object.assign(console, { info: capture, log: capture, warn: capture, error: capture });
    try {
      const notifier = createNoopNotifier({ appEnv });
      expect(notifier.provider).toBe("noop");
      await expect(
        notifier.notifyOwner({ event: "test.event", title: "Thử", details: { phone: "0901234567" } }),
      ).resolves.toBeUndefined();
    } finally {
      Object.assign(console, original);
    }
    expect(printed).toStrictEqual([]);
  });

  it.each(["staging", "production"] as const)("từ chối APP_ENV=%s", (appEnv) => {
    expect(() => createNoopNotifier({ appEnv })).toThrow(/adapter giả/);
  });
});
