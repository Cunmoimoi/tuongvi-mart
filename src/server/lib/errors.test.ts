import { describe, expect, it } from "vitest";
import {
  AppError,
  ERROR_MESSAGES,
  isAppError,
  toAppError,
  type ErrorCode,
} from "@/server/lib/errors";

const ALL_CODES = Object.keys(ERROR_MESSAGES) as ErrorCode[];

describe("bảng thông điệp lỗi", () => {
  it("mọi mã lỗi đều có thông điệp tiếng Việt không rỗng", () => {
    expect(ALL_CODES.length).toBeGreaterThan(0);
    for (const code of ALL_CODES) {
      expect(ERROR_MESSAGES[code].length, code).toBeGreaterThan(0);
    }
  });

  it("có các mã lỗi mà BUSINESS_RULES mục 4 nhắc tới", () => {
    for (const code of [
      "PRICE_CHANGED",
      "OUT_OF_STOCK",
      "ITEM_UNAVAILABLE",
      "FLASH_SALE_INSUFFICIENT",
      "OUT_OF_DELIVERY_RANGE",
    ] as const) {
      expect(ALL_CODES, code).toContain(code);
    }
  });

  it("thông điệp đăng nhập sai không tiết lộ SĐT có tồn tại hay không", () => {
    expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toBe("SĐT hoặc mật khẩu không đúng");
  });
});

describe("AppError", () => {
  it("lấy thông điệp người dùng từ bảng, không từ chỗ gọi", () => {
    const error = new AppError("NOT_FOUND");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.message).toBe(ERROR_MESSAGES.NOT_FOUND);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
  });

  it("mỗi mã có HTTP status mặc định hợp lý", () => {
    expect(new AppError("VALIDATION_FAILED").httpStatus).toBe(400);
    expect(new AppError("UNAUTHENTICATED").httpStatus).toBe(401);
    expect(new AppError("FORBIDDEN").httpStatus).toBe(403);
    expect(new AppError("NOT_FOUND").httpStatus).toBe(404);
    expect(new AppError("RATE_LIMITED").httpStatus).toBe(429);
    expect(new AppError("INTERNAL").httpStatus).toBe(500);
  });

  it("cho phép ghi đè HTTP status khi cần", () => {
    expect(new AppError("NOT_FOUND", 410).httpStatus).toBe(410);
  });

  it("từ chối HTTP status không hợp lệ", () => {
    expect(() => new AppError("NOT_FOUND", 200)).toThrow(RangeError);
    expect(() => new AppError("NOT_FOUND", 404.5)).toThrow(RangeError);
    expect(() => new AppError("NOT_FOUND", 700)).toThrow(RangeError);
  });

  it("giữ nguyên nhân gốc ở cause nhưng không đưa vào message hay phần trả cho client", () => {
    const cause = new Error("connection to 10.0.0.5:5432 refused, password=hunter2");
    const error = new AppError("INTERNAL", undefined, { cause });
    expect(error.cause).toBe(cause);
    expect(error.message).not.toContain("10.0.0.5");
    expect(JSON.stringify(error.toPublic())).not.toContain("hunter2");
  });

  it("toPublic chỉ trả mã và thông điệp", () => {
    expect(new AppError("FORBIDDEN").toPublic()).toStrictEqual({
      code: "FORBIDDEN",
      message: ERROR_MESSAGES.FORBIDDEN,
    });
  });
});

describe("isAppError và toAppError", () => {
  it("isAppError nhận ra AppError và từ chối thứ khác", () => {
    expect(isAppError(new AppError("FORBIDDEN"))).toBe(true);
    expect(isAppError(new Error("x"))).toBe(false);
    expect(isAppError({ code: "FORBIDDEN", httpStatus: 403 })).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it("toAppError giữ nguyên AppError", () => {
    const original = new AppError("RATE_LIMITED");
    expect(toAppError(original)).toBe(original);
  });

  it("toAppError biến lỗi lạ thành INTERNAL 500 và không lộ chi tiết", () => {
    const raw = new Error("duplicate key value violates unique constraint orders_pkey");
    const converted = toAppError(raw);
    expect(converted.code).toBe("INTERNAL");
    expect(converted.httpStatus).toBe(500);
    expect(converted.message).toBe(ERROR_MESSAGES.INTERNAL);
    expect(converted.message).not.toContain("orders_pkey");
    expect(converted.cause).toBe(raw);
  });

  it("toAppError xử lý cả giá trị không phải Error", () => {
    expect(toAppError("chuỗi bất kỳ").code).toBe("INTERNAL");
    expect(toAppError(undefined).code).toBe("INTERNAL");
  });
});
