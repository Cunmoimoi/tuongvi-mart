import { describe, expect, it } from "vitest";
import {
  getRequestContext,
  normalizeIp,
  normalizeRequestContext,
  normalizeUserAgent,
  USER_AGENT_MAX_LENGTH,
} from "@/server/audit/request-context";

const fixedId = () => "generated-id";

describe("normalizeIp", () => {
  it("nhận IPv4 và IPv6 hợp lệ (kiểm bằng net.isIP)", () => {
    expect(normalizeIp("203.0.113.7")).toBe("203.0.113.7");
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
    expect(normalizeIp("::ffff:203.0.113.7")).toBe("::ffff:203.0.113.7");
    expect(normalizeIp("  203.0.113.7 ")).toBe("203.0.113.7");
  });

  it.each([
    ["chuỗi bất kỳ", "not-an-ip"],
    ["số ngoài phạm vi", "999.1.1.1"],
    ["kèm cổng", "203.0.113.7:8080"],
    ["IPv6 trong ngoặc vuông", "[2001:db8::1]"],
    ["IPv6 có zone id (Postgres inet không nhận)", "fe80::1%eth0"],
    ["chuỗi rỗng", ""],
    ["chèn SQL", "1.2.3.4'; drop table x; --"],
  ])("sai định dạng (%s) thì trả null", (_label, value) => {
    expect(normalizeIp(value)).toBeNull();
  });

  it("null hoặc undefined thì trả null", () => {
    expect(normalizeIp(null)).toBeNull();
    expect(normalizeIp(undefined)).toBeNull();
  });
});

describe("normalizeUserAgent", () => {
  it("cắt còn 255 ký tự", () => {
    const long = "a".repeat(1000);
    expect(normalizeUserAgent(long)).toBe("a".repeat(USER_AGENT_MAX_LENGTH));
    expect(USER_AGENT_MAX_LENGTH).toBe(255);
  });

  it("đếm theo ký tự Unicode, không cắt đôi emoji", () => {
    const ua = "😀".repeat(300);
    const result = normalizeUserAgent(ua) ?? "";
    expect(Array.from(result)).toHaveLength(255);
    expect(result).toBe("😀".repeat(255));
  });

  it("bỏ ký tự điều khiển; rỗng hoặc thiếu thì trả null", () => {
    expect(normalizeUserAgent("Mozilla\u0000/5.0\n")).toBe("Mozilla/5.0");
    expect(normalizeUserAgent("")).toBeNull();
    expect(normalizeUserAgent("   ")).toBeNull();
    expect(normalizeUserAgent(null)).toBeNull();
    expect(normalizeUserAgent(undefined)).toBeNull();
  });
});

describe("getRequestContext", () => {
  it("lấy IP đầu tiên của x-forwarded-for, user agent và x-vercel-id", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      "user-agent": "Mozilla/5.0 (test)",
      "x-vercel-id": "sin1::abcde-1760000000000-0123456789ab",
    });
    expect(getRequestContext(headers, fixedId)).toStrictEqual({
      ip: "203.0.113.7",
      userAgent: "Mozilla/5.0 (test)",
      requestId: "sin1::abcde-1760000000000-0123456789ab",
    });
  });

  it("không có x-forwarded-for thì dùng x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "2001:db8::1" });
    expect(getRequestContext(headers, fixedId).ip).toBe("2001:db8::1");
  });

  it("IP giả mạo sai định dạng thì ghi null, không ném lỗi", () => {
    const headers = new Headers({ "x-forwarded-for": "<script>, 203.0.113.7" });
    expect(getRequestContext(headers, fixedId).ip).toBeNull();
  });

  it("không có header nào thì ip, userAgent là null và requestId được sinh mới", () => {
    expect(getRequestContext(new Headers(), fixedId)).toStrictEqual({
      ip: null,
      userAgent: null,
      requestId: "generated-id",
    });
  });

  it("x-vercel-id sai định dạng hoặc quá dài thì sinh requestId mới", () => {
    expect(
      getRequestContext(new Headers({ "x-vercel-id": "has space; drop" }), fixedId).requestId,
    ).toBe("generated-id");
    expect(
      getRequestContext(new Headers({ "x-vercel-id": "a".repeat(200) }), fixedId).requestId,
    ).toBe("generated-id");
  });

  it("mặc định sinh requestId ngẫu nhiên khác nhau", () => {
    const a = getRequestContext(new Headers()).requestId;
    const b = getRequestContext(new Headers()).requestId;
    expect(a).not.toBe(b);
  });
});

describe("normalizeRequestContext", () => {
  it("chuẩn hóa lại dữ liệu người gọi tự dựng", () => {
    expect(
      normalizeRequestContext({
        ip: "khong-phai-ip",
        userAgent: "x".repeat(300),
        requestId: "r-1",
      }),
    ).toStrictEqual({ ip: null, userAgent: "x".repeat(255), requestId: "r-1" });
  });

  it("không có ngữ cảnh (job hệ thống) thì mọi trường là null", () => {
    expect(normalizeRequestContext(undefined)).toStrictEqual({
      ip: null,
      userAgent: null,
      requestId: null,
    });
    expect(normalizeRequestContext({ requestId: "có dấu cách" }).requestId).toBeNull();
  });
});
