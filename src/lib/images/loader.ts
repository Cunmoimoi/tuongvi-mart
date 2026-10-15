import type { ImagePresetName } from "@/lib/images/presets";

/**
 * Dữ liệu ảnh mà giao diện nhận (khớp DATA_MODEL mục 10.1). `variants` có dạng
 * `{ "<preset>": { "<chiều rộng>": "<url>" } }`; các URL phải được server đổi sang URL công khai
 * đầy đủ (hoặc đường dẫn bắt đầu bằng `/`) TRƯỚC khi đưa vào đây: giao diện không biết bucket.
 */
export type ImageVariants = Partial<Record<ImagePresetName, Readonly<Record<string, string>>>>;

export interface ImageAsset {
  /** Kích thước tự nhiên (px) của ảnh gốc đã chuẩn hóa. */
  width: number;
  height: number;
  variants: ImageVariants;
  /** `data:image/...;base64,...` làm placeholder mờ khi tải. */
  blurDataUrl?: string | null | undefined;
}

export interface Variant {
  width: number;
  url: string;
}

// Chỉ nhận URL tuyệt đối http(s) hoặc đường dẫn gốc `/...` (không nhận `//host`, `javascript:`,
// `data:`...): dữ liệu ảnh đến từ database nên không tin tuyệt đối.
const SAFE_URL = /^(https?:\/\/[^\s"'()<>\\]+|\/(?!\/)[^\s"'()<>\\]*)$/;
const BLUR_DATA_URL = /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

export function isSafeImageUrl(value: unknown): value is string {
  return typeof value === "string" && SAFE_URL.test(value);
}

/** Chỉ trả `blurDataUrl` nếu đúng định dạng ảnh base64; sai thì bỏ (không có placeholder mờ). */
export function sanitizeBlurDataUrl(value: string | null | undefined): string | undefined {
  return typeof value === "string" && BLUR_DATA_URL.test(value) ? value : undefined;
}

/** Danh sách bản hợp lệ của một preset, tăng dần theo chiều rộng. Bỏ khóa/URL không hợp lệ. */
export function listVariants(entry: Readonly<Record<string, string>> | undefined): Variant[] {
  if (!entry) {
    return [];
  }
  const variants: Variant[] = [];
  for (const [key, url] of Object.entries(entry)) {
    const width = Number(key);
    if (Number.isSafeInteger(width) && width > 0 && isSafeImageUrl(url)) {
      variants.push({ width, url });
    }
  }
  return variants.sort((a, b) => a.width - b.width);
}

/**
 * Chọn bản có chiều rộng nhỏ nhất KHÔNG nhỏ hơn `requestedWidth` (ARCHITECTURE mục 15); không
 * có bản đủ lớn thì lấy bản lớn nhất (không bao giờ phóng to). `variants` rỗng thì trả `undefined`.
 */
export function pickVariant(
  variants: readonly Variant[],
  requestedWidth: number,
): Variant | undefined {
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  return sorted.find((variant) => variant.width >= requestedWidth) ?? sorted[sorted.length - 1];
}

/**
 * Custom loader cho `next/image` trên một bộ bản đã tạo sẵn. Không qua bộ tối ưu ảnh của
 * Next.js/Vercel (ARCHITECTURE mục 15): chỉ trả URL của bản có sẵn.
 */
export function createVariantLoader(variants: readonly Variant[]) {
  if (variants.length === 0) {
    throw new RangeError("Cần ít nhất một bản ảnh để tạo loader");
  }
  return ({ width }: { src: string; width: number; quality?: number | undefined }): string => {
    const variant = pickVariant(variants, width);
    if (!variant) {
      throw new RangeError("Không chọn được bản ảnh");
    }
    return variant.url;
  };
}
