import "server-only";
import {
  requireSetting,
  selectAdapter,
  type AdapterDeps,
  type AdapterRegistry,
} from "@/server/adapters/select";
import { createMemoryStorage } from "@/server/adapters/storage/fakes/memory";
import type { StoragePort } from "@/server/adapters/storage/port";
import { createSupabaseStorage } from "@/server/adapters/storage/supabase";
import { env, type Env } from "@/server/env";

// Nơi DUY NHẤT chọn adapter lưu trữ (ARCHITECTURE mục 9). Code nghiệp vụ gọi `getStorage()`; adapter
// giả trong `fakes/` chỉ được import ở đây và trong test (ESLint `local/no-fake-adapter-import`).

export type StorageAdapterEnv = Pick<
  Env,
  "APP_ENV" | "STORAGE_PROVIDER" | "SUPABASE_URL" | "SUPABASE_SECRET_KEY"
>;

export const STORAGE_ADAPTERS: AdapterRegistry<"storage", StorageAdapterEnv, StoragePort> = {
  supabase: {
    status: "not-implemented",
    create: (config, deps) =>
      createSupabaseStorage({
        supabaseUrl: requireSetting(config.SUPABASE_URL, "SUPABASE_URL", "storage/supabase"),
        secretKey: requireSetting(
          config.SUPABASE_SECRET_KEY,
          "SUPABASE_SECRET_KEY",
          "storage/supabase",
        ),
        fetch: deps.fetch ?? globalThis.fetch,
      }),
  },
  memory: {
    status: "implemented",
    create: (config, deps) => createMemoryStorage({ appEnv: config.APP_ENV, clock: deps.clock }),
  },
};

export function selectStorageAdapter(
  config: StorageAdapterEnv,
  deps: AdapterDeps = {},
): StoragePort {
  return selectAdapter("storage", STORAGE_ADAPTERS, config.STORAGE_PROVIDER, config, deps);
}

let selected: StoragePort | undefined;

/** Adapter lưu trữ của ứng dụng, chọn một lần theo `env` ở lần gọi đầu tiên. */
export function getStorage(): StoragePort {
  selected ??= selectStorageAdapter(env);
  return selected;
}
