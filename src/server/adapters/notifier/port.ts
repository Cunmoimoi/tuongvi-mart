import "server-only";
import { sanitizeForLog } from "@/server/lib/logger";

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

const MASKED = "***";
const HIDDEN = "[ĐÃ ẨN]";

/**
 * Che địa chỉ: bỏ số nhà, tên đường; chỉ giữ tối đa hai phần cuối (phường/xã, tỉnh/thành theo đơn
 * vị hành chính hai cấp) và luôn bỏ ít nhất phần đầu.
 */
export function maskAddress(address: string): string {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const kept = parts.slice(1).slice(-2);
  return [MASKED, ...kept].join(", ");
}

// Khóa chuẩn hóa (chữ thường, chỉ chữ và số) chứa một trong các phần này là địa chỉ. Khớp theo
// chuỗi con nên thà che nhầm còn hơn lọt (giống cách logger nhận khóa nhạy cảm).
const ADDRESS_KEY_PARTS = ["address", "diachi", "street"];

function isAddressKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ADDRESS_KEY_PARTS.some((part) => normalized.includes(part));
}

function maskAddresses(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(maskAddresses);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const result: Record<string, unknown> = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    if (isAddressKey(key)) {
      result[key] = typeof child === "string" ? maskAddress(child) : HIDDEN;
    } else {
      result[key] = maskAddresses(child);
    }
  }
  return result;
}

function formatValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/**
 * Nội dung tin gửi cho chủ shop. Làm sạch bằng đúng hàm của logger (`sanitizeForLog`: bỏ khóa nhạy
 * cảm, che SĐT theo khóa và trong chữ tự do), rồi che địa chỉ theo khóa. Không sửa object gốc.
 */
export function formatOwnerAlert(alert: OwnerAlert): string {
  const event = formatValue(sanitizeForLog(alert.event));
  const title = formatValue(sanitizeForLog(alert.title));
  const lines = [`[${event}] ${title}`];
  if (alert.details) {
    const details = maskAddresses(sanitizeForLog(alert.details));
    if (details !== null && typeof details === "object") {
      for (const [key, value] of Object.entries(details)) {
        lines.push(`${key}: ${formatValue(value)}`);
      }
    }
  }
  return lines.join("\n");
}
