import { describe, expect, it } from "vitest";
import { providerKind, providerNames } from "@/server/adapters/providers";
import { FAKE_ADAPTER_APP_ENVS } from "@/server/adapters/select";
import { selectSmsAdapter } from "@/server/adapters/sms";
import type { AppEnv } from "@/server/env";
import { NotImplementedError } from "@/server/lib/errors";
import {
  adapterEnv,
  createNetworkGuard,
  createWriteSink,
  errorTexts,
  findLeaks,
  settle,
  type Outcome,
} from "../../../../tests/helpers/adapters";

// Hợp đồng chung cho MỌI adapter SMS, chạy ở mọi APP_ENV adapter được phép. Thứ được kiểm là
// những gì người khác nhìn thấy được: dòng ghi ra console/log và lỗi ném ra. Request gửi tới
// nhà cung cấp SMS đương nhiên chứa SĐT và OTP nên không nằm trong phạm vi kiểm này.

const ALL_APP_ENVS: readonly AppEnv[] = ["local", "test", "staging", "production"];

const CASES = providerNames("sms").flatMap((provider) =>
  (providerKind("sms", provider) === "fake" ? FAKE_ADAPTER_APP_ENVS : ALL_APP_ENVS).map(
    (appEnv) => ({ provider, appEnv }),
  ),
);

const PHONE = "+84901234567";
const PHONE_DIGITS = "901234567";
const OTP = "482913";
const MESSAGE = "Đơn TVM2345ABCD đã sẵn sàng, mã nhận hàng 771204";

function build(provider: string, appEnv: AppEnv) {
  const sink = createWriteSink();
  const network = createNetworkGuard();
  const adapter = selectSmsAdapter(
    adapterEnv({ APP_ENV: appEnv, SMS_PROVIDER: provider as "esms" | "console" }),
    { fetch: network.fetch, write: sink.write },
  );
  return { adapter, sink, network };
}

function visibleTexts(outcome: Outcome<unknown>, sink: { lines: readonly string[] }): string[] {
  return [...sink.lines, ...(outcome.ok ? [] : errorTexts(outcome.error))];
}

function expectDoneOrNotImplemented(outcome: Outcome<unknown>) {
  if (!outcome.ok) {
    expect(outcome.error).toBeInstanceOf(NotImplementedError);
  }
}

describe.each(CASES)("hợp đồng sms/$provider (APP_ENV=$appEnv)", ({ provider, appEnv }) => {
  it("sendOtp: SĐT luôn bị che; OTP chỉ được in khi APP_ENV=local", async () => {
    const { adapter, sink } = build(provider, appEnv);
    const outcome = await settle(() => adapter.sendOtp({ phone: PHONE, code: OTP }));
    expectDoneOrNotImplemented(outcome);

    const hidden = appEnv === "local" ? [PHONE_DIGITS] : [PHONE_DIGITS, OTP];
    expect(findLeaks(visibleTexts(outcome, sink), hidden)).toStrictEqual([]);
  });

  it("sendMessage: SĐT luôn bị che; nội dung chỉ được in khi APP_ENV=local", async () => {
    const { adapter, sink } = build(provider, appEnv);
    const outcome = await settle(() => adapter.sendMessage({ phone: PHONE, text: MESSAGE }));
    expectDoneOrNotImplemented(outcome);

    const hidden = appEnv === "local" ? [PHONE_DIGITS] : [PHONE_DIGITS, "771204", "TVM2345ABCD"];
    expect(findLeaks(visibleTexts(outcome, sink), hidden)).toStrictEqual([]);
  });
});
