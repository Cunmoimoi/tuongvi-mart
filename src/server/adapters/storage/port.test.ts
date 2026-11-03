import { describe, expect, it } from "vitest";
import {
  assertKnownBucket,
  assertPublicBucket,
  assertSafeObjectPath,
  assertUploadBucket,
  INCOMING_UPLOAD_LIMITS,
  STORAGE_BUCKETS,
} from "@/server/adapters/storage/port";

describe("bucket", () => {
  it("incoming riêng tư, media công khai (ARCHITECTURE mục 15)", () => {
    expect(STORAGE_BUCKETS).toStrictEqual({
      incoming: { visibility: "private" },
      media: { visibility: "public" },
    });
  });

  it("giới hạn tải lên: 12 MB, chỉ JPEG/PNG/WebP (không SVG)", () => {
    expect(INCOMING_UPLOAD_LIMITS.maxBytes).toBe(12 * 1024 * 1024);
    expect([...INCOMING_UPLOAD_LIMITS.mimeTypes].sort()).toStrictEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });

  it("chỉ incoming nhận file tải lên", () => {
    expect(() => assertUploadBucket("incoming")).not.toThrow();
    expect(() => assertUploadBucket("media")).toThrow(RangeError);
  });

  it("chỉ media có URL công khai", () => {
    expect(() => assertPublicBucket("media")).not.toThrow();
    expect(() => assertPublicBucket("incoming")).toThrow(RangeError);
  });

  it.each(["", "Incoming", "normalized", "constructor", "__proto__", "toString"])(
    "bucket lạ %j bị từ chối",
    (bucket) => {
      expect(() => assertKnownBucket(bucket)).toThrow(RangeError);
      expect(() => assertPublicBucket(bucket)).toThrow(RangeError);
      expect(() => assertUploadBucket(bucket)).toThrow(RangeError);
    },
  );
});

describe("assertSafeObjectPath", () => {
  it.each(["a", "images/a.jpg", "products/2026/10/0b9f-12_ab.webp", "a.b.c", "A1/b-2/c_3"])(
    "chấp nhận %j",
    (path) => {
      expect(() => assertSafeObjectPath(path)).not.toThrow();
    },
  );

  it.each([
    "",
    ".",
    "..",
    "../a.jpg",
    "a/../b.jpg",
    "a/..",
    "/a.jpg",
    "a/",
    "a//b.jpg",
    "a/./b.jpg",
    ".hidden",
    "-a.jpg",
    "a\\b.jpg",
    "a b.jpg",
    "a%2e%2e/b.jpg",
    "a\u0000.jpg",
    "ảnh.jpg",
    "a?token=x",
    "a#b",
    `${"a".repeat(256)}`,
    Array.from({ length: 11 }, () => "a").join("/"),
  ])("từ chối %j", (path) => {
    expect(() => assertSafeObjectPath(path)).toThrow(RangeError);
  });

  it("thông điệp lỗi không lặp lại đường dẫn nhận được", () => {
    let message = "";
    try {
      assertSafeObjectPath("../bi-mat/khoa.pem");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toBe("");
    expect(message).not.toContain("bi-mat");
  });
});
