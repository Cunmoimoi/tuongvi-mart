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
