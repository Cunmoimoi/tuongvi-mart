import "server-only";
import type { PaymentProviderPort } from "@/server/adapters/payment/port";
import { assertConfigured } from "@/server/adapters/select";
import { NotImplementedError } from "@/server/lib/errors";

// Adapter SePay: chưa làm (làm ở giai đoạn 3 theo BUSINESS_RULES 5.3–5.6, đối chiếu tài liệu SePay
// chính thức). Cho tới lúc đó mọi phương thức ném NotImplementedError: webhook không bao giờ được
// coi là hợp lệ, không có giao dịch nào được trả về.

export interface SepayConfig {
  readonly webhookSecret: string;
  readonly apiToken: string;
  readonly fetch: typeof fetch;
}

const ID = "payment/sepay";

export function createSepayPayment(config: SepayConfig): PaymentProviderPort {
  assertConfigured(config, ID);
  return {
    provider: "sepay",
    async verifyWebhook() {
      throw new NotImplementedError(`${ID}.verifyWebhook`);
    },
    parseWebhook() {
      throw new NotImplementedError(`${ID}.parseWebhook`);
    },
    async listTransactions() {
      throw new NotImplementedError(`${ID}.listTransactions`);
    },
  };
}
