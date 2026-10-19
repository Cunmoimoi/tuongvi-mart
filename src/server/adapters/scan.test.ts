import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CAPTCHA_ADAPTERS, selectCaptchaAdapter } from "@/server/adapters/captcha";
import type { CaptchaPort } from "@/server/adapters/captcha/port";
import { NOTIFIER_ADAPTERS, selectNotifierAdapter } from "@/server/adapters/notifier";
import type { NotifierPort } from "@/server/adapters/notifier/port";
import { PAYMENT_ADAPTERS, selectPaymentAdapter } from "@/server/adapters/payment";
import type { PaymentProviderPort } from "@/server/adapters/payment/port";
import {
  ADAPTER_PORT_NAMES,
  ADAPTER_PORTS,
  providerKind,
  providerNames,
  type AdapterPortName,
} from "@/server/adapters/providers";
import type { AdapterDeps } from "@/server/adapters/select";
import { selectSmsAdapter, SMS_ADAPTERS } from "@/server/adapters/sms";
import type { SmsPort } from "@/server/adapters/sms/port";
import { selectStorageAdapter, STORAGE_ADAPTERS } from "@/server/adapters/storage";
import type { StoragePort } from "@/server/adapters/storage/port";
import type { AppEnv } from "@/server/env";
import { NotImplementedError } from "@/server/lib/errors";
import {
  adapterEnv,
  createNetworkGuard,
  createWriteSink,
  settle,
  type AdapterEnv,
} from "../../../tests/helpers/adapters";

// ROADMAP T0.9 nghiệm thu (c): adapter thật chưa làm xong không bao giờ trả thành công. Test này
// quét thư mục adapters/ nên adapter mới thêm vào cũng bị kiểm mà không cần ai nhớ viết test:
// - file adapter không có trong bảng (providers.ts + index.ts của port) → đỏ;
// - adapter đánh dấu "not-implemented" mà có phương thức không ném NotImplementedError → đỏ;
// - adapter đánh dấu "implemented" (kể cả adapter giả) mà không có file test riêng → đỏ;
// - port thêm phương thức mà bảng gọi thử bên dưới chưa có → typecheck đỏ (và test đỏ).

const ADAPTERS_DIR = import.meta.dirname;
const APP_ENVS: readonly AppEnv[] = ["local", "test", "staging", "production"];

/** Mỗi phương thức của port phải có đúng một lời gọi thử; thiếu hay thừa đều lỗi typecheck. */
type MethodCalls<Port> = {
  [K in keyof Port as Port[K] extends (...args: never[]) => unknown ? K : never]-?: (
    adapter: Port,
  ) => unknown;
};

const PAYMENT_CALLS = {
  verifyWebhook: (adapter) =>
    adapter.verifyWebhook({ headers: new Headers({ "x-signature": "sha256=00" }), rawBody: "{}" }),
  parseWebhook: (adapter) => adapter.parseWebhook('{"id":"1"}'),
  listTransactions: (adapter) => adapter.listTransactions({ limit: 10 }),
} satisfies MethodCalls<PaymentProviderPort>;

const SMS_CALLS = {
  sendOtp: (adapter) => adapter.sendOtp({ phone: "+84901234567", code: "123456" }),
  sendMessage: (adapter) => adapter.sendMessage({ phone: "+84901234567", text: "Xin chào" }),
} satisfies MethodCalls<SmsPort>;

const STORAGE_CALLS = {
  createSignedUpload: (adapter) =>
    adapter.createSignedUpload({ bucket: "incoming", path: "images/a.jpg" }),
  getPublicUrl: (adapter) => adapter.getPublicUrl({ bucket: "media", path: "images/a.webp" }),
  delete: (adapter) => adapter.delete({ bucket: "incoming", paths: ["images/a.jpg"] }),
} satisfies MethodCalls<StoragePort>;

const CAPTCHA_CALLS = {
  verify: (adapter) => adapter.verify({ token: "token-tu-trinh-duyet" }),
} satisfies MethodCalls<CaptchaPort>;

const NOTIFIER_CALLS = {
  notifyOwner: (adapter) => adapter.notifyOwner({ event: "test.event", title: "Thử" }),
} satisfies MethodCalls<NotifierPort>;

interface PortCase {
  readonly registry: Readonly<
    Record<
      string,
      { readonly status: "implemented" | "not-implemented"; create(...args: never[]): unknown }
    >
  >;
  readonly select: (config: AdapterEnv, deps: AdapterDeps) => object;
  readonly calls: Readonly<Record<string, (adapter: never) => unknown>>;
}

const PORT_CASES: Record<AdapterPortName, PortCase> = {
  payment: { registry: PAYMENT_ADAPTERS, select: selectPaymentAdapter, calls: PAYMENT_CALLS },
  sms: { registry: SMS_ADAPTERS, select: selectSmsAdapter, calls: SMS_CALLS },
  storage: { registry: STORAGE_ADAPTERS, select: selectStorageAdapter, calls: STORAGE_CALLS },
  captcha: { registry: CAPTCHA_ADAPTERS, select: selectCaptchaAdapter, calls: CAPTCHA_CALLS },
  notifier: { registry: NOTIFIER_ADAPTERS, select: selectNotifierAdapter, calls: NOTIFIER_CALLS },
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx|mts)$/.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => !/\.test\.(ts|tsx|mts)$/.test(name))
    .sort();
}

