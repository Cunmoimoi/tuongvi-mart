import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuantityStepper } from "@/components/ui/quantity-stepper";

function render(props: Partial<React.ComponentProps<typeof QuantityStepper>> = {}) {
  return renderToStaticMarkup(
    <QuantityStepper label="Cà chua bi" value={2} onChange={() => undefined} {...props} />,
  );
}

/** Tìm thẻ <button> theo aria-label và cho biết có thuộc tính disabled không. */
function buttonByLabel(html: string, label: string): { found: boolean; disabled: boolean } {
  const match = html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`));
  return { found: Boolean(match), disabled: /\sdisabled(=""|\s|>)/.test(match?.[0] ?? "") };
}

describe("QuantityStepper", () => {
  it("nút tăng/giảm có aria-label nêu tên sản phẩm, nhóm có nhãn", () => {
    const html = render();
    expect(buttonByLabel(html, "Giảm số lượng Cà chua bi").found).toBe(true);
    expect(buttonByLabel(html, "Tăng số lượng Cà chua bi").found).toBe(true);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Số lượng Cà chua bi"');
  });

  it("hiện số lượng hiện tại", () => {
    expect(render({ value: 7 })).toMatch(/aria-live="polite"[^>]*>7</);
  });

  it("ở số lượng nhỏ nhất thì khóa nút giảm, nút tăng vẫn dùng được", () => {
    const html = render({ value: 1, min: 1 });
    expect(buttonByLabel(html, "Giảm số lượng Cà chua bi").disabled).toBe(true);
    expect(buttonByLabel(html, "Tăng số lượng Cà chua bi").disabled).toBe(false);
  });

  it("ở số lượng lớn nhất (tồn kho) thì khóa nút tăng", () => {
    const html = render({ value: 3, max: 3 });
    expect(buttonByLabel(html, "Tăng số lượng Cà chua bi").disabled).toBe(true);
    expect(buttonByLabel(html, "Giảm số lượng Cà chua bi").disabled).toBe(false);
  });

  it("min = 0 cho phép giảm từ 1 về 0", () => {
    const html = render({ value: 1, min: 0 });
    expect(buttonByLabel(html, "Giảm số lượng Cà chua bi").disabled).toBe(false);
  });

  it("giá trị ngoài giới hạn được ép về giới hạn khi hiển thị", () => {
    expect(render({ value: 99, max: 5 })).toMatch(/aria-live="polite"[^>]*>5</);
    expect(render({ value: 0, min: 1 })).toMatch(/aria-live="polite"[^>]*>1</);
    expect(render({ value: Number.NaN, min: 1 })).toMatch(/aria-live="polite"[^>]*>1</);
  });

  it("disabled khóa cả hai nút", () => {
    const html = render({ disabled: true });
    expect(buttonByLabel(html, "Giảm số lượng Cà chua bi").disabled).toBe(true);
    expect(buttonByLabel(html, "Tăng số lượng Cà chua bi").disabled).toBe(true);
  });

  it("loading khóa cả hai nút và báo aria-busy", () => {
    const html = render({ loading: true });
    expect(buttonByLabel(html, "Giảm số lượng Cà chua bi").disabled).toBe(true);
    expect(buttonByLabel(html, "Tăng số lượng Cà chua bi").disabled).toBe(true);
    expect(html).toContain('aria-busy="true"');
  });

  it("lỗi được đọc ra (role=alert) và gắn vào nhóm bằng aria-describedby", () => {
    const html = render({ error: "Chỉ còn 2 sản phẩm" });
    expect(html).toContain('role="alert"');
    expect(html).toContain("Chỉ còn 2 sản phẩm");
    expect(html).toMatch(/role="group"[^>]*aria-describedby="[^"]+"/);
  });

  it("hết hàng (max = 0) khóa cả hai nút", () => {
    const html = render({ value: 0, min: 0, max: 0 });
    expect(buttonByLabel(html, "Giảm số lượng Cà chua bi").disabled).toBe(true);
    expect(buttonByLabel(html, "Tăng số lượng Cà chua bi").disabled).toBe(true);
  });
});
