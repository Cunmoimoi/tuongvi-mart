import { describe, expect, it } from "vitest";
import { selectCaptchaAdapter } from "@/server/adapters/captcha";
import { selectNotifierAdapter } from "@/server/adapters/notifier";
import { selectPaymentAdapter } from "@/server/adapters/payment";
import {
  ADAPTER_PORT_NAMES,
  ADAPTER_PORTS,
  providerKind,
  providerNames,
  type AdapterPortName,
} from "@/server/adapters/providers";
import { FAKE_ADAPTER_APP_ENVS, type AdapterDeps } from "@/server/adapters/select";
import { selectSmsAdapter } from "@/server/adapters/sms";
import { selectStorageAdapter } from "@/server/adapters/storage";
import { parseEnv, type AppEnv } from "@/server/env";
import { AdapterConfigError } from "@/server/lib/errors";
import {
  adapterEnv,
  createNetworkGuard,
  createWriteSink,
  type AdapterEnv,
} from "../../../tests/helpers/adapters";

// ROADMAP T0.9, nghiệm thu "test chọn adapter theo env". Hàm chọn của từng port nhận đúng các
// biến môi trường nó cần (chưa qua env.ts) để chứng minh lớp chặn thứ hai hoạt động độc lập.

const APP_ENVS: readonly AppEnv[] = ["local", "test", "staging", "production"];

type Selector = (config: AdapterEnv) => { readonly provider: string };

function withDeps(
  select: (config: AdapterEnv, deps: AdapterDeps) => { readonly provider: string },
) {
  return (config: AdapterEnv) =>
    select(config, { fetch: createNetworkGuard().fetch, write: createWriteSink().write });
}

const SELECTORS: Record<AdapterPortName, Selector> = {
  payment: withDeps(selectPaymentAdapter),
  sms: withDeps(selectSmsAdapter),
  storage: withDeps(selectStorageAdapter),
  captcha: withDeps(selectCaptchaAdapter),
  notifier: withDeps(selectNotifierAdapter),
};

// Biến bắt buộc của từng adapter khi được chọn. Thiếu thì phải từ chối, không tự chuyển sang
// adapter giả (ARCHITECTURE mục 9).
const REQUIRED_SETTINGS: Record<string, readonly (keyof AdapterEnv)[]> = {
  "payment/sepay": ["SEPAY_WEBHOOK_SECRET", "SEPAY_API_TOKEN"],
  "payment/fake": ["SEPAY_WEBHOOK_SECRET"],
  "sms/esms": [],
  "sms/console": [],
  "storage/supabase": ["SUPABASE_URL", "SUPABASE_SECRET_KEY"],
  "storage/memory": [],
  "captcha/turnstile": ["TURNSTILE_SECRET_KEY"],
  "captcha/always-pass": [],
  "notifier/telegram": ["OWNER_ALERT_TELEGRAM_BOT_TOKEN", "OWNER_ALERT_TELEGRAM_CHAT_ID"],
  "notifier/noop": [],
};

const CASES = ADAPTER_PORT_NAMES.flatMap((port) =>
  providerNames(port).map((provider) => ({
    port,
    provider,
    envVar: ADAPTER_PORTS[port].envVar,
    kind: providerKind(port, provider),
  })),
);

// Cố ý nhận chuỗi bất kỳ (kể cả tên không có trong bảng) để thử cả giá trị env.ts sẽ từ chối.
function configFor(port: AdapterPortName, provider: string, appEnv: AppEnv): AdapterEnv {
  return {
    ...adapterEnv({ APP_ENV: appEnv }),
    [ADAPTER_PORTS[port].envVar]: provider,
  } as AdapterEnv;
}

describe("bảng nhà cung cấp", () => {
  it("có đủ 5 port, mỗi port đúng một adapter thật và một adapter giả", () => {
    expect([...ADAPTER_PORT_NAMES].sort()).toStrictEqual(
      ["captcha", "notifier", "payment", "sms", "storage"].sort(),
    );
    for (const port of ADAPTER_PORT_NAMES) {
      const kinds = Object.values(ADAPTER_PORTS[port].providers).sort();
      expect(kinds, port).toStrictEqual(["fake", "real"]);
    }
  });

  it("mọi tổ hợp có danh sách biến bắt buộc", () => {
    expect(Object.keys(REQUIRED_SETTINGS).sort()).toStrictEqual(
      CASES.map(({ port, provider }) => `${port}/${provider}`).sort(),
    );
  });

  it("adapter giả chỉ được phép ở local và test", () => {
    expect([...FAKE_ADAPTER_APP_ENVS].sort()).toStrictEqual(["local", "test"]);
  });
});

