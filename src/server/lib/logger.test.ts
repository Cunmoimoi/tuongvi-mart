import { describe, expect, it } from "vitest";
import type { Clock } from "@/server/lib/clock";
import { AppError } from "@/server/lib/errors";
import {
  createLogger,
  maskPhone,
  newRequestId,
  sanitizeForLog,
  type LogLevel,
} from "@/server/lib/logger";

interface Captured {
  level: LogLevel;
  line: string;
  entry: Record<string, unknown>;
}

const fixedClock: Clock = { now: () => new Date("2026-10-03T07:30:00.000Z") };

function setup(options: Parameters<typeof createLogger>[0] = {}) {
  const captured: Captured[] = [];
  const logger = createLogger({
    clock: fixedClock,
    write: (level, line) => {
      captured.push({ level, line, entry: JSON.parse(line) as Record<string, unknown> });
    },
    ...options,
  });
  return { logger, captured };
}

describe("maskPhone", () => {
  it("(b) 0901234567 thành 090****567", () => {
    expect(maskPhone("0901234567")).toBe("090****567");
  });

  it("giữ 3 ký tự đầu và 3 ký tự cuối, che phần giữa theo đúng độ dài", () => {
    expect(maskPhone("0312345678")).toBe("031****678");
    expect(maskPhone("+84901234567")).toBe("+84******567");
    expect(maskPhone("84901234567")).toBe("849*****567");
  });

  it("bỏ dấu cách, dấu chấm, gạch ngang trước khi che", () => {
    expect(maskPhone("0901 234 567")).toBe("090****567");
    expect(maskPhone("0901.234.567")).toBe("090****567");
    expect(maskPhone("090-123-4567")).toBe("090****567");
  });

  it("chuỗi quá ngắn thì che toàn bộ", () => {
    expect(maskPhone("12345")).toBe("*****");
    expect(maskPhone("123456")).toBe("******");
    expect(maskPhone("")).toBe("");
  });
});

