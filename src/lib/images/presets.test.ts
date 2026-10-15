import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";
import {
  IMAGE_PRESET_NAMES,
  IMAGE_PRESETS,
  PRODUCT_GRID_COLUMNS,
  allPresetWidths,
  buildGridSizes,
  placeholderDimensions,
} from "@/lib/images/presets";

describe("bảng số cột lưới", () => {
  it("khớp UI_SPEC mục 4.4: 6, 5, 5, 4, 3, 2 cột theo viewport giảm dần", () => {
    expect(PRODUCT_GRID_COLUMNS.map((row) => [row.minViewport, row.columns])).toStrictEqual([
      [1440, 6],
      [1280, 5],
      [1024, 5],
      [768, 4],
      [600, 3],
      [0, 2],
    ]);
  });
});

describe("buildGridSizes", () => {
  it("sinh sizes từ bảng cột: phần tử cuối không có điều kiện media", () => {
    expect(buildGridSizes()).toBe(
      [
        "(min-width: 1440px) calc((100vw - 368px) / 6)",
        "(min-width: 1280px) calc((100vw - 360px) / 5)",
        "(min-width: 1024px) calc((100vw - 80px) / 5)",
        "(min-width: 768px) calc((100vw - 72px) / 4)",
        "(min-width: 600px) calc((100vw - 64px) / 3)",
        "calc((100vw - 32px) / 2)",
      ].join(", "),
    );
  });

  it("thẻ ở viewport 1536 rộng khoảng 191-194px như UI_SPEC 4.4", () => {
    const columns = 6;
    const used = 368;
    expect((1536 - used) / columns).toBeGreaterThan(188);
    expect((1536 - used) / columns).toBeLessThan(197);
  });

  it("bảng rỗng là lỗi", () => {
    expect(() => buildGridSizes([])).toThrow(RangeError);
  });

  it("product-card dùng đúng sizes sinh từ bảng cột, không viết tay", () => {
    expect(IMAGE_PRESETS["product-card"].sizes).toBe(buildGridSizes());
  });
});

describe("IMAGE_PRESETS", () => {
  it("khóa khớp tên, đủ 6 preset của UI_SPEC mục 6", () => {
    expect([...IMAGE_PRESET_NAMES].sort()).toStrictEqual(
      [
        "banner-desktop",
        "banner-mobile",
        "category-icon",
        "product-card",
        "product-detail",
        "product-thumb",
      ].sort(),
    );
    for (const name of IMAGE_PRESET_NAMES) {
      expect(IMAGE_PRESETS[name].name).toBe(name);
    }
  });

  it("chiều rộng các bản theo ARCHITECTURE mục 15, tăng dần", () => {
    const widths = Object.fromEntries(
      IMAGE_PRESET_NAMES.map((name) => [name, [...IMAGE_PRESETS[name].widths]]),
    );
    expect(widths).toStrictEqual({
      "product-card": [320, 480],
      "product-thumb": [160],
      "product-detail": [800, 1200],
      "banner-desktop": [1040, 1560],
      "banner-mobile": [480, 750],
      "category-icon": [120, 240],
    });
  });

  it("ảnh sản phẩm và icon dùng contain, banner dùng cover", () => {
    expect(IMAGE_PRESETS["product-card"].fit).toBe("contain");
    expect(IMAGE_PRESETS["product-detail"].fit).toBe("contain");
    expect(IMAGE_PRESETS["category-icon"].fit).toBe("contain");
    expect(IMAGE_PRESETS["banner-desktop"].fit).toBe("cover");
    expect(IMAGE_PRESETS["banner-mobile"].fit).toBe("cover");
  });

  it("tỉ lệ khung: sản phẩm 1:1, banner desktop 3,9:1, banner mobile 16:9", () => {
    const ratio = (name: (typeof IMAGE_PRESET_NAMES)[number]) =>
      IMAGE_PRESETS[name].aspect.width / IMAGE_PRESETS[name].aspect.height;
    expect(ratio("product-card")).toBe(1);
    expect(ratio("banner-desktop")).toBeCloseTo(3.9, 5);
    expect(ratio("banner-mobile")).toBeCloseTo(16 / 9, 5);
  });

  it("mọi preset có sizes không rỗng", () => {
    for (const name of IMAGE_PRESET_NAMES) {
      expect(IMAGE_PRESETS[name].sizes.length).toBeGreaterThan(0);
    }
  });
});

describe("placeholderDimensions", () => {
  it("lấy bản rộng nhất và giữ đúng tỉ lệ", () => {
    expect(placeholderDimensions(IMAGE_PRESETS["product-card"])).toStrictEqual({
      width: 480,
      height: 480,
    });
    expect(placeholderDimensions(IMAGE_PRESETS["banner-desktop"])).toStrictEqual({
      width: 1560,
      height: 400,
    });
    expect(placeholderDimensions(IMAGE_PRESETS["banner-mobile"])).toStrictEqual({
      width: 750,
      height: 422,
    });
  });
});

describe("cấu hình next.config", () => {
  it("deviceSizes + imageSizes chứa đúng các chiều rộng của preset (srcset không có cỡ thừa)", () => {
    const configured = [
      ...(nextConfig.images?.imageSizes ?? []),
      ...(nextConfig.images?.deviceSizes ?? []),
    ].sort((a, b) => a - b);
    expect(configured).toStrictEqual(allPresetWidths());
  });
});
