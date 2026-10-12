import "server-only";
import { isIP } from "node:net";
import { newRequestId } from "@/server/lib/logger";

/**
 * Ngữ cảnh request ghi kèm mỗi dòng audit.
 *
 * CẢNH BÁO: `x-forwarded-for`, `x-real-ip` và `x-vercel-id` là header client gửi được. Chỉ tin
 * chúng khi ứng dụng chạy sau proxy của Vercel, nơi Vercel ghi đè các header này bằng giá trị
 * của chính nó. Chạy ở nơi khác (local, `next start` lộ thẳng ra mạng) thì IP có thể bị giả mạo.
 * Vì vậy IP trong audit chỉ để tham khảo khi điều tra, không dùng để phân quyền.
 */
export interface RequestContext {
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly requestId: string | null;
}

/** Chỉ cần `get`: nhận được cả `Headers` lẫn `ReadonlyHeaders` của `next/headers`. */
export type HeaderSource = Pick<Headers, "get">;

export const USER_AGENT_MAX_LENGTH = 255;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
// Dài nhất là IPv6 dạng ánh xạ IPv4 (45 ký tự); chặn sớm chuỗi quá dài trước khi gọi isIP.
const IP_MAX_LENGTH = 64;
// Ký tự điều khiển: Postgres không nhận NUL trong text, và chúng không có nghĩa trong user agent.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** IP hợp lệ theo `net.isIP` thì giữ, còn lại (kể cả kèm cổng, ngoặc vuông, zone id) là null. */
export function normalizeIp(value: string | null | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate || candidate.length > IP_MAX_LENGTH || candidate.includes("%")) {
    return null;
  }
  return isIP(candidate) === 0 ? null : candidate;
}

/** Bỏ ký tự điều khiển, cắt còn 255 ký tự (theo code point, không cắt đôi emoji). */
export function normalizeUserAgent(value: string | null | undefined): string | null {
  const cleaned = value?.replace(CONTROL_CHARS, "").trim();
  if (!cleaned) {
    return null;
  }
  const chars = Array.from(cleaned);
  return chars.length > USER_AGENT_MAX_LENGTH
    ? chars.slice(0, USER_AGENT_MAX_LENGTH).join("")
    : cleaned;
}

function normalizeRequestId(value: string | null | undefined): string | null {
  return value !== null && value !== undefined && REQUEST_ID_PATTERN.test(value) ? value : null;
}

/**
 * Đọc ngữ cảnh từ header của request hiện tại. IP lấy địa chỉ đầu tiên của `x-forwarded-for`,
 * không có thì `x-real-ip`. `requestId` lấy `x-vercel-id` nếu hợp lệ, không thì sinh mới; truyền
 * cùng giá trị vào `createLogger({ requestId })` để nối được log với dòng audit.
 */
export function getRequestContext(
  headers: HeaderSource,
  generateRequestId: () => string = newRequestId,
): RequestContext {
  const forwardedFor = headers.get("x-forwarded-for");
  const rawIp =
    forwardedFor !== null ? (forwardedFor.split(",")[0] ?? null) : headers.get("x-real-ip");
  return {
    ip: normalizeIp(rawIp),
    userAgent: normalizeUserAgent(headers.get("user-agent")),
    requestId: normalizeRequestId(headers.get("x-vercel-id")) ?? generateRequestId(),
  };
}

/**
 * Chuẩn hóa lại ngữ cảnh người gọi tự dựng (hoặc không có, với job hệ thống) trước khi ghi:
 * giá trị sai định dạng thành null thay vì làm câu INSERT lỗi.
 */
export function normalizeRequestContext(
  context: Partial<RequestContext> | null | undefined,
): RequestContext {
  return {
    ip: normalizeIp(context?.ip),
    userAgent: normalizeUserAgent(context?.userAgent),
    requestId: normalizeRequestId(context?.requestId),
  };
}
