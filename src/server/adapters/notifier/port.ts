import "server-only";

/**
 * Port gửi cảnh báo cho chủ shop (ARCHITECTURE mục 9; ví dụ giao dịch ngoại lệ ở BUSINESS_RULES
 * mục 5.4). Tin nhắn rời khỏi hệ thống nên mọi adapter gửi đi phải dựng nội dung bằng
 * `formatOwnerAlert`: SĐT bị che như logger (`090****567`), địa chỉ chỉ còn phường/xã và tỉnh,
 * khóa nhạy cảm (mật khẩu, token, OTP, PIN...) bị bỏ hẳn.
 *
 * `title` là câu mô tả ngắn do code viết, không chứa dữ liệu của khách; dữ liệu đi trong `details`.
 */

export interface OwnerAlert {
  /** Mã sự kiện, ví dụ `payment.exception`. */
  readonly event: string;
  readonly title: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface NotifierPort {
  readonly provider: string;
  notifyOwner(alert: OwnerAlert): Promise<void>;
}
