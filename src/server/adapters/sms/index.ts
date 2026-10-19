import "server-only";
import { selectAdapter, type AdapterDeps, type AdapterRegistry } from "@/server/adapters/select";
import { createEsmsSms } from "@/server/adapters/sms/esms";
import { createConsoleSms } from "@/server/adapters/sms/fakes/console";
import type { SmsPort } from "@/server/adapters/sms/port";
import { env, type Env } from "@/server/env";

// Nơi DUY NHẤT chọn adapter SMS (ARCHITECTURE mục 9). Code nghiệp vụ gọi `getSms()`; adapter giả
// trong `fakes/` chỉ được import ở đây và trong test (ESLint `local/no-fake-adapter-import`).

export type SmsAdapterEnv = Pick<Env, "APP_ENV" | "SMS_PROVIDER">;

export const SMS_ADAPTERS: AdapterRegistry<"sms", SmsAdapterEnv, SmsPort> = {
  esms: {
    status: "not-implemented",
    create: () => createEsmsSms(),
  },
  console: {
    status: "implemented",
    create: (config, deps) => createConsoleSms({ appEnv: config.APP_ENV, write: deps.write }),
  },
};

export function selectSmsAdapter(config: SmsAdapterEnv, deps: AdapterDeps = {}): SmsPort {
  return selectAdapter("sms", SMS_ADAPTERS, config.SMS_PROVIDER, config, deps);
}

let selected: SmsPort | undefined;

/** Adapter SMS của ứng dụng, chọn một lần theo `env` ở lần gọi đầu tiên. */
export function getSms(): SmsPort {
  selected ??= selectSmsAdapter(env);
  return selected;
}
