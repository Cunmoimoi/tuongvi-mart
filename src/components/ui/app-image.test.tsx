import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppImage } from "@/components/ui/app-image";
import type { ImageAsset } from "@/lib/images/loader";
import {
  IMAGE_PRESET_NAMES,
  IMAGE_PRESETS,
  placeholderDimensions,
  type ImagePresetName,
} from "@/lib/images/presets";

function attr(html: string, name: string): string | undefined {
  return html.match(new RegExp(`<img[^>]*?\\s${name}="([^"]*)"`))?.[1];
}

const REAL_CARD: ImageAsset = {
  width: 640,
  height: 640,
  variants: {
    "product-card": {
      "320": "https://cdn.example.test/media/a-320.webp",
      "480": "https://cdn.example.test/media/a-480.webp",
    },
  },
};

/** Ảnh có bản cho MỌI preset: để kiểm tra thuộc tính `sizes` (chỉ có khi có srcset). */
const REAL_ALL: ImageAsset = {
  width: 1200,
  height: 1200,
  variants: Object.fromEntries(
    IMAGE_PRESET_NAMES.map((name) => [
      name,
      Object.fromEntries(
        IMAGE_PRESETS[name].widths.map((width) => [
          String(width),
          `https://cdn.example.test/media/${name}-${width}.webp`,
        ]),
      ),
    ]),
  ),
};

describe("AppImage: ảnh giữ chỗ", () => {
  it.each(IMAGE_PRESET_NAMES)("preset %s luôn có width và height khớp tỉ lệ preset", (name) => {
    const html = renderToStaticMarkup(<AppImage preset={name} alt="Thử" />);
    const width = Number(attr(html, "width"));
    const height = Number(attr(html, "height"));
    const preset = IMAGE_PRESETS[name];

    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect({ width, height }).toStrictEqual(placeholderDimensions(preset));
    expect(width / height).toBeCloseTo(preset.aspect.width / preset.aspect.height, 1);
  });

  it("dùng ảnh giữ chỗ trong /placeholders, không phải ảnh ngoài", () => {
    const html = renderToStaticMarkup(<AppImage preset="product-card" alt="Thử" />);
    expect(attr(html, "src")).toBe("/placeholders/product.svg");
  });

  it("image null hoặc chưa có bản của preset này thì vẫn hiện ảnh giữ chỗ", () => {
    const nullImage = renderToStaticMarkup(
      <AppImage preset="product-card" image={null} alt="Thử" />,
    );
    const wrongPreset = renderToStaticMarkup(
      <AppImage preset="banner-desktop" image={REAL_CARD} alt="Thử" />,
    );
    expect(attr(nullImage, "src")).toBe("/placeholders/product.svg");
    expect(attr(wrongPreset, "src")).toBe("/placeholders/banner-desktop.svg");
  });

  it("alt được chuyển nguyên, kể cả chuỗi rỗng cho ảnh trang trí", () => {
    const html = renderToStaticMarkup(<AppImage preset="product-card" alt="Cà chua bi" />);
    expect(attr(html, "alt")).toBe("Cà chua bi");
    const decorative = renderToStaticMarkup(<AppImage preset="category-icon" alt="" />);
    expect(attr(decorative, "alt")).toBe("");
  });

  it("ảnh sản phẩm contain trên nền trắng, banner cover", () => {
    const product = renderToStaticMarkup(<AppImage preset="product-card" alt="Thử" />);
    const banner = renderToStaticMarkup(<AppImage preset="banner-desktop" alt="Thử" />);
    expect(product).toContain("object-contain");
    expect(product).toContain("bg-white");
    expect(banner).toContain("object-cover");
  });

  it("khung giữ đúng tỉ lệ preset để không giật bố cục", () => {
    for (const name of IMAGE_PRESET_NAMES as readonly ImagePresetName[]) {
      const html = renderToStaticMarkup(<AppImage preset={name} alt="Thử" />);
      expect(html).toContain(IMAGE_PRESETS[name].aspectClass);
    }
  });
});