function subdirectories(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function functionKeys(adapter: object): string[] {
  return Object.keys(adapter).filter(
    (key) => typeof (adapter as Record<string, unknown>)[key] === "function",
  );
}

const ALL_PROVIDERS = ADAPTER_PORT_NAMES.flatMap((port) =>
  providerNames(port).map((provider) => ({
    port,
    provider,
    kind: providerKind(port, provider),
    status: PORT_CASES[port].registry[provider]?.status,
  })),
);

describe("cấu trúc thư mục adapters/ khớp bảng nhà cung cấp", () => {
  it("mỗi thư mục con là một port có trong bảng", () => {
    expect(subdirectories(ADAPTERS_DIR)).toStrictEqual([...ADAPTER_PORT_NAMES].sort());
  });

  it.each(ADAPTER_PORT_NAMES)(
    "%s/: chỉ có index.ts, port.ts, adapter thật và thư mục fakes/",
    (port) => {
      const portDir = path.join(ADAPTERS_DIR, port);
      const real = providerNames(port).filter((name) => providerKind(port, name) === "real");
      const fake = providerNames(port).filter((name) => providerKind(port, name) === "fake");

      expect(sourceFiles(portDir)).toStrictEqual(
        ["index.ts", "port.ts", ...real.map((name) => `${name}.ts`)].sort(),
      );
      expect(subdirectories(portDir)).toStrictEqual(["fakes"]);
      expect(sourceFiles(path.join(portDir, "fakes"))).toStrictEqual(
        fake.map((name) => `${name}.ts`).sort(),
      );
    },
  );

  it.each(ADAPTER_PORT_NAMES)(
    "%s: bảng trong index.ts có đúng các tên trong providers.ts",
    (port) => {
      expect(Object.keys(PORT_CASES[port].registry).sort()).toStrictEqual(
        [...providerNames(port)].sort(),
      );
    },
  );

  it.each(ALL_PROVIDERS)("$port/$provider có trạng thái hợp lệ", ({ kind, status }) => {
    expect(["implemented", "not-implemented"]).toContain(status);
    // Adapter giả là thứ thay thế dịch vụ thật trong local/test, phải chạy được.
    if (kind === "fake") {
      expect(status).toBe("implemented");
    }
  });
});

const NOT_IMPLEMENTED = ALL_PROVIDERS.filter(({ status }) => status === "not-implemented");
const IMPLEMENTED = ALL_PROVIDERS.filter(({ status }) => status === "implemented");

describe("(c) adapter thật chưa làm xong ném NotImplementedError ở MỌI phương thức", () => {
  it("hiện có đủ 5 adapter thật chưa làm xong", () => {
    expect(NOT_IMPLEMENTED.map(({ port, provider }) => `${port}/${provider}`).sort()).toStrictEqual(
      ["captcha/turnstile", "notifier/telegram", "payment/sepay", "sms/esms", "storage/supabase"],
    );
  });

  const cases = NOT_IMPLEMENTED.flatMap((entry) =>
    APP_ENVS.map((appEnv) => ({ ...entry, appEnv })),
  );

  it.each(cases)("$port/$provider (APP_ENV=$appEnv)", async ({ port, provider, appEnv }) => {
    const portCase = PORT_CASES[port];
    const network = createNetworkGuard();
    const config = { ...adapterEnv({ APP_ENV: appEnv }), [ADAPTER_PORTS[port].envVar]: provider };
    const adapter = portCase.select(config as AdapterEnv, {
      fetch: network.fetch,
      write: createWriteSink().write,
    });

    // Phương thức nào của adapter cũng phải nằm trong bảng gọi thử (không có phương thức bị bỏ sót).
    expect(functionKeys(adapter).sort()).toStrictEqual(Object.keys(portCase.calls).sort());

    for (const [method, call] of Object.entries(portCase.calls)) {
      const outcome = await settle(() => call(adapter as never));
      expect(outcome.ok, `${method} không được trả thành công`).toBe(false);
      if (!outcome.ok) {
        expect(outcome.error, method).toBeInstanceOf(NotImplementedError);
        expect((outcome.error as NotImplementedError).feature).toBe(
          `${port}/${provider}.${method}`,
        );
      }
    }
    expect(network.calls).toStrictEqual([]);
  });
});

describe("adapter đã làm xong phải có file test riêng", () => {
  it.each(IMPLEMENTED)("$port/$provider ($kind)", ({ port, provider, kind }) => {
    const testFile =
      kind === "fake"
        ? path.join(ADAPTERS_DIR, port, "fakes", `${provider}.test.ts`)
        : path.join(ADAPTERS_DIR, port, `${provider}.test.ts`);
    expect(existsSync(testFile), path.relative(ADAPTERS_DIR, testFile)).toBe(true);
  });
});

// Lớp chặn thứ ba: chính factory của adapter giả cũng tự từ chối, kể cả khi ai đó gọi thẳng
// `create` trong bảng mà bỏ qua hàm chọn.
describe("adapter giả tự từ chối ở staging và production", () => {
  const cases = ALL_PROVIDERS.filter(({ kind }) => kind === "fake").flatMap((entry) =>
    (["staging", "production"] as const).map((appEnv) => ({ ...entry, appEnv })),
  );

  it.each(cases)("factory của $port/$provider (APP_ENV=$appEnv)", ({ port, provider, appEnv }) => {
    const definition = PORT_CASES[port].registry[provider];
    const create = definition?.create as unknown as (
      config: AdapterEnv,
      deps: AdapterDeps,
    ) => unknown;
    const config = { ...adapterEnv({ APP_ENV: appEnv }), [ADAPTER_PORTS[port].envVar]: provider };
    expect(() => create(config as AdapterEnv, {})).toThrow(`${port}/${provider} là adapter giả`);
  });
});
