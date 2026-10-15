import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PriceTag } from "@/components/ui/price-tag";

/**
 * Chữ nhìn thấy, mỗi khối (giá, giá gốc, tiết kiệm...) cách nhau một khoảng trắng: bỏ phần chỉ
 * dành cho trình đọc màn hình (`sr-only`), giữ ký hiệu đ dính liền với số.
 */
function visibleText(html: string): string {
  return html
    .replace(/<span class="sr-only">[^<]*<\/span>/g, "")
    .replace(/<span class="[^"]*underline[^"]*">đ<\/span>/g, "đ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("PriceTag (thẻ sản phẩm)", () => {
  it("hiện giá 22.900đ, giá gốc gạch ngang và Tiết kiệm 7K", () => {
    const html = renderToStaticMarkup(<PriceTag price={22_900} originalPrice={29_900} />);
    expect(visibleText(html)).toBe("22.900đ 29.900đ Tiết kiệm 7K");
    // Giá gốc nằm trong <del> (gạch ngang), giá bán thì không.
    expect(html).toMatch(/<del[^>]*>.*29\.900đ<\/del>/);
    expect(html).not.toMatch(/<del[^>]*>[^<]*22\.900/);
  });

  it("ký hiệu đ của giá bán nhỏ hơn và gạch chân", () => {
    const html = renderToStaticMarkup(<PriceTag price={22_900} />);
    expect(html).toMatch(/22\.900<span class="[^"]*underline[^"]*">đ<\/span>/);
  });

  it("không giảm giá: chỉ có giá bán, không giá gốc, không tiết kiệm", () => {
    const html = renderToStaticMarkup(<PriceTag price={22_900} />);
    expect(visibleText(html)).toBe("22.900đ");
    expect(html).not.toContain("<del");
    expect(html).not.toContain("Tiết kiệm");
  });

  it("giá gốc bằng hoặc thấp hơn giá bán thì không hiện giá gốc và tiết kiệm", () => {
    for (const originalPrice of [22_900, 20_000]) {
      const html = renderToStaticMarkup(<PriceTag price={22_900} originalPrice={originalPrice} />);
      expect(visibleText(html), String(originalPrice)).toBe("22.900đ");
    }
  });

  it("tiết kiệm lẻ ghi 13,5K", () => {
    const html = renderToStaticMarkup(<PriceTag price={36_500} originalPrice={50_000} />);
    expect(visibleText(html)).toContain("Tiết kiệm 13,5K");
  });

  it("giỏ hàng (inline): viết liền 22.900đ và tiết kiệm đầy đủ 7.000đ", () => {
    const html = renderToStaticMarkup(
      <PriceTag variant="inline" price={22_900} originalPrice={29_900} />,
    );
    expect(visibleText(html)).toBe("22.900đ 29.900đ Tiết kiệm 7.000đ");
  });

  it("trang chi tiết (large): kèm đơn giá quy đổi", () => {
    const html = renderToStaticMarkup(
      <PriceTag
        variant="large"
        price={17_000}
        originalPrice={27_000}
        unitPrice={{ amount: 13_500, unit: "gói" }}
      />,
    );
    expect(visibleText(html)).toBe("17.000đ 27.000đ Tiết kiệm 10K (13.500đ / gói)");
  });

  it("savings='none' ẩn dòng tiết kiệm", () => {
    const html = renderToStaticMarkup(
      <PriceTag price={22_900} originalPrice={29_900} savings="none" />,
    );
    expect(html).not.toContain("Tiết kiệm");
    expect(html).toContain("<del");
  });

  it("trình đọc màn hình phân biệt được giá bán và giá gốc", () => {
    const html = renderToStaticMarkup(<PriceTag price={22_900} originalPrice={29_900} />);
    expect(html).toContain('<span class="sr-only">Giá bán </span>');
    expect(html).toContain('<span class="sr-only">Giá gốc </span>');
  });

  it("giá không hợp lệ làm hỏng render thay vì hiện số sai", () => {
    expect(() => renderToStaticMarkup(<PriceTag price={22_900.5} />)).toThrow(RangeError);
    expect(() => renderToStaticMarkup(<PriceTag price={-1} />)).toThrow(RangeError);
    expect(() => renderToStaticMarkup(<PriceTag price={Number.NaN} />)).toThrow(RangeError);
  });
});
