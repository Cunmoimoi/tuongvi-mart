import "server-only";
import { sanitizeForLog } from "@/server/lib/logger";

/**
 * Port gửi cảnh báo cho chủ shop (ARCHITECTURE mục 9; ví dụ giao dịch ngoại lệ ở BUSINESS_RULES
 * mục 5.4). Tin nhắn rời khỏi hệ thống nên mọi adapter gửi đi phải dựng nội dung bằng
 * `formatOwnerAlert`: SĐT bị che như logger (`090****567`), địa chỉ chỉ còn phường/xã và tỉnh,
 * tọa độ bị ẩn hẳn, khóa nhạy cảm (mật khẩu, token, OTP, PIN...) bị bỏ hẳn, ký tự điều khiển bị
 * thay bằng dấu cách và tin dài quá `MAX_OWNER_ALERT_LENGTH` bị cắt bớt. Adapter gửi nguyên văn
 * dạng chữ thường (Telegram: không đặt `parse_mode`), không diễn giải HTML hay Markdown.
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

/** Telegram nhận tối đa 4096 ký tự mỗi tin; chừa chỗ cho phần adapter thêm vào (nếu có). */
export const MAX_OWNER_ALERT_LENGTH = 4000;
const TRUNCATED_NOTE = "\n… (đã cắt bớt)";

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

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isAddressKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return ADDRESS_KEY_PARTS.some((part) => normalized.includes(part));
}

// Tọa độ chính xác hơn cả địa chỉ nên bị ẩn hẳn (giá trị dạng "lat, lng" mà che như địa chỉ thì vẫn
// lộ kinh độ). Khóa được so theo TỪ (tách camelCase, snake_case, kebab-case), không theo chuỗi con,
// để `stockAllocation`, `coordinatorName`, `salon` không bị ẩn nhầm. Ghép hai từ liền nhau để nhận
// khóa tiếng Việt (`toaDo`, `vi_tri`).
// - Từ chắc chắn là tọa độ: luôn ẩn.
// - Từ mơ hồ (`location`, `viTri` có thể là tên kho, vị trí kệ): chỉ ẩn khi giá trị trông giống tọa độ.
const COORDINATE_WORDS = new Set([
  "lat",
  "lng",
  "lon",
  "latitude",
  "longitude",
  "latlng",
  "lnglat",
  "coord",
  "coords",
  "coordinate",
  "coordinates",
  "geo",
  "geolocation",
  "geopoint",
  "gps",
  "toado",
]);
const AMBIGUOUS_LOCATION_WORDS = new Set(["location", "vitri"]);

function keyWords(key: string): string[] {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
  const pairs = words.slice(1).map((word, index) => `${words[index]}${word}`);
  return [...words, ...pairs];
}

type LocationKeyKind = "coordinate" | "ambiguous" | null;

function locationKeyKind(key: string): LocationKeyKind {
  const words = keyWords(key);
  if (words.some((word) => COORDINATE_WORDS.has(word))) {
    return "coordinate";
  }
  return words.some((word) => AMBIGUOUS_LOCATION_WORDS.has(word)) ? "ambiguous" : null;
}

// Số thập phân có từ 4 chữ số sau dấu chấm (chính xác tới khoảng 10 m): dạng thường gặp của tọa độ.
const COORDINATE_IN_TEXT = /\d\.\d{4,}/;

/** Giá trị (kể cả mảng, object lồng) có số thực hay chuỗi trông giống tọa độ. */
function looksLikeCoordinates(value: unknown): boolean {
  if (typeof value === "number") {
    return !Number.isInteger(value);
  }
  if (typeof value === "string") {
    return COORDINATE_IN_TEXT.test(value);
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(looksLikeCoordinates);
  }
  return false;
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
    const locationKind = locationKeyKind(key);
    if (
      locationKind === "coordinate" ||
      (locationKind === "ambiguous" && looksLikeCoordinates(child))
    ) {
      result[key] = HIDDEN;
    } else if (isAddressKey(key)) {
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

// Ký tự điều khiển (xuống dòng, về đầu dòng, ESC...), ký tự định dạng vô hình (đổi chiều chữ bidi,
// zero-width) và phân cách dòng/đoạn Unicode. Dữ liệu như nội dung chuyển khoản do người chuyển tự
// gõ, nên các ký tự này có thể tạo dòng mới hay đảo thứ tự hiển thị để giả một cảnh báo khác trong
// cùng tin. Thay bằng dấu cách; dấu tiếng Việt dạng tổ hợp (nhóm Mn) không bị ảnh hưởng.
const UNSAFE_CHARS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

function singleLine(text: string): string {
  return text.replace(UNSAFE_CHARS, " ");
}

/**
 * Ép một dòng rồi mới che SĐT (lại) bằng `sanitizeForLog`: ký tự vô hình chèn giữa các số
 * (`0901<ZWSP>234567`) làm bước che bỏ qua, và chỉ thành dấu cách sau `singleLine`.
 */
function clean(text: string): string {
  return String(sanitizeForLog(singleLine(text)));
}

// Làm sạch từng chuỗi và từng khóa trong cây đã qua `sanitizeForLog` (không vòng, có giới hạn độ
// sâu) TRƯỚC khi `JSON.stringify`: sau đó NUL, ESC... đã thành chữ `\u0000` mà `singleLine` không
// còn nhận ra.
function cleanDeep(value: unknown): unknown {
  if (typeof value === "string") {
    return clean(value);
  }
  if (Array.isArray(value)) {
    return value.map(cleanDeep);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  const result: Record<string, unknown> = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    result[singleLine(key)] = cleanDeep(child);
  }
  return result;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function truncate(text: string): string {
  if (text.length <= MAX_OWNER_ALERT_LENGTH) {
    return text;
  }
  let kept = text.slice(0, MAX_OWNER_ALERT_LENGTH - TRUNCATED_NOTE.length);
  // Không để lại nửa đầu của một cặp surrogate (emoji) ở chỗ cắt.
  if (isHighSurrogate(kept.charCodeAt(kept.length - 1))) {
    kept = kept.slice(0, -1);
  }
  return kept + TRUNCATED_NOTE;
}

/**
 * Nội dung tin gửi cho chủ shop. Làm sạch bằng đúng hàm của logger (`sanitizeForLog`: bỏ khóa nhạy
 * cảm, che SĐT theo khóa và trong chữ tự do), rồi che địa chỉ và ẩn tọa độ theo khóa. Mỗi phần (mã
 * sự kiện, tiêu đề, từng khóa và giá trị) bị ép về một dòng; chỉ hàm này xuống dòng giữa các phần.
 * Không sửa object gốc.
 */
export function formatOwnerAlert(alert: OwnerAlert): string {
  const event = clean(formatValue(sanitizeForLog(alert.event)));
  const title = clean(formatValue(sanitizeForLog(alert.title)));
  const lines = [`[${event}] ${title}`];
  if (alert.details) {
    const details = cleanDeep(maskAddresses(sanitizeForLog(alert.details)));
    if (details !== null && typeof details === "object") {
      for (const [key, value] of Object.entries(details)) {
        // Khóa và chuỗi đã sạch; `clean` lần nữa cho dòng ghép xong (JSON của object lồng).
        lines.push(`${key}: ${clean(formatValue(value))}`);
      }
    }
  }
  return truncate(lines.join("\n"));
}