// (a) Chọn adapter theo biến môi trường, đủ mọi tổ hợp APP_ENV × nhà cung cấp.
describe("(a) chọn adapter theo biến môi trường", () => {
  const matrix = CASES.flatMap((testCase) =>
    APP_ENVS.map((appEnv) => ({
      ...testCase,
      appEnv,
      expected:
        testCase.kind === "real" || FAKE_ADAPTER_APP_ENVS.includes(appEnv) ? "chọn" : "từ chối",
    })),
  );

  it("ma trận có đủ 5 port × 2 nhà cung cấp × 4 môi trường", () => {
    expect(matrix).toHaveLength(40);
  });

  it.each(matrix)(
    "$envVar=$provider ($kind), APP_ENV=$appEnv → $expected",
    ({ port, provider, appEnv, expected }) => {
      const select = () => SELECTORS[port](configFor(port, provider, appEnv));
      if (expected === "chọn") {
        expect(select().provider).toBe(provider);
      } else {
        expect(select).toThrow(AdapterConfigError);
      }
    },
  );

  it.each(ADAPTER_PORT_NAMES.flatMap((port) => APP_ENVS.map((appEnv) => ({ port, appEnv }))))(
    "$port: nhà cung cấp không có trong bảng bị từ chối (APP_ENV=$appEnv)",
    ({ port, appEnv }) => {
      for (const unknown of ["", "mock", "FAKE", "constructor", "__proto__", "toString"]) {
        expect(() => SELECTORS[port](configFor(port, unknown, appEnv)), unknown).toThrow(
          AdapterConfigError,
        );
      }
    },
  );

  const missingCases = CASES.flatMap(({ port, provider }) =>
    (REQUIRED_SETTINGS[`${port}/${provider}`] ?? []).flatMap((setting) =>
      ["local", "test"].map((appEnv) => ({ port, provider, setting, appEnv: appEnv as AppEnv })),
    ),
  );

  it.each(missingCases)(
    "$port/$provider thiếu $setting (APP_ENV=$appEnv) → từ chối, không tự chuyển sang adapter giả",
    ({ port, provider, setting, appEnv }) => {
      const config = { ...configFor(port, provider, appEnv), [setting]: undefined } as AdapterEnv;
      expect(() => SELECTORS[port](config)).toThrow(AdapterConfigError);
      expect(() => SELECTORS[port](config)).toThrow(new RegExp(setting));
    },
  );
});

const FAKE_CASES = CASES.filter(({ kind }) => kind === "fake");

// (b) staging/production chọn adapter giả: từ chối ở cả env.ts lẫn hàm chọn.
describe("(b) adapter giả ở staging và production", () => {
  // Cấu hình production hợp lệ đầy đủ cho env.ts; mỗi test chỉ đổi một biến sang adapter giả.
  function productionLikeEnv(appEnv: AppEnv, overrides: Record<string, string>) {
    return {
      APP_URL: "https://tuongvimart.vn",
      DATABASE_URL: "postgres://app_runtime:pass@db.example.test:6543/postgres",
      SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      PAYEE_BANK_BIN: "970436",
      PAYEE_BANK_NAME: "Vietcombank",
      PAYEE_ACCOUNT_NO: "0123456789",
      PAYEE_ACCOUNT_NAME: "TUONG VI MART",
      SMS_HOOK_SECRET: "sms-hook-secret",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
      HANDOVER_SECRET: "handover-secret",
      VIEW_TOKEN_PEPPER: "view-token-pepper",
      CRON_SECRET: "cron-secret",
      ...adapterEnv({ APP_ENV: appEnv }),
      ...overrides,
    };
  }

  const cases = FAKE_CASES.flatMap((testCase) =>
    (["staging", "production"] as const).map((appEnv) => ({ ...testCase, appEnv })),
  );

  it.each(["staging", "production"] as const)(
    "cấu hình %s toàn adapter thật thì env.ts chấp nhận (đối chứng)",
    (appEnv) => {
      expect(parseEnv(productionLikeEnv(appEnv, {})).APP_ENV).toBe(appEnv);
    },
  );

  it.each(cases)(
    "lớp 1, env.ts: $envVar=$provider ở APP_ENV=$appEnv → không khởi động",
    ({ envVar, provider, appEnv }) => {
      expect(() => parseEnv(productionLikeEnv(appEnv, { [envVar]: provider }))).toThrow(
        new RegExp(`${envVar}.*adapter giả`),
      );
    },
  );

  it.each(cases)(
    "lớp 2, hàm chọn: $envVar=$provider ở APP_ENV=$appEnv → từ chối dù env.ts bị bỏ qua",
    ({ port, envVar, provider, appEnv }) => {
      // Khớp đúng thông điệp của hàm chọn (`<BIẾN>=<tên>`), không phải của factory adapter giả
      // (`<port>/<tên>`, lớp 3): gỡ lớp 2 thì test này phải đỏ dù lớp 3 vẫn chặn.
      expect(() => SELECTORS[port](configFor(port, provider, appEnv))).toThrow(
        `${envVar}=${provider} là adapter giả`,
      );
    },
  );
});

// (d) Adapter giả nạp được ở local và test.
describe("(d) adapter giả nạp được ở local và test", () => {
  const cases = FAKE_CASES.flatMap((testCase) =>
    (["local", "test"] as const).map((appEnv) => ({ ...testCase, appEnv })),
  );

  it.each(cases)("$envVar=$provider, APP_ENV=$appEnv", ({ port, provider, appEnv }) => {
    const adapter = SELECTORS[port](configFor(port, provider, appEnv));
    expect(adapter.provider).toBe(provider);
  });
});
