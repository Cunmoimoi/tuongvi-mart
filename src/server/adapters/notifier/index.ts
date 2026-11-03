import "server-only";
import { createNoopNotifier } from "@/server/adapters/notifier/fakes/noop";
import type { NotifierPort } from "@/server/adapters/notifier/port";
import { createTelegramNotifier } from "@/server/adapters/notifier/telegram";
import {
  requireSetting,
  selectAdapter,
  type AdapterDeps,
  type AdapterRegistry,
} from "@/server/adapters/select";
import { env, type Env } from "@/server/env";

// Nơi DUY NHẤT chọn adapter gửi cảnh báo cho chủ shop (ARCHITECTURE mục 9). Code nghiệp vụ gọi
// `getNotifier()`; adapter giả trong `fakes/` chỉ được import ở đây và trong test (ESLint
// `local/no-fake-adapter-import`).

export type NotifierAdapterEnv = Pick<
  Env,
  | "APP_ENV"
  | "NOTIFIER_PROVIDER"
  | "OWNER_ALERT_TELEGRAM_BOT_TOKEN"
  | "OWNER_ALERT_TELEGRAM_CHAT_ID"
>;

export const NOTIFIER_ADAPTERS: AdapterRegistry<"notifier", NotifierAdapterEnv, NotifierPort> = {
  telegram: {
    status: "not-implemented",
    create: (config, deps) =>
      createTelegramNotifier({
        botToken: requireSetting(
          config.OWNER_ALERT_TELEGRAM_BOT_TOKEN,
          "OWNER_ALERT_TELEGRAM_BOT_TOKEN",
          "notifier/telegram",
        ),
        chatId: requireSetting(
          config.OWNER_ALERT_TELEGRAM_CHAT_ID,
          "OWNER_ALERT_TELEGRAM_CHAT_ID",
          "notifier/telegram",
        ),
        fetch: deps.fetch ?? globalThis.fetch,
      }),
  },
  noop: {
    status: "implemented",
    create: (config) => createNoopNotifier({ appEnv: config.APP_ENV }),
  },
};

export function selectNotifierAdapter(
  config: NotifierAdapterEnv,
  deps: AdapterDeps = {},
): NotifierPort {
  return selectAdapter("notifier", NOTIFIER_ADAPTERS, config.NOTIFIER_PROVIDER, config, deps);
}

let selected: NotifierPort | undefined;

/** Adapter gửi cảnh báo của ứng dụng, chọn một lần theo `env` ở lần gọi đầu tiên. */
export function getNotifier(): NotifierPort {
  selected ??= selectNotifierAdapter(env);
  return selected;
}
