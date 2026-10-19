import { describe, expect, it } from "vitest";
import { createConsoleSms } from "@/server/adapters/sms/fakes/console";
import { createWriteSink } from "../../../../../tests/helpers/adapters";

// Adapter giả `console`: in tin ra console thay vì gửi. OTP chỉ in ở local (để lập trình viên đăng
// nhập được); ở test thì không in, vì log CI là thứ nhiều người đọc được.

const PHONE = "+84901234567";

describe("sms/console ở APP_ENV=local", () => {
  it("in OTP kèm SĐT đã che, đúng một dòng", async () => {
    const sink = createWriteSink();
    await createConsoleSms({ appEnv: "local", write: sink.write }).sendOtp({
      phone: PHONE,
      code: "482913",
    });
    expect(sink.lines).toHaveLength(1);
    expect(sink.lines[0]).toContain("482913");
    expect(sink.lines[0]).toContain("+84******567");
    expect(sink.lines[0]).not.toContain("901234567");
  });

  it("in nội dung tin nhắn, SĐT trong nội dung cũng bị che", async () => {
    const sink = createWriteSink();
    await createConsoleSms({ appEnv: "local", write: sink.write }).sendMessage({
      phone: PHONE,
      text: "Đơn TVM2345ABCD đã sẵn sàng, gọi 0901234567 nếu cần",
    });
    expect(sink.lines).toHaveLength(1);
    expect(sink.lines[0]).toContain("Đơn TVM2345ABCD đã sẵn sàng");
    expect(sink.lines[0]).not.toContain("901234567");
  });
});

describe("sms/console ở APP_ENV=test", () => {
  it("không in OTP, chỉ in SĐT đã che", async () => {
    const sink = createWriteSink();
    await createConsoleSms({ appEnv: "test", write: sink.write }).sendOtp({
      phone: PHONE,
      code: "482913",
    });
    expect(sink.lines).toHaveLength(1);
    expect(sink.lines[0]).not.toContain("482913");
    expect(sink.lines[0]).toContain("+84******567");
  });

  it("không in nội dung tin nhắn, chỉ in độ dài", async () => {
    const sink = createWriteSink();
    await createConsoleSms({ appEnv: "test", write: sink.write }).sendMessage({
      phone: PHONE,
      text: "Mã nhận hàng 771204",
    });
    expect(sink.lines).toHaveLength(1);
    expect(sink.lines[0]).not.toContain("771204");
    expect(sink.lines[0]).toContain("19 ký tự");
  });
});

describe("sms/console: khởi tạo", () => {
  it("mặc định ghi ra console.info", async () => {
    const original = console.info;
    const lines: unknown[] = [];
    console.info = (line: unknown) => void lines.push(line);
    try {
      await createConsoleSms({ appEnv: "test" }).sendOtp({ phone: PHONE, code: "482913" });
    } finally {
      console.info = original;
    }
    expect(lines).toHaveLength(1);
  });

  it.each(["staging", "production"] as const)("từ chối APP_ENV=%s", (appEnv) => {
    expect(() => createConsoleSms({ appEnv })).toThrow(/adapter giả/);
  });
});
