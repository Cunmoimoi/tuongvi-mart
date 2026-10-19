import "server-only";
import {
  ADAPTER_PORTS,
  providerKind,
  type AdapterPortName,
  type ProviderName,
} from "@/server/adapters/providers";
import type { AppEnv } from "@/server/env";
import type { Clock } from "@/server/lib/clock";
import { AdapterConfigError } from "@/server/lib/errors";

/**
 * Chọn adapter theo kiểu đóng cửa khi lỗi (ARCHITECTURE mục 9). Ba lớp chặn adapter giả:
 * 1. `env.ts` không cho ứng dụng khởi động nếu staging/production cấu hình adapter giả.
 * 2. `selectAdapter` (file này) từ chối lần nữa, dù cấu hình không đi qua env.ts.
 * 3. Factory của từng adapter giả tự gọi `assertFakeAdapterAllowed` khi được tạo.
 * Lớp 2 và 3 dùng danh sách CHO PHÉP: APP_ENV mới thêm sau này mặc định bị từ chối.
 */

export const FAKE_ADAPTER_APP_ENVS: readonly AppEnv[] = ["local", "test"];

export function assertFakeAdapterAllowed(appEnv: AppEnv, adapterId: string): void {
  if (!FAKE_ADAPTER_APP_ENVS.includes(appEnv)) {
    throw new AdapterConfigError(
      `${adapterId} là adapter giả, chỉ được nạp khi APP_ENV là ${FAKE_ADAPTER_APP_ENVS.join(" hoặc ")} (đang là ${appEnv})`,
    );
  }
}

/** Phụ thuộc truyền vào adapter; test truyền bản giả để không gọi mạng, đọc lại được log. */
export interface AdapterDeps {
  readonly fetch?: typeof fetch;
  readonly write?: (line: string) => void;
  readonly clock?: Clock;
}

export interface AdapterDefinition<Config, Port> {
  /** Adapter thật chưa làm xong là "not-implemented": mọi phương thức ném NotImplementedError. */
  readonly status: "implemented" | "not-implemented";
  create(config: Config, deps: AdapterDeps): Port;
}

export type AdapterRegistry<P extends AdapterPortName, Config, Port> = {
  readonly [N in ProviderName<P>]: AdapterDefinition<Config, Port>;
};

export function selectAdapter<P extends AdapterPortName, Config extends { APP_ENV: AppEnv }, Port>(
  port: P,
  registry: AdapterRegistry<P, Config, Port>,
  provider: string,
  config: Config,
  deps: AdapterDeps = {},
): Port {
  const { envVar } = ADAPTER_PORTS[port];
  const kind = providerKind(port, provider);
  if (kind === undefined) {
    // Không lặp lại giá trị nhận được: lỡ ai dán nhầm secret vào biến này thì cũng không lộ ra log.
    throw new AdapterConfigError(
      `${envVar} không phải nhà cung cấp được hỗ trợ (chỉ nhận: ${Object.keys(ADAPTER_PORTS[port].providers).join(", ")})`,
    );
  }
  if (kind === "fake") {
    assertFakeAdapterAllowed(config.APP_ENV, `${envVar}=${provider}`);
  }
  return registry[provider as ProviderName<P>].create(config, deps);
}

/** Lấy biến bắt buộc của adapter đã chọn. Thiếu thì dừng, không tự chuyển sang adapter giả. */
export function requireSetting(value: string | undefined, name: string, adapterId: string): string {
  if (!value) {
    throw new AdapterConfigError(`${adapterId} cần biến ${name} nhưng biến này chưa đặt`);
  }
  return value;
}

/**
 * Dùng trong factory của adapter thật: mọi giá trị chuỗi trong cấu hình phải khác rỗng. Lỗi chỉ nêu
 * tên khóa, không nêu giá trị.
 */
export function assertConfigured(config: object, adapterId: string): void {
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string" && value.length === 0) {
      throw new AdapterConfigError(`${adapterId}: cấu hình ${key} rỗng`);
    }
  }
}
