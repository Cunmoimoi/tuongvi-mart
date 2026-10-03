import "server-only";

/**
 * Bảng thông điệp tiếng Việt dành cho người dùng, theo mã lỗi. Đây là nơi duy nhất quyết
 * định câu chữ khách nhìn thấy: không đưa chi tiết nội bộ (tên bảng, câu SQL, đường dẫn,
 * thông điệp của thư viện) vào đây. Chi tiết kỹ thuật đi vào `cause` và chỉ được ghi log.
 *
 * Thêm mã lỗi mới: thêm một dòng ở đây và một dòng ở DEFAULT_HTTP_STATUS (TypeScript sẽ
 * báo lỗi nếu thiếu một trong hai).
 */
export const ERROR_MESSAGES = {
  VALIDATION_FAILED: "Dữ liệu không hợp lệ, vui lòng kiểm tra lại",
  UNAUTHENTICATED: "Vui lòng đăng nhập để tiếp tục",
  // Cố ý chung chung: không cho biết SĐT có tồn tại hay không (SECURITY mục 2).
  INVALID_CREDENTIALS: "SĐT hoặc mật khẩu không đúng",
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này",
  NOT_FOUND: "Không tìm thấy nội dung bạn yêu cầu",
  RATE_LIMITED: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút",

  // BUSINESS_RULES mục 4 (đặt hàng).
  PRICE_CHANGED: "Giá đã thay đổi, vui lòng kiểm tra lại đơn hàng",
  OUT_OF_STOCK: "Một số sản phẩm không đủ hàng, vui lòng điều chỉnh số lượng",
  ITEM_UNAVAILABLE: "Có sản phẩm đã ngừng bán, vui lòng xóa khỏi giỏ hàng",
  FLASH_SALE_INSUFFICIENT: "Suất flash sale không còn đủ, vui lòng giảm số lượng",
  OUT_OF_DELIVERY_RANGE: "Địa chỉ nằm ngoài phạm vi giao hàng, bạn có thể chọn nhận tại cửa hàng",

  INTERNAL: "Hệ thống đang gặp sự cố, vui lòng thử lại sau",
} as const satisfies Record<string, string>;

export type ErrorCode = keyof typeof ERROR_MESSAGES;

const DEFAULT_HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PRICE_CHANGED: 409,
  OUT_OF_STOCK: 409,
  ITEM_UNAVAILABLE: 409,
  FLASH_SALE_INSUFFICIENT: 409,
  OUT_OF_DELIVERY_RANGE: 422,
  INTERNAL: 500,
};

export interface PublicError {
  readonly code: ErrorCode;
  readonly message: string;
}

/**
 * Lỗi nghiệp vụ. `message` luôn lấy từ ERROR_MESSAGES theo `code`, không nhận chuỗi tự do,
 * để không có đường nào đưa chi tiết nội bộ ra cho người dùng.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;

  constructor(
    code: ErrorCode,
    httpStatus: number = DEFAULT_HTTP_STATUS[code],
    options?: { cause?: unknown },
  ) {
    super(ERROR_MESSAGES[code], options);
    if (!Number.isInteger(httpStatus) || httpStatus < 400 || httpStatus > 599) {
      throw new RangeError(`HTTP status không hợp lệ cho lỗi ${code}: ${httpStatus}`);
    }
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
  }

  /** Phần duy nhất được phép trả về cho client. Không có `cause`, không có stack. */
  toPublic(): PublicError {
    return { code: this.code, message: this.message };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Biên giữa lỗi bất kỳ và phản hồi cho client: AppError giữ nguyên, mọi thứ khác thành
 * INTERNAL 500 (nguyên nhân gốc nằm ở `cause` để ghi log, không bao giờ trả ra ngoài).
 */
export function toAppError(error: unknown): AppError {
  return isAppError(error) ? error : new AppError("INTERNAL", undefined, { cause: error });
}
