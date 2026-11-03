import "server-only";
import { assertConfigured } from "@/server/adapters/select";
import type { StoragePort } from "@/server/adapters/storage/port";
import { NotImplementedError } from "@/server/lib/errors";

// Adapter Supabase Storage: chưa làm (làm cùng pipeline ảnh ở T2.2, đối chiếu tài liệu Supabase
// chính thức). Cho tới lúc đó mọi phương thức ném NotImplementedError: không cấp URL tải lên nào,
// không trả URL công khai nào.

export interface SupabaseStorageConfig {
  readonly supabaseUrl: string;
  /** Service key: chỉ dùng ở server, không bao giờ nằm trong lỗi hay log. */
  readonly secretKey: string;
  readonly fetch: typeof fetch;
}

const ID = "storage/supabase";

export function createSupabaseStorage(config: SupabaseStorageConfig): StoragePort {
  assertConfigured(config, ID);
  return {
    provider: "supabase",
    async createSignedUpload() {
      throw new NotImplementedError(`${ID}.createSignedUpload`);
    },
    getPublicUrl() {
      throw new NotImplementedError(`${ID}.getPublicUrl`);
    },
    async delete() {
      throw new NotImplementedError(`${ID}.delete`);
    },
  };
}
