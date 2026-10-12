import { describe, expect, it } from "vitest";
import { AUDIT_PAYLOAD_MAX_BYTES, prepareAuditPayload } from "@/server/audit/payload";

const byteLength = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");

describe("prepareAuditPayload: che dữ liệu nhạy cảm", () => {
  it("null và undefined thành null", () => {
    expect(prepareAuditPayload(null)).toBeNull();
    expect(prepareAuditPayload(undefined)).toBeNull();
  });

  it("bỏ khóa nhạy cảm và che SĐT ở mọi tầng lồng nhau", () => {
    const result = prepareAuditPayload({
      name: "Nguyễn An",
      password: "mk-1",
      phone: "0901234567",
      profile: {
        newPassword: "mk-2",
        contact: { mobile: "0912345678", note: "gọi 0987654321 nhé" },
        deep: { deeper: { deepest: { otpCode: "135790", apiKey: "key-1", keep: "ok" } } },
      },
      list: [
        { access_token: "tk-1", id: 1 },
        { signature: "sig-1", handoverPin: "2468" },
      ],
      headers: { Authorization: "Bearer abc.def", Cookie: "sb=xyz", "x-api-key": "key-2" },
      clientSecret: "sc-1",
      pin: "1111",
    });

    const json = JSON.stringify(result);
    for (const secret of [
      "mk-1",
      "mk-2",
      "135790",
      "key-1",
      "key-2",
      "tk-1",
      "sig-1",
      "2468",
      "abc.def",
      "sb=xyz",
      "sc-1",
      "1111",
      "0901234567",
      "0912345678",
      "0987654321",
    ]) {
      expect(json, secret).not.toContain(secret);
    }
    expect(result).toStrictEqual({
      name: "Nguyễn An",
      phone: "090****567",
      profile: {
        contact: { mobile: "091****678", note: "gọi 098****321 nhé" },
        deep: { deeper: { deepest: { keep: "ok" } } },
      },
      list: [{ id: 1 }, {}],
      headers: {},
    });
  });

  it("Date thành chuỗi ISO, BigInt thành chuỗi số, tham chiếu vòng không làm hỏng", () => {
    const node: Record<string, unknown> = { label: "gốc" };
    node.self = node;
    const result = prepareAuditPayload({
      at: new Date("2026-10-12T01:02:03.000Z"),
      amount: BigInt("123456789012345678901234567890"),
      node,
    });
    expect(result).toStrictEqual({
      at: "2026-10-12T01:02:03.000Z",
      amount: "123456789012345678901234567890",
      node: { label: "gốc", self: "[Circular]" },
    });
  });

  it("không sửa đối tượng gốc của người gọi", () => {
    const input = { password: "abc", phone: "0901234567", nested: { token: "t" } };
    prepareAuditPayload(input);
    expect(input).toStrictEqual({
      password: "abc",
      phone: "0901234567",
      nested: { token: "t" },
    });
  });

  it("thay ký tự NUL và surrogate lẻ (Postgres jsonb không nhận) bằng U+FFFD", () => {
    const result = prepareAuditPayload({
      note: "a\u0000b",
      broken: "x\uD800y",
      "k\u0000ey": "v",
    }) as Record<string, unknown>;
    expect(result.note).toBe("a\uFFFDb");
    expect(result.broken).toBe("x\uFFFDy");
    expect(result["k\uFFFDey"]).toBe("v");
    expect(JSON.stringify(result)).not.toMatch(/\\u0000|\\ud800/i);
  });

  it("giá trị không phải object vẫn được làm sạch", () => {
    expect(prepareAuditPayload("liên hệ 0901234567")).toBe("liên hệ 090****567");
    expect(prepareAuditPayload(42)).toBe(42);
    expect(prepareAuditPayload(() => 1)).toBeNull();
  });
});

describe("prepareAuditPayload: giới hạn 16 KB", () => {
  it("giới hạn là 16 KB tính theo byte UTF-8 của JSON", () => {
    expect(AUDIT_PAYLOAD_MAX_BYTES).toBe(16 * 1024);
  });

  it("payload vừa đúng giới hạn thì giữ nguyên", () => {
    // {"s":"..."} có 8 byte ngoài phần chuỗi.
    const exact = { s: "a".repeat(AUDIT_PAYLOAD_MAX_BYTES - 8) };
    expect(byteLength(exact)).toBe(AUDIT_PAYLOAD_MAX_BYTES);
    expect(prepareAuditPayload(exact)).toStrictEqual(exact);
  });

  it("vượt giới hạn thì cắt, gắn dấu hiệu bị cắt và không ném lỗi", () => {
    const big = {
      items: Array.from({ length: 2000 }, (_, i) => ({ id: i, name: `Sản phẩm ${i}` })),
    };
    const originalBytes = byteLength(big);
    expect(originalBytes).toBeGreaterThan(AUDIT_PAYLOAD_MAX_BYTES);

    const result = prepareAuditPayload(big) as Record<string, unknown>;
    expect(result._truncated).toBe(true);
    expect(result.originalBytes).toBe(originalBytes);
    expect(typeof result.preview).toBe("string");
    expect(String(result.preview).startsWith('{"items":[{"id":0,')).toBe(true);
    expect(byteLength(result)).toBeLessThanOrEqual(AUDIT_PAYLOAD_MAX_BYTES);
  });

  it("đo theo byte: chuỗi tiếng Việt có dấu nhiều byte vẫn nằm trong giới hạn sau khi cắt", () => {
    const result = prepareAuditPayload({ note: "Đường ống ướt ".repeat(3000) });
    expect(result).toMatchObject({ _truncated: true });
    expect(byteLength(result)).toBeLessThanOrEqual(AUDIT_PAYLOAD_MAX_BYTES);
  });

  it("nội dung nhiều dấu nháy và gạch chéo (phình to khi escape) vẫn nằm trong giới hạn", () => {
    const result = prepareAuditPayload({ note: '"\\'.repeat(20000) });
    expect(result).toMatchObject({ _truncated: true });
    expect(byteLength(result)).toBeLessThanOrEqual(AUDIT_PAYLOAD_MAX_BYTES);
  });

  it("không cắt đôi ký tự nhiều byte trong preview", () => {
    const result = prepareAuditPayload({ note: "😀".repeat(10000) }) as Record<string, unknown>;
    expect(String(result.preview)).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  it("dữ liệu nhạy cảm bị che TRƯỚC khi cắt: preview không chứa bí mật", () => {
    const result = prepareAuditPayload({
      password: "mat-khau-bi-mat",
      phone: "0901234567",
      filler: "x".repeat(40000),
    });
    const json = JSON.stringify(result);
    expect(json).not.toContain("mat-khau-bi-mat");
    expect(json).not.toContain("0901234567");
    expect(json).toContain("090****567");
  });

  it("payload rất lớn (1 MB) vẫn xử lý được", () => {
    const result = prepareAuditPayload({ blob: "z".repeat(1024 * 1024) });
    expect(byteLength(result)).toBeLessThanOrEqual(AUDIT_PAYLOAD_MAX_BYTES);
  });
});
