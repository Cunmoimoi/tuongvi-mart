import "server-only";
import { sanitizeForLog } from "@/server/lib/logger";

/** Giới hạn của mỗi trường `before`/`after`, đo bằng số byte UTF-8 của JSON. */
export const AUDIT_PAYLOAD_MAX_BYTES = 16 * 1024;

/** Dạng lưu thay cho payload quá lớn. */
export interface TruncatedPayload {
  readonly _truncated: true;
  readonly originalBytes: number;
  /** Phần đầu của JSON đã làm sạch, cắt sao cho cả đối tượng này không vượt giới hạn. */
  readonly preview: string;
}

// Postgres jsonb không nhận ký tự NUL và surrogate UTF-16 đứng lẻ (một nửa emoji). Nếu để lọt,
// câu INSERT audit lỗi và kéo theo thao tác nghiệp vụ, nên thay chúng bằng U+FFFD.
const UNSTORABLE_CHARS =
  /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function toStorableString(text: string): string {
  return text.replace(UNSTORABLE_CHARS, "\uFFFD");
}

// Chạy trên kết quả của sanitizeForLog: cây chỉ gồm object, mảng, chuỗi, số, boolean, null,
// không còn tham chiếu vòng và đã bị giới hạn độ sâu.
function toStorable(value: unknown): unknown {
  if (typeof value === "string") {
    return toStorableString(value);
  }
  if (Array.isArray(value)) {
    return value.map(toStorable);
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      // defineProperty để khóa `__proto__` trong dữ liệu chỉ là một khóa thường, không đổi prototype.
      Object.defineProperty(result, toStorableString(key), {
        value: toStorable(item),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return result;
  }
  return value;
}

function utf8Length(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

/** Phần đầu của `text` dài tối đa `maxBytes` byte UTF-8, không cắt đôi ký tự. */
function headUtf8(text: string, maxBytes: number): string {
  let bytes = 0;
  let end = 0;
  for (const char of text) {
    const size = utf8Length(char);
    if (bytes + size > maxBytes) {
      break;
    }
    bytes += size;
    end += char.length;
  }
  return text.slice(0, end);
}

function truncate(json: string): TruncatedPayload {
  const originalBytes = utf8Length(json);
  // Dấu `"` và `\` trong preview bị escape thêm khi lưu, nên co dần tới khi cả đối tượng vừa.
  let budget = AUDIT_PAYLOAD_MAX_BYTES - 128;
  for (;;) {
    const marker: TruncatedPayload = {
      _truncated: true,
      originalBytes,
      preview: headUtf8(json, budget),
    };
    const excess = utf8Length(JSON.stringify(marker)) - AUDIT_PAYLOAD_MAX_BYTES;
    if (excess <= 0 || budget === 0) {
      return marker;
    }
    budget = Math.max(0, budget - excess);
  }
}

/**
 * Chuẩn bị `before`/`after` để lưu: che dữ liệu nhạy cảm bằng chính hàm của logger
 * (`sanitizeForLog`: bỏ khóa nhạy cảm ở mọi tầng, che SĐT, xử lý Date, BigInt, tham chiếu vòng),
 * thay ký tự Postgres không lưu được, rồi cắt nếu vượt 16 KB. Không bao giờ ném lỗi vì kích thước.
 */
export function prepareAuditPayload(value: unknown): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  const sanitized = sanitizeForLog(value);
  if (sanitized === undefined) {
    return null;
  }
  const storable = toStorable(sanitized);
  const json = JSON.stringify(storable);
  return utf8Length(json) <= AUDIT_PAYLOAD_MAX_BYTES ? storable : truncate(json);
}