describe("AppImage: ảnh có bản", () => {
  it.each(IMAGE_PRESET_NAMES)("preset %s đặt đúng sizes của preset", (name) => {
    const html = renderToStaticMarkup(<AppImage preset={name} image={REAL_ALL} alt="Thử" />);
    expect(attr(html, "sizes")).toBe(IMAGE_PRESETS[name].sizes);
  });

  it("sizes truyền vào ghi đè sizes của preset", () => {
    const html = renderToStaticMarkup(
      <AppImage preset="product-detail" image={REAL_ALL} alt="Thử" sizes="100vw" />,
    );
    expect(attr(html, "sizes")).toBe("100vw");
  });

  it.each(IMAGE_PRESET_NAMES)("preset %s: srcset chỉ trỏ vào bản của đúng preset đó", (name) => {
    const html = renderToStaticMarkup(<AppImage preset={name} image={REAL_ALL} alt="Thử" />);
    const srcset = attr(html, "srcSet") ?? attr(html, "srcset") ?? "";
    // Cỡ nào được đưa vào srcset do `images.deviceSizes` của next.config quyết định (test này chạy
    // ngoài Next nên dùng mặc định); ở đây chỉ kiểm: có bản của preset, không lẫn preset khác.
    const own = IMAGE_PRESETS[name].widths.map((width) => `/media/${name}-${width}.webp`);
    expect(own.some((url) => srcset.includes(url))).toBe(true);
    for (const other of IMAGE_PRESET_NAMES.filter((candidate) => candidate !== name)) {
      expect(srcset).not.toContain(`/media/${other}-`);
    }
  });

  it("dùng kích thước tự nhiên của ảnh cho width/height", () => {
    const html = renderToStaticMarkup(
      <AppImage preset="product-card" image={REAL_CARD} alt="Thử" />,
    );
    expect(attr(html, "width")).toBe("640");
    expect(attr(html, "height")).toBe("640");
  });

  it("kích thước ảnh sai thì dùng kích thước preset, thẻ vẫn có width/height", () => {
    const bad: ImageAsset = { ...REAL_CARD, width: 0, height: -5 };
    const html = renderToStaticMarkup(<AppImage preset="product-card" image={bad} alt="Thử" />);
    expect(attr(html, "width")).toBe("480");
    expect(attr(html, "height")).toBe("480");
  });

  it("srcset chỉ trỏ vào các bản đã tạo sẵn, không qua bộ tối ưu của Next.js", () => {
    const html = renderToStaticMarkup(
      <AppImage preset="product-card" image={REAL_CARD} alt="Thử" />,
    );
    const srcset = attr(html, "srcSet") ?? attr(html, "srcset") ?? "";
    expect(srcset).toContain("https://cdn.example.test/media/a-320.webp");
    expect(srcset).toContain("https://cdn.example.test/media/a-480.webp");
    expect(html).not.toContain("/_next/image");
    // Thuộc tính src là URL bản thật (loader trả), không phải chuỗi đầu vào giả của loader.
    expect(attr(html, "src")).toMatch(/^https:\/\/cdn\.example\.test\/media\/a-(320|480)\.webp$/);
  });

  it("URL không an toàn trong variants bị bỏ: rơi về ảnh giữ chỗ", () => {
    const unsafe: ImageAsset = {
      ...REAL_CARD,
      variants: { "product-card": { "320": "javascript:alert(1)" } },
    };
    const html = renderToStaticMarkup(<AppImage preset="product-card" image={unsafe} alt="Thử" />);
    expect(attr(html, "src")).toBe("/placeholders/product.svg");
  });

  it("ảnh tải ưu tiên không lazy", () => {
    const html = renderToStaticMarkup(<AppImage preset="banner-desktop" alt="Thử" priority />);
    expect(html).not.toContain('loading="lazy"');
  });

  it("ảnh thường lazy", () => {
    const html = renderToStaticMarkup(
      <AppImage preset="product-card" image={REAL_CARD} alt="Thử" />,
    );
    expect(attr(html, "loading")).toBe("lazy");
  });
});
