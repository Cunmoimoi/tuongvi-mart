"use client";

import Image from "next/image";
import {
  createVariantLoader,
  listVariants,
  sanitizeBlurDataUrl,
  type ImageAsset,
} from "@/lib/images/loader";
import { IMAGE_PRESETS, placeholderDimensions, type ImagePresetName } from "@/lib/images/presets";
import { cn } from "@/lib/cn";

export interface AppImageProps {
  /** Loại ảnh: quyết định tỉ lệ khung, `sizes`, cách vừa khung và ảnh giữ chỗ (UI_SPEC mục 6). */
  preset: ImagePresetName;
  /** Dữ liệu ảnh từ server. Thiếu hoặc chưa có bản của preset này ⇒ hiện ảnh giữ chỗ. */
  image?: ImageAsset | null | undefined;
  /** Mô tả ảnh. Bắt buộc; ảnh trang trí thì truyền chuỗi rỗng. */
  alt: string;
  /** Ảnh đầu trang (LCP), ví dụ banner đầu trang chủ: tải ưu tiên, không lazy. */
  priority?: boolean;
  /** Ghi đè `sizes` mặc định của preset khi bố cục khác lưới chuẩn (ví dụ lightbox). */
  sizes?: string;
  /** Class cho khung bọc (bo góc, kích thước...). */
  className?: string;
}

function isPositiveInt(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * Component ảnh DUY NHẤT cho ảnh nội dung (sản phẩm, banner, danh mục); không dùng `<img>` trần
 * (ESLint cấm). Khung luôn giữ đúng tỉ lệ của preset và thẻ ảnh luôn có `width`/`height`, nên
 * không giật bố cục (CLS). Ảnh thật đi qua custom loader chỉ chọn bản đã tạo sẵn, không qua bộ tối
 * ưu ảnh của Next.js (ARCHITECTURE mục 15).
 *
 * Hiện chưa có pipeline tạo bản ảnh (T2.2) nên mọi chỗ dùng truyền `image` rỗng và thấy ảnh giữ chỗ.
 */
export function AppImage({
  preset: presetName,
  image,
  alt,
  priority = false,
  sizes,
  className,
}: AppImageProps) {
  const preset = IMAGE_PRESETS[presetName];
  const variants = listVariants(image?.variants[presetName]);
  const frame = cn(
    "relative w-full overflow-hidden",
    preset.aspectClass,
    preset.backgroundClass,
    className,
  );
  const fit = preset.fit === "contain" ? "object-contain" : "object-cover";

  if (!image || variants.length === 0) {
    const { width, height } = placeholderDimensions(preset);
    return (
      <div className={frame}>
        <Image
          src={`/placeholders/${preset.placeholder}.svg`}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes ?? preset.sizes}
          unoptimized
          preload={priority}
          className={cn("h-full w-full", fit)}
        />
      </div>
    );
  }

  // Kích thước tự nhiên lấy từ database; sai thì dùng kích thước của preset để thẻ vẫn có width/height.
  const fallback = placeholderDimensions(preset);
  const width = isPositiveInt(image.width) ? image.width : fallback.width;
  const height = isPositiveInt(image.height) ? image.height : fallback.height;
  const blurDataURL = sanitizeBlurDataUrl(image.blurDataUrl);
  // `src` chỉ là đầu vào của loader, không bao giờ được tải: URL thật do loader chọn theo chiều
  // rộng yêu cầu. Cố ý KHÔNG đặt `src` bằng URL của một bản, vì next/image (chế độ dev) cảnh báo
  // "loader không dùng width" khi loader trả đúng chuỗi `src`, và điều đó xảy ra mỗi khi ảnh gốc
  // rộng hơn bản lớn nhất.
  const loaderSrc = `/variants/${presetName}`;

  return (
    <div className={frame}>
      <Image
        src={loaderSrc}
        loader={createVariantLoader(variants)}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes ?? preset.sizes}
        preload={priority}
        {...(blurDataURL ? { placeholder: "blur" as const, blurDataURL } : {})}
        className={cn("h-full w-full", fit)}
      />
    </div>
  );
}