describe("createLogger: định dạng", () => {
  it("(b) mỗi dòng log là một đối tượng JSON có time, level, requestId, message", () => {
    const { logger, captured } = setup({ requestId: "req-123" });
    logger.info("Đặt hàng thành công", { orderId: "abc" });

    expect(captured).toHaveLength(1);
    const first = captured[0];
    expect(first?.level).toBe("info");
    expect(first?.line.includes("\n")).toBe(false);
    expect(first?.entry).toStrictEqual({
      time: "2026-10-03T07:30:00.000Z",
      level: "info",
      requestId: "req-123",
      message: "Đặt hàng thành công",
      orderId: "abc",
    });
  });

  it("không có requestId thì bỏ trường này thay vì ghi undefined", () => {
    const { logger, captured } = setup();
    logger.warn("x");
    expect(captured[0]?.entry).not.toHaveProperty("requestId");
  });

  it("child() giữ requestId của logger cha và gộp thêm trường ngữ cảnh", () => {
    const { logger, captured } = setup({ requestId: "req-9" });
    const child = logger.child({ module: "checkout" });
    child.info("bắt đầu", { step: 1 });

    expect(captured[0]?.entry).toMatchObject({
      requestId: "req-9",
      module: "checkout",
      step: 1,
    });
  });

  it("child() có thể đặt requestId mới", () => {
    const { logger, captured } = setup({ requestId: "cha" });
    logger.child({ requestId: "con" }).info("x");
    expect(captured[0]?.entry.requestId).toBe("con");
  });

  it("trường của người gọi không ghi đè được time, level, requestId, message", () => {
    const { logger, captured } = setup({ requestId: "that" });
    logger.error("thông điệp thật", {
      level: "debug",
      requestId: "gia-mao",
      message: "gia mao",
      time: "1970-01-01T00:00:00.000Z",
    });

    const entry = captured[0]?.entry;
    expect(entry).toMatchObject({
      level: "error",
      requestId: "that",
      message: "thông điệp thật",
      time: "2026-10-03T07:30:00.000Z",
    });
    expect(entry).toMatchObject({
      field_level: "debug",
      field_requestId: "gia-mao",
      field_message: "gia mao",
      field_time: "1970-01-01T00:00:00.000Z",
    });
  });

  it("lọc theo mức: mặc định info, bỏ qua debug", () => {
    const { logger, captured } = setup();
    logger.debug("bị bỏ");
    logger.info("giữ");
    logger.warn("giữ");
    logger.error("giữ");
    expect(captured.map((c) => c.level)).toStrictEqual(["info", "warn", "error"]);
  });

  it("đặt level = error thì chỉ còn error", () => {
    const { logger, captured } = setup({ level: "error" });
    logger.info("bị bỏ");
    logger.warn("bị bỏ");
    logger.error("giữ");
    expect(captured.map((c) => c.level)).toStrictEqual(["error"]);
  });

  it("newRequestId sinh chuỗi khác nhau mỗi lần", () => {
    const ids = new Set(Array.from({ length: 100 }, () => newRequestId()));
    expect(ids.size).toBe(100);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

describe("createLogger: che dữ liệu nhạy cảm", () => {
  it("(b) che SĐT trong trường dữ liệu: 0901234567 thành 090****567", () => {
    const { logger, captured } = setup();
    logger.info("tạo khách", { phone: "0901234567" });

    expect(captured[0]?.entry.phone).toBe("090****567");
    expect(captured[0]?.line).not.toContain("0901234567");
  });

  it("(b) che SĐT nằm lẫn trong câu thông điệp và trong chuỗi bất kỳ", () => {
    const { logger, captured } = setup();
    logger.info("Gửi OTP tới 0901234567 thất bại", { note: "liên hệ +84 901 234 567 nhé" });

    expect(captured[0]?.entry.message).toBe("Gửi OTP tới 090****567 thất bại");
    expect(captured[0]?.entry.note).toBe("liên hệ +84******567 nhé");
    expect(captured[0]?.line).not.toContain("901234567");
  });

  it("che SĐT theo tên khóa dù giá trị không đúng định dạng thường gặp", () => {
    const { logger, captured } = setup();
    logger.info("x", { phoneNumber: "901234567", sdt: "0901234567", mobile: 901234567 });

    const entry = captured[0]?.entry;
    expect(entry?.phoneNumber).toBe("901***567");
    expect(entry?.sdt).toBe("090****567");
    expect(entry?.mobile).toBe("[REDACTED]");
  });

  it("không che nhầm số tiền, mã đơn hay số ngắn", () => {
    const { logger, captured } = setup();
    logger.info("đơn TVM8K3N2P5Q tổng 300000", { total: 300000, orderCode: "TVM8K3N2P5Q" });

    expect(captured[0]?.entry.message).toBe("đơn TVM8K3N2P5Q tổng 300000");
    expect(captured[0]?.entry.total).toBe(300000);
    expect(captured[0]?.entry.orderCode).toBe("TVM8K3N2P5Q");
  });

  it("không che đoạn giữa của một dãy số dài hơn SĐT", () => {
    const { logger, captured } = setup();
    logger.info("x", { id: "1090123456789" });
    expect(captured[0]?.entry.id).toBe("1090123456789");
  });

  it.each(["password", "token", "otp", "secret", "authorization", "cookie"])(
    "(b) bỏ hẳn trường %s",
    (key) => {
      const { logger, captured } = setup();
      logger.info("x", { [key]: "gia-tri-bi-mat-12345", keep: "ok" });

      const entry = captured[0]?.entry;
      expect(entry).not.toHaveProperty(key);
      expect(entry?.keep).toBe("ok");
      expect(captured[0]?.line).not.toContain("gia-tri-bi-mat-12345");
    },
  );

  it("(b) bỏ trường password dù viết hoa, viết kiểu camelCase, snake_case hay lồng sâu", () => {
    const { logger, captured } = setup();
    logger.info("đăng ký", {
      Password: "mk-1",
      newPassword: "mk-2",
      confirm_password: "mk-3",
      accessToken: "tk-1",
      refresh_token: "tk-2",
      otpCode: "123456",
      clientSecret: "sc-1",
      "set-cookie": "sb=abc",
      Authorization: "Bearer abc.def",
      "x-api-key": "key-1",
      user: { id: "u1", profile: { password: "mk-4", name: "An" } },
      list: [{ token: "tk-3", id: 1 }],
    });

    const line = captured[0]?.line ?? "";
    for (const secret of [
      "mk-1",
      "mk-2",
      "mk-3",
      "mk-4",
      "tk-1",
      "tk-2",
      "tk-3",
      "123456",
      "sc-1",
      "sb=abc",
      "abc.def",
      "key-1",
    ]) {
      expect(line, secret).not.toContain(secret);
    }
    expect(captured[0]?.entry.user).toStrictEqual({ id: "u1", profile: { name: "An" } });
    expect(captured[0]?.entry.list).toStrictEqual([{ id: 1 }]);
  });

  it("bỏ cả PIN bàn giao nhưng không bỏ nhầm các khóa chỉ chứa chữ 'pin' bên trong từ khác", () => {
    const { logger, captured } = setup();
    logger.info("x", {
      pin: "123456",
      handoverPin: "654321",
      shipping: "giao nhanh",
      pinned: true,
    });

    const entry = captured[0]?.entry;
    expect(entry).not.toHaveProperty("pin");
    expect(entry).not.toHaveProperty("handoverPin");
    expect(entry?.shipping).toBe("giao nhanh");
    expect(entry?.pinned).toBe(true);
  });

  it("che token kiểu Bearer lọt vào chuỗi thông điệp", () => {
    const { logger, captured } = setup();
    logger.error("gọi API lỗi: Authorization: Bearer eyJhbGciOi.payload.sig bị từ chối");

    expect(captured[0]?.line).not.toContain("eyJhbGciOi");
    expect(captured[0]?.entry.message).toContain("Bearer [REDACTED]");
  });

  it("che dữ liệu nhạy cảm bên trong Error (message, cause)", () => {
    const { logger, captured } = setup();
    const error = new Error("không gửi được tới 0901234567", {
      cause: new Error("Bearer abc123xyz hết hạn"),
    });
    logger.error("lỗi SMS", { error });

    const line = captured[0]?.line ?? "";
    expect(line).not.toContain("0901234567");
    expect(line).not.toContain("abc123xyz");
    const logged = captured[0]?.entry.error as Record<string, unknown>;
    expect(logged.name).toBe("Error");
    expect(logged.message).toBe("không gửi được tới 090****567");
  });

  it("ghi AppError kèm mã và HTTP status", () => {
    const { logger, captured } = setup();
    logger.warn("bị chặn", { error: new AppError("RATE_LIMITED") });

    expect(captured[0]?.entry.error).toMatchObject({
      name: "AppError",
      code: "RATE_LIMITED",
      httpStatus: 429,
    });
  });
});

describe("sanitizeForLog: độ bền", () => {
  it("không ném lỗi với tham chiếu vòng", () => {
    const a: Record<string, unknown> = { name: "a" };
    a.self = a;
    const result = sanitizeForLog(a) as Record<string, unknown>;
    expect(result.name).toBe("a");
    expect(result.self).toBe("[Circular]");
  });

  it("giới hạn độ sâu để không bị tràn stack", () => {
    let deep: Record<string, unknown> = { end: true };
    for (let i = 0; i < 50; i += 1) {
      deep = { child: deep };
    }
    expect(() => JSON.stringify(sanitizeForLog(deep))).not.toThrow();
    expect(JSON.stringify(sanitizeForLog(deep))).toContain("[MaxDepth]");
  });

  it("xử lý BigInt, Date, Buffer, hàm và undefined mà không làm hỏng JSON", () => {
    const { logger, captured } = setup();
    expect(() =>
      logger.info("kiểu lạ", {
        big: BigInt(123),
        when: new Date("2026-10-03T00:00:00.000Z"),
        bytes: Buffer.from("khoa-bi-mat"),
        fn: () => 1,
        nothing: undefined,
      }),
    ).not.toThrow();

    const entry = captured[0]?.entry;
    expect(entry?.big).toBe("123");
    expect(entry?.when).toBe("2026-10-03T00:00:00.000Z");
    expect(entry?.bytes).toBe("[Binary 11 bytes]");
    expect(captured[0]?.line).not.toContain("khoa-bi-mat");
  });

  it("không sửa đối tượng gốc của người gọi", () => {
    const input = { password: "abc", phone: "0901234567", nested: { token: "t" } };
    sanitizeForLog(input);
    expect(input).toStrictEqual({
      password: "abc",
      phone: "0901234567",
      nested: { token: "t" },
    });
  });
});
