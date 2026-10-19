import "server-only";
import { createHmac } from "node:crypto";
import { z } from "zod";
import {
  MAX_TRANSACTIONS_PER_PAGE,
  WEBHOOK_MAX_SKEW_SECONDS,
  type BankTransaction,
  type PaymentProviderPort,
  type TransactionQuery,
  type WebhookRequest,
  type WebhookVerification,
} from "@/server/adapters/payment/port";
import { assertFakeAdapterAllowed } from "@/server/adapters/select";
import type { AppEnv } from "@/server/env";
import { systemClock, type Clock } from "@/server/lib/clock";
import { AppError } from "@/server/lib/errors";
import { safeEqual } from "@/server/lib/safe-equal";

// ADAPTER GIẢ, chỉ nạp được khi APP_ENV là local hoặc test (CLAUDE.md bất biến 3 và 7). Không có
// đường nào "cho qua" webhook: chữ ký vẫn là HMAC-SHA256 thật trên `timestamp + "." + rawBody` như
// BUSINESS_RULES 5.3, chỉ khác tên header (`x-fake-timestamp`, `x-fake-signature`) để không ai nhầm
// với webhook SePay. Test tự ký webhook bằng secret test để giả lập tiền về.

const ID = "payment/fake";
const SIGNATURE_PREFIX = "sha256=";

export interface FakePaymentOptions {
  readonly appEnv: AppEnv;
  readonly webhookSecret: string;
  readonly clock?: Clock;
  /** Giao dịch `listTransactions` trả về (thay cho API đối soát). */
  readonly transactions?: readonly BankTransaction[];
}

// Cùng tên trường với webhook SePay (BUSINESS_RULES 5.3 bước 4) để test sau này dùng lại được.
const webhookSchema = z.object({
  id: z.string().min(1),
  gateway: z.string().min(1),
  transactionDate: z.iso.datetime({ offset: true }),
  accountNumber: z.string().min(1),
  code: z.string().min(1).nullable(),
  content: z.string(),
  transferType: z.enum(["in", "out"]),
  transferAmount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  referenceCode: z.string().min(1).nullable(),
});

function expectedSignature(secret: string, timestamp: string, rawBody: string): string {
  return (
    SIGNATURE_PREFIX + createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")
  );
}

export function createFakePayment(options: FakePaymentOptions): PaymentProviderPort {
  assertFakeAdapterAllowed(options.appEnv, ID);
  if (!options.webhookSecret) {
    throw new RangeError(`${ID} cần webhookSecret khác rỗng`);
  }
  const { webhookSecret } = options;
  const clock = options.clock ?? systemClock;
  const transactions = [...(options.transactions ?? [])];

  return {
    provider: "fake",

    async verifyWebhook({ headers, rawBody }: WebhookRequest): Promise<WebhookVerification> {
      const timestamp = headers.get("x-fake-timestamp");
      const signature = headers.get("x-fake-signature");
      if (!timestamp || !signature) {
        return { ok: false, reason: "missing-signature" };
      }
      // So chữ ký trước, rồi mới xét thời gian: timestamp chỉ đáng tin khi đã được ký.
      if (!safeEqual(signature, expectedSignature(webhookSecret, timestamp, rawBody))) {
        return { ok: false, reason: "bad-signature" };
      }
      const nowSeconds = Math.floor(clock.now().getTime() / 1000);
      if (
        !/^\d{1,12}$/.test(timestamp) ||
        Math.abs(nowSeconds - Number(timestamp)) > WEBHOOK_MAX_SKEW_SECONDS
      ) {
        return { ok: false, reason: "stale-timestamp" };
      }
      return { ok: true };
    },

    parseWebhook(rawBody: string): BankTransaction {
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        throw new AppError("VALIDATION_FAILED");
      }
      const parsed = webhookSchema.safeParse(json);
      if (!parsed.success) {
        // Không gắn `cause`: lỗi Zod chứa lại giá trị của body.
        throw new AppError("VALIDATION_FAILED");
      }
      const body = parsed.data;
      return {
        providerTransactionId: body.id,
        gateway: body.gateway,
        occurredAt: new Date(body.transactionDate),
        accountNumber: body.accountNumber,
        direction: body.transferType,
        amountVnd: body.transferAmount,
        content: body.content,
        paymentCode: body.code,
        referenceCode: body.referenceCode,
      };
    },

    async listTransactions({ sinceId, limit }: TransactionQuery) {
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_TRANSACTIONS_PER_PAGE) {
        throw new RangeError(`limit phải là số nguyên 1–${MAX_TRANSACTIONS_PER_PAGE}`);
      }
      let start = 0;
      if (sinceId !== undefined) {
        const index = transactions.findIndex((tx) => tx.providerTransactionId === sinceId);
        if (index === -1) {
          throw new RangeError(`${ID}: sinceId không có trong danh sách giao dịch`);
        }
        start = index + 1;
      }
      return transactions.slice(start, start + limit);
    },
  };
}
