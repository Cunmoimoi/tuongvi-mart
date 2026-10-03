import "server-only";
import { randomUUID } from "node:crypto";
import { systemClock, type Clock } from "@/server/lib/clock";
import { AppError } from "@/server/lib/errors";

/**
 * Logger JSON một dòng cho mỗi sự kiện, có `requestId`, tự che SĐT và bỏ các trường nhạy cảm
 * (CLAUDE.md bất biến 14, ARCHITECTURE mục 12). Việc làm sạch nằm ngay trong logger nên người
 * gọi không phải nhớ che từng chỗ; vẫn không được cố ý log body webhook hay dữ liệu thô.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** Logger mới kế thừa requestId và trường ngữ cảnh; `fields.requestId` (nếu có) thay requestId. */
  child(fields: LogFields): Logger;
}

export interface LoggerOptions {
  requestId?: string;
  /** Mức tối thiểu được ghi, mặc định "info". */
  level?: LogLevel;
  clock?: Clock;
  /** Nơi ghi một dòng JSON; mặc định là console (Vercel gom log theo mức từ console.*). */
  write?: (level: LogLevel, line: string) => void;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// Trường do logger đặt; trường cùng tên của người gọi bị đổi thành `field_<tên>` để không ai
// (kể cả vô tình) làm hỏng dấu thời gian hay việc truy vết theo requestId.
const RESERVED_KEYS = new Set(["time", "level", "requestId", "message"]);

const MAX_DEPTH = 8;
const REDACTED = "[REDACTED]";

export function newRequestId(): string {
  return randomUUID();
}

/** Giữ 3 ký tự đầu và 3 ký tự cuối, che phần giữa: 0901234567 thành 090****567. */
export function maskPhone(value: string): string {
  const compact = value.replace(/[\s.-]/g, "");
  if (compact.length <= 6) {
    return "*".repeat(compact.length);
  }
  return compact.slice(0, 3) + "*".repeat(compact.length - 6) + compact.slice(-3);
}

// SĐT Việt Nam dạng 0xxxxxxxxx, 84xxxxxxxxx hoặc +84xxxxxxxxx, cho phép dấu cách, chấm, gạch ngang
// giữa các số. Không khớp khi dính vào một dãy số dài hơn (mã giao dịch, timestamp).
const PHONE_IN_TEXT = /(?<!\d)(?:\+?84|0)(?:[\s.-]?\d){9}(?!\d)/g;
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;

function sanitizeString(text: string): string {
  return text.replace(BEARER_TOKEN, `Bearer ${REDACTED}`).replace(PHONE_IN_TEXT, maskPhone);
}

// Khóa chuẩn hóa (chữ thường, bỏ ký tự không phải chữ số): `Set-Cookie`, `refresh_token`,
// `newPassword` đều được nhận ra. Khớp theo chuỗi con nên thà bỏ nhầm còn hơn lọt.
const SENSITIVE_KEY_PARTS = [
  "password",
  "passwd",
  "token",
  "otp",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "signature",
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSensitiveKey(normalized: string): boolean {
  if (SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part))) {
    return true;
  }
  // PIN bàn giao: chỉ khớp cả khóa hoặc đuôi (`handoverPin`), không khớp `shipping`, `pinned`.
  return normalized.endsWith("pin");
}

const PHONE_KEY_SUFFIXES = ["phone", "phonenumber", "sdt", "mobile", "msisdn"];

function isPhoneKey(normalized: string): boolean {
  return normalized === "tel" || PHONE_KEY_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function maskPhoneValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  return typeof value === "string" ? maskPhone(value) : REDACTED;
}

type Ancestors = Set<object>;

function sanitizeError(error: Error, depth: number, ancestors: Ancestors): Record<string, unknown> {
  const result: Record<string, unknown> = Object.create(null);
  result.name = error.name;
  result.message = sanitizeString(error.message);
  if (error instanceof AppError) {
    result.code = error.code;
    result.httpStatus = error.httpStatus;
  } else {
    // Mã lỗi của thư viện (ví dụ SQLSTATE `23505` của Postgres) hữu ích và không nhạy cảm.
    const code: unknown = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      result.code = code;
    }
  }
  if (error.stack !== undefined) {
    result.stack = sanitizeString(error.stack);
  }
  if (error.cause !== undefined) {
    result.cause = sanitizeValue(error.cause, depth + 1, ancestors);
  }
  return result;
}

