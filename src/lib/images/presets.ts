/**
 * Preset ảnh: nguồn duy nhất cho chiều rộng các bản, tỉ lệ khung và thuộc tính `sizes`.
 * Số liệu theo docs/UI_SPEC.md mục 6 và docs/ARCHITECTURE.md mục 15. `AppImage` và custom loader
 * chỉ đọc từ đây, không viết tay `sizes` hay chiều rộng ở chỗ dùng.
 *
 * Pipeline tạo các bản ảnh chưa có (T2.2); hiện chỉ có ảnh giữ chỗ.
 */

export const IMAGE_PRESET_NAMES = [
  "product-card",
  "product-thumb",
  "product-detail",
  "banner-desktop",
  "banner-mobile",
  "category-icon",
] as const;

export type ImagePresetName = (typeof IMAGE_PRESET_NAMES)[number];

/** Ảnh giữ chỗ trong `public/placeholders/`. */
export type PlaceholderKind = "product" | "banner-desktop" | "banner-mobile" | "category";

export interface ImagePreset {
  name: ImagePresetName;
  /** Các chiều rộng đã tạo sẵn (px), tăng dần. */
  widths: readonly number[];
  /** Tỉ lệ khung hình rộng : cao. */
  aspect: { readonly width: number; readonly height: number };
  /** Class Tailwind đặt tỉ lệ khung (viết nguyên chuỗi để Tailwind thấy được). */
  aspectClass: string;
  /** `contain`: không cắt sản phẩm, nền trắng. `cover`: banner, có thể cắt. */
  fit: "contain" | "cover";
  /** Class nền của khung ảnh: trắng cho ảnh sản phẩm (contain), trong suốt cho icon, xám nhạt cho banner. */
  backgroundClass: string;
  placeholder: PlaceholderKind;
  /** Giá trị mặc định của thuộc tính `sizes`. */
  sizes: string;
}

/**
 * Một dòng của bảng số cột lưới ở UI_SPEC mục 4.4.
 * `chromePx` là phần chiều ngang viewport KHÔNG thuộc vùng lưới (sidebar 256 + padding hai bên
 * của vùng nội dung); ước lượng, vì `sizes` chỉ là gợi ý cho trình duyệt chọn bản ảnh.
 */
export interface GridColumnsRow {
  minViewport: number;
  columns: number;
  chromePx: number;
}

/** Bảng số cột lưới sản phẩm (UI_SPEC 4.4), xếp từ viewport rộng nhất tới hẹp nhất. */
export const PRODUCT_GRID_COLUMNS: readonly GridColumnsRow[] = [
  { minViewport: 1440, columns: 6, chromePx: 328 }, // có sidebar 256 + padding 2×36
  { minViewport: 1280, columns: 5, chromePx: 328 },
  { minViewport: 1024, columns: 5, chromePx: 48 }, // ẩn sidebar, padding 2×24
  { minViewport: 768, columns: 4, chromePx: 48 },
  { minViewport: 600, columns: 3, chromePx: 48 },
  { minViewport: 0, columns: 2, chromePx: 24 }, // lề 12
];

/** Khoảng cách ngang giữa các thẻ trong lưới (UI_SPEC 4.4). */
export const PRODUCT_GRID_GAP_PX = 8;

/**
 * Sinh `sizes` từ bảng số cột lưới: mỗi khoảng viewport một phần tử
 * `(min-width: Npx) calc((100vw - Xpx) / cột)`; dòng cuối (viewport hẹp nhất) không có điều kiện.
 */
export function buildGridSizes(
  rows: readonly GridColumnsRow[] = PRODUCT_GRID_COLUMNS,
  gapPx: number = PRODUCT_GRID_GAP_PX,
): string {
  if (rows.length === 0) {
    throw new RangeError("Bảng số cột lưới không được rỗng");
  }
  return rows
    .map((row, index) => {
      const used = row.chromePx + (row.columns - 1) * gapPx;
      const width = `calc((100vw - ${used}px) / ${row.columns})`;
      return index === rows.length - 1 ? width : `(min-width: ${row.minViewport}px) ${width}`;
    })
    .join(", ");
}

export const IMAGE_PRESETS: Readonly<Record<ImagePresetName, ImagePreset>> = {
  "product-card": {
    name: "product-card",
    widths: [320, 480],
    aspect: { width: 1, height: 1 },
    aspectClass: "aspect-square",
    fit: "contain",
    backgroundClass: "bg-white",
    placeholder: "product",
    sizes: buildGridSizes(),
  },
  "product-thumb": {
    name: "product-thumb",
    widths: [160],
    aspect: { width: 1, height: 1 },
    aspectClass: "aspect-square",
    fit: "contain",
    backgroundClass: "bg-white",
    placeholder: "product",
    // Ảnh nhỏ trong giỏ/đơn (48px) và thumbnail gallery (78px).
    sizes: "80px",
  },
  "product-detail": {
    name: "product-detail",
    widths: [800, 1200],
    aspect: { width: 1, height: 1 },
    aspectClass: "aspect-square",
    fit: "contain",
    backgroundClass: "bg-white",
    placeholder: "product",
    // Gallery: ảnh chính tối đa 480 trên desktop, toàn chiều rộng trên mobile.
    sizes: "(min-width: 1024px) 480px, 100vw",
  },
  "banner-desktop": {
    name: "banner-desktop",
    widths: [1040, 1560],
    aspect: { width: 39, height: 10 },
    aspectClass: "aspect-[39/10]",
    fit: "cover",
    backgroundClass: "bg-page-bg",
    placeholder: "banner-desktop",
    // Vùng nội dung bên phải sidebar 256 (≥ 1280), toàn chiều rộng ở nhỏ hơn.
    sizes: "(min-width: 1280px) calc(100vw - 256px), 100vw",
  },
  "banner-mobile": {
    name: "banner-mobile",
    widths: [480, 750],
    aspect: { width: 16, height: 9 },
    aspectClass: "aspect-video",
    fit: "cover",
    backgroundClass: "bg-page-bg",
    placeholder: "banner-mobile",
    sizes: "100vw",
  },
  "category-icon": {
    name: "category-icon",
    widths: [120, 240],
    aspect: { width: 1, height: 1 },
    aspectClass: "aspect-square",
    fit: "contain",
    backgroundClass: "bg-transparent",
    placeholder: "category",
    // Icon từ 36px (sidebar) tới 110px (khối khuyến mãi).
    sizes: "112px",
  },
};

/** Mọi chiều rộng của mọi preset, tăng dần, không trùng: dùng cho `images.deviceSizes`/`imageSizes`. */
export function allPresetWidths(): number[] {
  const widths = new Set<number>();
  for (const preset of Object.values(IMAGE_PRESETS)) {
    for (const width of preset.widths) {
      widths.add(width);
    }
  }
  return [...widths].sort((a, b) => a - b);
}

/** Kích thước tự nhiên của ảnh giữ chỗ (rộng × cao) = bản lớn nhất của preset. */
export function placeholderDimensions(preset: ImagePreset): { width: number; height: number } {
  const width = preset.widths[preset.widths.length - 1];
  if (width === undefined) {
    throw new RangeError(`Preset ${preset.name} không có chiều rộng nào`);
  }
  return {
    width,
    height: Math.round((width * preset.aspect.height) / preset.aspect.width),
  };
}
