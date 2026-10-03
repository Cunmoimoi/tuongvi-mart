import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

export type SafeEqualInput = string | Uint8Array | null | undefined;

function sha256(value: string | Uint8Array): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * So sánh chữ ký, token, PIN, secret (CLAUDE.md bất biến 17). Luôn dùng hàm này thay cho `===`.
 *
 * `crypto.timingSafeEqual` ném lỗi khi hai buffer khác độ dài. Né bằng cách băm cả hai bằng
 * SHA-256 trước: hai digest luôn dài 32 byte, nên không ném lỗi, không cần so độ dài trước
 * (so độ dài trước sẽ lộ độ dài của bí mật), và hai digest bằng nhau khi và chỉ khi hai đầu
 * vào bằng nhau.
 *
 * Đóng cửa khi lỗi: `null`/`undefined` (ví dụ thiếu header) luôn cho `false`, kể cả khi cả
 * hai vế đều thiếu. Người gọi tự chịu trách nhiệm không truyền secret rỗng.
 */
export function safeEqual(a: SafeEqualInput, b: SafeEqualInput): boolean {
  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }
  return timingSafeEqual(sha256(a), sha256(b));
}
