import "server-only";
import type { NotifierPort } from "@/server/adapters/notifier/port";
import { assertFakeAdapterAllowed } from "@/server/adapters/select";
import type { AppEnv } from "@/server/env";

// ADAPTER GIẢ, chỉ nạp được khi APP_ENV là local hoặc test: nhận cảnh báo rồi bỏ qua, không gửi đi
// đâu và không in gì (cảnh báo có thể chứa dữ liệu khách).

export interface NoopNotifierOptions {
  readonly appEnv: AppEnv;
}

export function createNoopNotifier(options: NoopNotifierOptions): NotifierPort {
  assertFakeAdapterAllowed(options.appEnv, "notifier/noop");
  return {
    provider: "noop",
    async notifyOwner() {},
  };
}
