import "server-only";
import { assertFakeAdapterAllowed } from "@/server/adapters/select";
import {
  assertKnownBucket,
  assertPublicBucket,
  assertSafeObjectPath,
  assertUploadBucket,
  type SignedUpload,
  type StorageBucket,
  type StoragePort,
} from "@/server/adapters/storage/port";
import type { AppEnv } from "@/server/env";
import { systemClock, type Clock } from "@/server/lib/clock";
import { randomToken } from "@/server/lib/tokens";

// ADAPTER GIẢ, chỉ nạp được khi APP_ENV là local hoặc test. Giữ danh sách file trong bộ nhớ của
// tiến trình, không gọi Supabase. URL dùng scheme `memory://` để không ai nhầm là URL thật.

const ID = "storage/memory";
// Signed upload URL của Supabase có hạn 2 giờ; giữ cùng giá trị cho giống thật.
const SIGNED_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000;

export interface MemoryStorageOptions {
  readonly appEnv: AppEnv;
  readonly clock?: Clock;
}

export interface MemoryStorage extends StoragePort {
  /** Chỉ có ở adapter giả, để test kiểm file còn hay đã xóa. */
  has(bucket: StorageBucket, path: string): boolean;
}

export function createMemoryStorage(options: MemoryStorageOptions): MemoryStorage {
  assertFakeAdapterAllowed(options.appEnv, ID);
  const clock = options.clock ?? systemClock;
  const objects = new Set<string>();
  const key = (bucket: StorageBucket, path: string) => `${bucket}/${path}`;

  return {
    provider: "memory",

    async createSignedUpload({ bucket, path }): Promise<SignedUpload> {
      assertUploadBucket(bucket);
      assertSafeObjectPath(path);
      const token = randomToken(32);
      objects.add(key(bucket, path));
      return {
        bucket,
        path,
        url: `memory://${bucket}/${path}?token=${token}`,
        token,
        expiresAt: new Date(clock.now().getTime() + SIGNED_UPLOAD_TTL_MS),
      };
    },

    getPublicUrl({ bucket, path }) {
      assertPublicBucket(bucket);
      assertSafeObjectPath(path);
      return `memory://${bucket}/${path}`;
    },

    async delete({ bucket, paths }) {
      assertKnownBucket(bucket);
      // Kiểm hết trước khi xóa: một đường dẫn sai thì không xóa gì cả.
      paths.forEach(assertSafeObjectPath);
      for (const path of paths) {
        objects.delete(key(bucket, path));
      }
    },

    has(bucket, path) {
      return objects.has(key(bucket, path));
    },
  };
}
