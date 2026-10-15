import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PhoneInput, PHONE_MAX_DIGITS, sanitizePhoneDigits } from "@/components/ui/phone-input";

describe("sanitizePhoneDigits", () => {
  it("chỉ giữ chữ số", () => {
    expect(sanitizePhoneDigits("090 123-4567")).toBe("0901234567");
    expect(sanitizePhoneDigits("(090) 123.4567")).toBe("0901234567");
    expect(sanitizePhoneDigits("abc")).toBe("");
  });

  it("dán +84... thì giữ nguyên các chữ số, không tự đổi đầu số (chuẩn hóa do server)", () => {
    expect(sanitizePhoneDigits("+84 901 234 567")).toBe("84901234567");
  });

  it("cắt ở số chữ số tối đa", () => {
    expect(sanitizePhoneDigits("1".repeat(30))).toHaveLength(PHONE_MAX_DIGITS);
  });
});

describe("PhoneInput", () => {
  function render(props: Partial<React.ComponentProps<typeof PhoneInput>> = {}) {
    return renderToStaticMarkup(
      <PhoneInput label="Số điện thoại" value="" onValueChange={() => undefined} {...props} />,
    );
  }

  it("có nhãn gắn với ô nhập, bàn phím số và gợi ý tự điền", () => {
    const html = render();
    const id = html.match(/<input[^>]*\sid="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`for="${id}"`);
    expect(html).toContain('type="tel"');
    expect(html).toContain('inputMode="tel"');
    expect(html).toContain('autoComplete="tel-national"');
    expect(html).toContain("+84");
  });

  it("chữ ô nhập ≥ 16px để iOS không tự phóng to", () => {
    expect(render()).toMatch(/<input[^>]*class="[^"]*\btext-base\b/);
  });

  it("có lỗi thì aria-invalid và thông báo role=alert gắn qua aria-describedby", () => {
    const html = render({ error: "SĐT chưa đủ số" });
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    const errorId = html.match(/<p id="([^"]+)" role="alert"/)?.[1];
    expect(html).toContain(`aria-describedby="${errorId}"`);
  });
});
