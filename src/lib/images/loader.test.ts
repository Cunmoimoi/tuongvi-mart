import { describe, expect, it } from "vitest";
import {
  createVariantLoader,
  isSafeImageUrl,
  listVariants,
  pickVariant,
  sanitizeBlurDataUrl,
} from "@/lib/images/loader";

const CARD = listVariants({
  "320": "https://cdn.example.test/media/a-320.webp",
  "480": "https://cdn.example.test/media/a-480.webp",
});

describe("listVariants", () => {
  it("sắp tăng dần theo chiều rộng", () => {
    expect(
      listVariants({ "480": "https://x.test/b.webp", "320": "https://x.test/a.webp" }).map(
        (variant) => variant.width,
      ),
    ).toStrictEqual([320, 480]);
  });

  it("bỏ khóa không phải số nguyên dương và URL không an toàn", () => {
    expect(
      listVariants({
        abc: "https://x.test/1.webp",
        "0": "https://x.test/2.webp",
        "-5": "https://x.test/3.webp",
        "1.5": "https://x.test/4.webp",
        "320": "javascript:alert(1)",
        "480": "https://x.test/ok.webp",
      }),
    ).toStrictEqual([{ width: 480, url: "https://x.test/ok.webp" }]);
  });

  it("không có dữ liệu thì rỗng", () => {
    expect(listVariants(undefined)).toStrictEqual([]);
    expect(listVariants({})).toStrictEqual([]);
  });
});

describe("pickVariant", () => {
  it("chọn bản nhỏ nhất không nhỏ hơn chiều rộng yêu cầu", () => {
    expect(pickVariant(CARD, 100)?.width).toBe(320);
    expect(pickVariant(CARD, 320)?.width).toBe(320);
    expect(pickVariant(CARD, 321)?.width).toBe(480);
    expect(pickVariant(CARD, 388)?.width).toBe(480);
  });

  it("yêu cầu lớn hơn mọi bản thì lấy bản lớn nhất (không phóng to)", () => {
    expect(pickVariant(CARD, 1200)?.width).toBe(480);
  });

  it("không phụ thuộc thứ tự đầu vào", () => {
    expect(pickVariant([...CARD].reverse(), 400)?.width).toBe(480);
  });

  it("không có bản nào thì trả undefined", () => {
    expect(pickVariant([], 320)).toBeUndefined();
  });
});

describe("createVariantLoader", () => {
  const loader = createVariantLoader(CARD);

  it("trả URL của bản có sẵn gần nhất không nhỏ hơn", () => {
    expect(loader({ src: "x", width: 160 })).toBe("https://cdn.example.test/media/a-320.webp");
    expect(loader({ src: "x", width: 480 })).toBe("https://cdn.example.test/media/a-480.webp");
    expect(loader({ src: "x", width: 750 })).toBe("https://cdn.example.test/media/a-480.webp");
  });

  it("không có bản nào thì ném lỗi thay vì trả URL rỗng", () => {
    expect(() => createVariantLoader([])).toThrow(RangeError);
  });
});

describe("isSafeImageUrl", () => {
  it("nhận http(s) tuyệt đối và đường dẫn gốc", () => {
    expect(isSafeImageUrl("https://x.test/a.webp")).toBe(true);
    expect(isSafeImageUrl("http://localhost:54321/a.webp")).toBe(true);
    expect(isSafeImageUrl("/placeholders/product.svg")).toBe(true);
  });

  it("từ chối scheme khác, URL cùng giao thức, khoảng trắng và dấu nháy", () => {
    for (const value of [
      "javascript:alert(1)",
      "data:image/svg+xml;base64,AAAA",
      "//evil.test/a.webp",
      "https://x.test/a b.webp",
      'https://x.test/a".webp',
      "https://x.test/a)b.webp",
      "",
      "relative/path.webp",
      null,
      42,
    ]) {
      expect(isSafeImageUrl(value), String(value)).toBe(false);
    }
  });
});

describe("sanitizeBlurDataUrl", () => {
  it("nhận ảnh base64 hợp lệ", () => {
    const value = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
    expect(sanitizeBlurDataUrl(value)).toBe(value);
  });

  it("bỏ giá trị sai định dạng hoặc có thể phá CSS", () => {
    expect(sanitizeBlurDataUrl("data:image/svg+xml;base64,AAAA")).toBeUndefined();
    expect(sanitizeBlurDataUrl('data:image/webp;base64,AAAA");background:url(x')).toBeUndefined();
    expect(sanitizeBlurDataUrl("https://x.test/a.webp")).toBeUndefined();
    expect(sanitizeBlurDataUrl(null)).toBeUndefined();
    expect(sanitizeBlurDataUrl(undefined)).toBeUndefined();
  });
});
