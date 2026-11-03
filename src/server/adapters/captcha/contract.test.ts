import { describe, expect, it } from "vitest";
import { selectCaptchaAdapter } from "@/server/adapters/captcha";
import { providerKind, providerNames } from "@/server/adapters/providers";
import { FAKE_ADAPTER_APP_ENVS } from "@/server/adapters/select";
import type { AppEnv } from "@/server/env";
import { NotImplementedError } from "@/server/lib/errors";
import {
  adapterEnv,
  createNetworkGuard,
  createWriteSink,
  errorTexts,
  findLeaks,
  settle,
  TEST_SECRETS,
} from "../../../../tests/helpers/adapters";

// Hợp đồng chung cho MỌI adapter captcha. Nơi gọi coi lỗi ném ra là "không qua".

const ALL_APP_ENVS: readonly AppEnv[] = ["local", "test", "staging", "production"];

const CASES = providerNames("captcha").flatMap((provider) =>
  (providerKind("captcha", provider) === "fake" ? FAKE_ADAPTER_APP_ENVS : ALL_APP_ENVS).map(
    (appEnv) => ({ provider, appEnv, kind: providerKind("captcha", provider) }),
  ),
);

function build(provider: string, appEnv: AppEnv) {
  const network = createNetworkGuard();
  const adapter = selectCaptchaAdapter(
    adapterEnv({ APP_ENV: appEnv, CAPTCHA_PROVIDER: provider as "turnstile" | "always-pass" }),
    { fetch: network.fetch, write: createWriteSink().write },
  );
  return { adapter, network };
}

describe.each(CASES)(
  "hợp đồng captcha/$provider (APP_ENV=$appEnv)",
  ({ provider, appEnv, kind }) => {
    it("trả kết quả đúng dạng, hoặc NotImplementedError", async () => {
      const { adapter } = build(provider, appEnv);
      const outcome = await settle(() => adapter.verify({ token: "token-tu-trinh-duyet" }));
      if (outcome.ok) {
        expect(typeof outcome.value.ok).toBe("boolean");
      } else {
        expect(outcome.error).toBeInstanceOf(NotImplementedError);
      }
    });

    // Adapter giả `always-pass` cố ý cho qua mọi thứ (chỉ có ở local/test), nên chỉ kiểm adapter thật.
    if (kind === "real") {
      it("adapter thật không bao giờ cho qua khi token rỗng", async () => {
        const { adapter } = build(provider, appEnv);
        const outcome = await settle(() => adapter.verify({ token: "" }));
        if (outcome.ok) {
          expect(outcome.value.ok).toBe(false);
        } else {
          expect(outcome.error).toBeInstanceOf(NotImplementedError);
        }
      });
    }

    it("lỗi ném ra không lộ secret, và không gọi mạng", async () => {
      const { adapter, network } = build(provider, appEnv);
      const outcome = await settle(() =>
        adapter.verify({ token: "token-tu-trinh-duyet", remoteIp: "203.0.113.7" }),
      );
      const texts = outcome.ok ? [] : errorTexts(outcome.error);
      expect(findLeaks(texts, Object.values(TEST_SECRETS))).toStrictEqual([]);
      expect(network.calls).toStrictEqual([]);
    });
  },
);
