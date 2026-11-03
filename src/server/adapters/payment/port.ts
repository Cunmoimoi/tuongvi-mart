import "server-only";

/**
 * Port cổng thanh toán (ARCHITECTURE mục 9, BUSINESS_RULES mục 5.3–5.6). Chỉ webhook có chữ ký
 * hợp lệ hoặc job đối soát qua `listTransactions` được đưa đơn sang PAID (CLAUDE.md bất biến 3).
 */

export interface WebhookRequest {
  readonly headers: Headers;
  /** Body nguyên văn (`await req.text()`): chữ ký tính trên đúng chuỗi này. */
  readonly rawBody: string;
}

declare const verifiedWebhookBrand: unique symbol;

/**
 * Webhook đã qua `verifyWebhook` của CHÍNH adapter đó: chỉ object này mới đưa được vào
 * `parseWebhook`, nên không có đường nào đọc giao dịch từ body chưa xác thực (CLAUDE.md bất biến 3).
 * Kiểu có nhãn chặn lúc biên dịch; sổ `createVerifiedWebhookRegistry` chặn lúc chạy (ép kiểu
 * `as VerifiedWebhook` hay dùng object của adapter khác đều bị từ chối).
 *
 * Object rỗng, không mang body: route webhook có lỡ ghi log hay audit kết quả xác thực thì cũng không
 * kéo theo nguyên body (CLAUDE.md bất biến 14). Body nằm trong sổ, chỉ `parseWebhook` đọc được.
 */
export interface VerifiedWebhook {
  readonly [verifiedWebhookBrand]: true;
}

export type WebhookVerification =
  | { readonly ok: true; readonly webhook: VerifiedWebhook }
  | {
      readonly ok: false;
      readonly reason: "missing-signature" | "bad-signature" | "stale-timestamp";
    };

/** Giao dịch ngân hàng đã chuẩn hóa, không phụ thuộc nhà cung cấp. */
export interface BankTransaction {
  /** Mã giao dịch phía nhà cung cấp (SePay `id`), dùng để chống trùng. */
  readonly providerTransactionId: string;
  readonly gateway: string;
  readonly occurredAt: Date;
  readonly accountNumber: string;
  readonly direction: "in" | "out";
  /** Số nguyên VND, lớn hơn 0 (CLAUDE.md bất biến 4). */
  readonly amountVnd: number;
  readonly content: string;
  /** Mã thanh toán nhà cung cấp tự nhận ra trong nội dung (SePay `code`), nếu có. */
  readonly paymentCode: string | null;
  readonly referenceCode: string | null;
}

export interface TransactionQuery {
  /** Chỉ lấy giao dịch sau mã này (SePay API v2 `since_id`). */
  readonly sinceId?: string;
  /** Tối đa 100 (BUSINESS_RULES mục 5.6). */
  readonly limit: number;
}

export interface PaymentProviderPort {
  readonly provider: string;
  /** Không bao giờ ném lỗi vì chữ ký sai: trả `ok: false` để route trả 401. */
  verifyWebhook(request: WebhookRequest): Promise<WebhookVerification>;
  /**
   * Chỉ nhận `webhook` do `verifyWebhook` của chính adapter này trả về; object khác thì ném
   * TypeError. Body sai định dạng thì ném `AppError("VALIDATION_FAILED")`.
   */
  parseWebhook(webhook: VerifiedWebhook): BankTransaction;
  listTransactions(query: TransactionQuery): Promise<readonly BankTransaction[]>;
}

export interface VerifiedWebhookRegistry {
  /** Gọi trong `verifyWebhook`, CHỈ sau khi chữ ký và thời gian đều hợp lệ. */
  issue(rawBody: string): VerifiedWebhook;
  /** Gọi đầu `parseWebhook`: trả body nếu object do chính sổ này cấp, ngược lại ném TypeError. */
  rawBodyOf(webhook: VerifiedWebhook): string;
}

/**
 * Sổ webhook đã xác thực, mỗi adapter tạo một sổ riêng trong factory. Object cấp ra là object rỗng
 * bị đóng băng; body đã xác thực nằm trong `WeakMap` của sổ (không sửa được sau khi xác thực) và chỉ
 * sổ đã cấp mới nhận ra object đó.
 */
export function createVerifiedWebhookRegistry(): VerifiedWebhookRegistry {
  const bodies = new WeakMap<object, string>();
  return {
    issue(rawBody) {
      const webhook = Object.freeze({}) as VerifiedWebhook;
      bodies.set(webhook, rawBody);
      return webhook;
    },
    rawBodyOf(webhook) {
      // WeakMap.get trả undefined (không ném) với giá trị không phải object.
      const rawBody = bodies.get(webhook);
      if (rawBody === undefined) {
        throw new TypeError(
          "parseWebhook chỉ nhận webhook do verifyWebhook của chính adapter này trả về",
        );
      }
      return rawBody;
    },
  };
}

export const MAX_TRANSACTIONS_PER_PAGE = 100;

/** Webhook lệch giờ server quá mức này thì bị từ chối (BUSINESS_RULES mục 5.3). */
export const WEBHOOK_MAX_SKEW_SECONDS = 300;
