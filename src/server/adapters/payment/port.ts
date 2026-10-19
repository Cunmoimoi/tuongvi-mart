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

export type WebhookVerification =
  | { readonly ok: true }
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
  /** Body sai định dạng thì ném `AppError("VALIDATION_FAILED")`. Chỉ gọi sau `verifyWebhook`. */
  parseWebhook(rawBody: string): BankTransaction;
  listTransactions(query: TransactionQuery): Promise<readonly BankTransaction[]>;
}

export const MAX_TRANSACTIONS_PER_PAGE = 100;

/** Webhook lệch giờ server quá mức này thì bị từ chối (BUSINESS_RULES mục 5.3). */
export const WEBHOOK_MAX_SKEW_SECONDS = 300;
