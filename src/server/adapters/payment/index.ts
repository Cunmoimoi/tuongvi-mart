import "server-only";
import { createFakePayment } from "@/server/adapters/payment/fakes/fake";
import type { PaymentProviderPort } from "@/server/adapters/payment/port";
import { createSepayPayment } from "@/server/adapters/payment/sepay";
import {
  requireSetting,
  selectAdapter,
  type AdapterDeps,
  type AdapterRegistry,
} from "@/server/adapters/select";
import { env, type Env } from "@/server/env";

// Nơi DUY NHẤT chọn adapter thanh toán (ARCHITECTURE mục 9). Code nghiệp vụ gọi `getPayment()`;
// adapter giả trong `fakes/` chỉ được import ở đây và trong test (ESLint `local/no-fake-adapter-import`).

export type PaymentAdapterEnv = Pick<
  Env,
  "APP_ENV" | "PAYMENT_PROVIDER" | "SEPAY_WEBHOOK_SECRET" | "SEPAY_API_TOKEN"
>;

export const PAYMENT_ADAPTERS: AdapterRegistry<"payment", PaymentAdapterEnv, PaymentProviderPort> =
  {
    sepay: {
      status: "not-implemented",
      create: (config, deps) =>
        createSepayPayment({
          webhookSecret: requireSetting(
            config.SEPAY_WEBHOOK_SECRET,
            "SEPAY_WEBHOOK_SECRET",
            "payment/sepay",
          ),
          apiToken: requireSetting(config.SEPAY_API_TOKEN, "SEPAY_API_TOKEN", "payment/sepay"),
          fetch: deps.fetch ?? globalThis.fetch,
        }),
    },
    fake: {
      status: "implemented",
      create: (config, deps) =>
        createFakePayment({
          appEnv: config.APP_ENV,
          // Dùng chung biến với SePay: test ký webhook giả bằng secret test của môi trường.
          webhookSecret: requireSetting(
            config.SEPAY_WEBHOOK_SECRET,
            "SEPAY_WEBHOOK_SECRET",
            "payment/fake",
          ),
          clock: deps.clock,
        }),
    },
  };

export function selectPaymentAdapter(
  config: PaymentAdapterEnv,
  deps: AdapterDeps = {},
): PaymentProviderPort {
  return selectAdapter("payment", PAYMENT_ADAPTERS, config.PAYMENT_PROVIDER, config, deps);
}

let selected: PaymentProviderPort | undefined;

/** Adapter thanh toán của ứng dụng, chọn một lần theo `env` ở lần gọi đầu tiên. */
export function getPayment(): PaymentProviderPort {
  selected ??= selectPaymentAdapter(env);
  return selected;
}
