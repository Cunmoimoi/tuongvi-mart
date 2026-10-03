import "server-only";
import { randomBytes, randomInt } from "node:crypto";

// BUSINESS_RULES mục 5.1. Bảng chữ bỏ 0, 1, I, L, O, U để khỏi nhầm khi khách gõ tay nội dung
// chuyển khoản. Phải khớp cấu hình SePay: tiền tố `TVM`, hậu tố đúng 8 ký tự, loại "Số và chữ".
export const ORDER_CODE_PREFIX = "TVM";
export const ORDER_CODE_LENGTH = 8;
export const ORDER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Sinh mã đơn `TVM` + 8 ký tự. Dùng `crypto.randomInt(0, 30)` nên mỗi ký tự đồng đều, không
 * lệch do phép chia dư. Mã này chỉ để nhận diện đơn và đối chiếu chuyển khoản, biết mã KHÔNG
 * cho phép xem đơn hay nhận hàng (BUSINESS_RULES mục 5.1). Tính duy nhất do UNIQUE trong
 * database bảo đảm; nơi gọi tự thử lại nếu trùng.
 */
export function generateOrderCode(): string {
  let suffix = "";
  for (let i = 0; i < ORDER_CODE_LENGTH; i += 1) {
    suffix += ORDER_CODE_ALPHABET.charAt(randomInt(0, ORDER_CODE_ALPHABET.length));
  }
  return ORDER_CODE_PREFIX + suffix;
}

// Token yếu hơn 128 bit không dùng được cho view token hay nonce; chặn từ gốc để lỗi gõ nhầm
// (ví dụ randomToken(4)) bị phát hiện ngay thay vì âm thầm tạo token dễ đoán.
const MIN_TOKEN_BYTES = 16;
const MAX_TOKEN_BYTES = 128;

/**
 * Token ngẫu nhiên an toàn về mật mã (`crypto.randomBytes`), mã hóa base64url nên dùng được
 * thẳng trong URL. 32 byte = 256 bit, đúng mức SECURITY yêu cầu cho view token (mối đe dọa T6).
 */
export function randomToken(bytes: number): string {
  if (!Number.isInteger(bytes) || bytes < MIN_TOKEN_BYTES || bytes > MAX_TOKEN_BYTES) {
    throw new RangeError(
      `randomToken cần số byte nguyên trong khoảng ${MIN_TOKEN_BYTES}-${MAX_TOKEN_BYTES}, nhận được ${bytes}`,
    );
  }
  return randomBytes(bytes).toString("base64url");
}