function sanitizeObject(
  source: Record<string, unknown>,
  depth: number,
  ancestors: Ancestors,
): Record<string, unknown> {
  // Không có prototype: một khóa `__proto__` trong dữ liệu đầu vào chỉ là khóa thường.
  const result: Record<string, unknown> = Object.create(null);
  for (const [key, raw] of Object.entries(source)) {
    const normalized = normalizeKey(key);
    if (isSensitiveKey(normalized)) {
      continue;
    }
    const value = isPhoneKey(normalized)
      ? maskPhoneValue(raw)
      : sanitizeValue(raw, depth + 1, ancestors);
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function sanitizeValue(value: unknown, depth: number, ancestors: Ancestors): unknown {
  if (value === null) {
    return null;
  }
  switch (typeof value) {
    case "string":
      return sanitizeString(value);
    case "number":
      return Number.isFinite(value) ? value : String(value);
    case "boolean":
      return value;
    case "bigint":
      return value.toString();
    case "object":
      break;
    default:
      // undefined, function, symbol: JSON không biểu diễn được, bỏ qua.
      return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  }
  // Không bao giờ in nội dung buffer: có thể là khóa, ảnh, hay body thô.
  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return `[Binary ${value.byteLength} bytes]`;
  }
  if (depth >= MAX_DEPTH) {
    return "[MaxDepth]";
  }
  if (ancestors.has(value)) {
    return "[Circular]";
  }

  ancestors.add(value);
  try {
    if (value instanceof Error) {
      return sanitizeError(value, depth, ancestors);
    }
    if (Array.isArray(value)) {
      return value.map((item: unknown) => sanitizeValue(item, depth + 1, ancestors) ?? null);
    }
    return sanitizeObject(value as Record<string, unknown>, depth, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Trả về bản sao an toàn để log (hoặc lưu audit): bỏ khóa nhạy cảm, che SĐT, chặn tham chiếu
 * vòng và độ sâu quá lớn. Không sửa đối tượng gốc.
 */
export function sanitizeForLog(value: unknown): unknown {
  return sanitizeValue(value, 0, new Set());
}

function writeToConsole(level: LogLevel, line: string): void {
  switch (level) {
    case "debug":
      console.debug(line);
      break;
    case "info":
      console.info(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

interface LoggerState {
  readonly requestId: string | undefined;
  readonly bound: LogFields;
  readonly minLevel: LogLevel;
  readonly clock: Clock;
  readonly write: (level: LogLevel, line: string) => void;
}

function buildLine(
  state: LoggerState,
  level: LogLevel,
  message: string,
  fields?: LogFields,
): string {
  const entry: Record<string, unknown> = { time: state.clock.now().toISOString(), level };
  if (state.requestId !== undefined) {
    entry.requestId = sanitizeString(state.requestId);
  }
  entry.message = sanitizeString(message);

  const safeFields = sanitizeValue({ ...state.bound, ...fields }, 0, new Set()) as Record<
    string,
    unknown
  >;
  for (const [key, value] of Object.entries(safeFields)) {
    entry[RESERVED_KEYS.has(key) ? `field_${key}` : key] = value;
  }
  return JSON.stringify(entry);
}

function createFromState(state: LoggerState): Logger {
  function emit(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[state.minLevel]) {
      return;
    }
    let line: string;
    try {
      line = buildLine(state, level, message, fields);
    } catch {
      // Logger không bao giờ được làm hỏng request (ví dụ getter ném lỗi trong dữ liệu log).
      line = JSON.stringify({
        time: new Date().toISOString(),
        level,
        message: "Không ghi được log vì dữ liệu không tuần tự hóa được",
      });
    }
    state.write(level, line);
  }

  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
    child(fields) {
      const { requestId, ...bound } = fields;
      return createFromState({
        ...state,
        requestId: typeof requestId === "string" ? requestId : state.requestId,
        bound: { ...state.bound, ...bound },
      });
    },
  };
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return createFromState({
    requestId: options.requestId,
    bound: {},
    minLevel: options.level ?? "info",
    clock: options.clock ?? systemClock,
    write: options.write ?? writeToConsole,
  });
}
