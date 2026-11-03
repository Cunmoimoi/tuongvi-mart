import "server-only";

/**
 * Port lưu trữ file (ARCHITECTURE mục 9 và 15, SECURITY T19). Có sẵn hai bucket cho pipeline ảnh
 * của T2.2 (pipeline chưa làm ở đây):
 * - `incoming` (riêng tư): ảnh gốc admin tải thẳng lên bằng signed upload URL, xóa sau khi xử lý.
 * - `media` (công khai): chỉ các bản WebP do server tạo ra, không bao giờ là file người dùng tải lên.
 * Bucket `normalized` (riêng tư) và các thao tác `download`, `putPrivate`, `putPublic` thêm cùng
 * pipeline ở T2.2.
 */

export const STORAGE_BUCKETS = {
  incoming: { visibility: "private" },
  media: { visibility: "public" },
} as const;

export type StorageBucket = keyof typeof STORAGE_BUCKETS;
export type PublicBucket = {
  [B in StorageBucket]: (typeof STORAGE_BUCKETS)[B]["visibility"] extends "public" ? B : never;
}[StorageBucket];
/** Bucket duy nhất nhận file tải thẳng từ trình duyệt. */
export type UploadBucket = "incoming";

/** Giới hạn của bucket `incoming` (ARCHITECTURE mục 15); bucket trên Supabase đặt cùng giá trị. */
export const INCOMING_UPLOAD_LIMITS = {
  maxBytes: 12 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export interface SignedUpload {
  readonly bucket: UploadBucket;
  readonly path: string;
  /** URL tải lên có chứa token: không ghi log, chỉ trả cho đúng admin đã xin. */
  readonly url: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export interface StoragePort {
  readonly provider: string;
  createSignedUpload(input: { bucket: UploadBucket; path: string }): Promise<SignedUpload>;
  /** Chỉ cho bucket công khai; bucket riêng tư không bao giờ có URL công khai. */
  getPublicUrl(input: { bucket: PublicBucket; path: string }): string;
  /** Xóa file không tồn tại thì bỏ qua (dọn file mồ côi chạy lại được). */
  delete(input: { bucket: StorageBucket; paths: readonly string[] }): Promise<void>;
}

// Kiểm tra dùng chung cho MỌI adapter lưu trữ, gọi trước khi chạm vào bucket. Lỗi không lặp lại
// giá trị nhận được.

export function assertKnownBucket(bucket: string): asserts bucket is StorageBucket {
  if (!Object.hasOwn(STORAGE_BUCKETS, bucket)) {
    throw new RangeError("Bucket không có trong danh sách STORAGE_BUCKETS");
  }
}

export function assertUploadBucket(bucket: string): asserts bucket is UploadBucket {
  assertKnownBucket(bucket);
  if (bucket !== "incoming") {
    throw new RangeError("Chỉ bucket incoming nhận file tải lên trực tiếp");
  }
}

export function assertPublicBucket(bucket: string): asserts bucket is PublicBucket {
  assertKnownBucket(bucket);
  if (STORAGE_BUCKETS[bucket].visibility !== "public") {
    throw new RangeError("Bucket riêng tư không có URL công khai");
  }
}

const MAX_PATH_LENGTH = 255;
const MAX_PATH_SEGMENTS = 10;
// Mỗi đoạn bắt đầu bằng chữ hoặc số (không có `.`, `..`, file ẩn), chỉ gồm chữ không dấu, số, `.`,
// `_`, `-`. Đường dẫn do server sinh (id ảnh) nên không cần nhận ký tự nào khác.
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Đường dẫn object trong bucket: tương đối, không thoát ra ngoài, không ký tự lạ. */
export function assertSafeObjectPath(path: string): void {
  const segments = path.split("/");
  const safe =
    path.length > 0 &&
    path.length <= MAX_PATH_LENGTH &&
    segments.length <= MAX_PATH_SEGMENTS &&
    !path.includes("..") &&
    segments.every((segment) => SAFE_SEGMENT.test(segment));
  if (!safe) {
    throw new RangeError("Đường dẫn object không hợp lệ");
  }
}
