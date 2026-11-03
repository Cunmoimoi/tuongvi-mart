import "server-only";

/**
 * Bảng duy nhất liệt kê các port, biến môi trường chọn adapter và từng nhà cung cấp là adapter
 * thật hay giả (ARCHITECTURE mục 9). `env.ts` lấy danh sách giá trị hợp lệ và danh sách adapter
 * giả từ đây; `adapters/<port>/index.ts` phải có đúng các tên này (TypeScript kiểm).
 *
 * Quy ước file (test quét `adapters/scan.test.ts` kiểm): adapter thật nằm ở
 * `adapters/<port>/<tên>.ts`, adapter giả ở `adapters/<port>/fakes/<tên>.ts`.
 */

export type AdapterKind = "real" | "fake";

export const ADAPTER_PORTS = {
  payment: { envVar: "PAYMENT_PROVIDER", providers: { sepay: "real", fake: "fake" } },
  // Q6 (nhà cung cấp SMS) chưa chốt: `esms` là tên giữ chỗ theo ARCHITECTURE, đổi khi chốt.
  sms: { envVar: "SMS_PROVIDER", providers: { esms: "real", console: "fake" } },
  storage: { envVar: "STORAGE_PROVIDER", providers: { supabase: "real", memory: "fake" } },
  captcha: { envVar: "CAPTCHA_PROVIDER", providers: { turnstile: "real", "always-pass": "fake" } },
  notifier: { envVar: "NOTIFIER_PROVIDER", providers: { telegram: "real", noop: "fake" } },
} as const satisfies Record<
  string,
  { readonly envVar: string; readonly providers: Readonly<Record<string, AdapterKind>> }
>;

export type AdapterPortName = keyof typeof ADAPTER_PORTS;
export type ProviderEnvVar = (typeof ADAPTER_PORTS)[AdapterPortName]["envVar"];
export type ProviderName<P extends AdapterPortName> = keyof (typeof ADAPTER_PORTS)[P]["providers"] &
  string;

export const ADAPTER_PORT_NAMES = Object.keys(ADAPTER_PORTS) as AdapterPortName[];

/** Danh sách tên nhà cung cấp của một port, dạng tuple không rỗng để dùng với `z.enum`. */
export function providerNames<P extends AdapterPortName>(
  port: P,
): [ProviderName<P>, ...ProviderName<P>[]] {
  // Object.keys trả về string[]; mọi port trong bảng đều có ít nhất một nhà cung cấp.
  return Object.keys(ADAPTER_PORTS[port].providers) as [ProviderName<P>, ...ProviderName<P>[]];
}

/** Loại adapter của một giá trị biến môi trường, hoặc `undefined` nếu không có trong bảng. */
export function providerKind(port: AdapterPortName, provider: string): AdapterKind | undefined {
  const providers: Readonly<Record<string, AdapterKind>> = ADAPTER_PORTS[port].providers;
  return Object.hasOwn(providers, provider) ? providers[provider] : undefined;
}
