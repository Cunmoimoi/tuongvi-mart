import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Icon, type IconName } from "@/components/ui/icons";

const NAMES: IconName[] = [
  "x",
  "check",
  "minus",
  "plus",
  "chevron-down",
  "chevron-right",
  "spinner",
  "alert-circle",
  "check-circle",
  "info",
  "trash",
  "cart",
];

describe("Icon", () => {
  it.each(NAMES)("%s: svg trang trí, nét 1,75, dùng currentColor", (name) => {
    const html = renderToStaticMarkup(<Icon name={name} />);
    expect(html).toMatch(/^<svg /);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('stroke-width="1.75"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain('width="20"');
    expect(html).toContain('height="20"');
  });

  it("nhận size và className", () => {
    const html = renderToStaticMarkup(<Icon name="cart" size={22} className="text-primary" />);
    expect(html).toContain('width="22"');
    expect(html).toContain("text-primary");
  });
});
