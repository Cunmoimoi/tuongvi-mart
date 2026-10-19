import { describe, expect, it } from "vitest";
import { selectNotifierAdapter } from "@/server/adapters/notifier";
import type { NotifierPort, OwnerAlert } from "@/server/adapters/notifier/port";
import { providerKind, providerNames } from "@/server/adapters/providers";
import { FAKE_ADAPTER_APP_ENVS } from "@/server/adapters/select";
import type { AppEnv } from "@/server/env";
import { NotImplementedError } from "@/server/lib/errors";
import {
  adapterEnv,
  createNetworkGuard,
  createWriteSink,
  findLeaks,
  outgoingTexts,
  settle,
  TELEGRAM_URL_WITH_TOKEN,
  TEST_SECRETS,
} from "../../../../tests/helpers/adapters";

// Hợp đồng chung cho MỌI adapter gửi cảnh báo. Tin nhắn rời khỏi hệ thống (Telegram...), nên mọi
// thứ đi ra (request mạng, dòng in ra, lỗi ném ra) không được chứa SĐT đầy đủ, địa chỉ đầy đủ,
// OTP/token của khách hay secret của chính adapter (che theo logger T0.4).

const ALL_APP_ENVS: readonly AppEnv[] = ["local", "test", "staging", "production"];

const CASES = providerNames("notifier").flatMap((provider) =>
  (providerKind("notifier", provider) === "fake" ? FAKE_ADAPTER_APP_ENVS : ALL_APP_ENVS).map(
    (appEnv) => ({ provider, appEnv }),
  ),
);

const ALERT: OwnerAlert = {
  event: "payment.exception",
  // `title` không được chứa dữ liệu khách theo quy ước, nhưng lỡ có thì SĐT vẫn phải bị che.
  title: "Giao dịch cần xử lý, khách 0901234567",
  details: {
    orderCode: "TVM2345ABCD",
    amountVnd: 150000,
    customerPhone: "0901234567",
    note: "Khách nhờ gọi lại số 0901 234 567",
    shippingAddress: "12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh",
    otp: "482913",
    viewToken: "vt-LEAKCHECK-view-token",
  },
};

const HIDDEN = [
  "901234567",
  "0901 234 567",
  "12 Nguyễn Huệ",
  "482913",
  "vt-LEAKCHECK-view-token",
  ...Object.values(TEST_SECRETS),
  TELEGRAM_URL_WITH_TOKEN,
];

async function leaksOf(adapter: NotifierPort, sink = createWriteSink(), network = createNetworkGuard()) {
  const outcome = await settle(() => adapter.notifyOwner(ALERT));
  return { outcome, leaks: findLeaks(outgoingTexts(outcome, sink, network), HIDDEN) };
}

describe.each(CASES)("hợp đồng notifier/$provider (APP_ENV=$appEnv)", ({ provider, appEnv }) => {
  it("không gửi SĐT, địa chỉ đầy đủ, OTP, token hay secret ra ngoài", async () => {
    const sink = createWriteSink();
    const network = createNetworkGuard();
    const adapter = selectNotifierAdapter(
      adapterEnv({ APP_ENV: appEnv, NOTIFIER_PROVIDER: provider as "telegram" | "noop" }),
      { fetch: network.fetch, write: sink.write },
    );

    const { outcome, leaks } = await leaksOf(adapter, sink, network);
    if (!outcome.ok) {
      expect(outcome.error).toBeInstanceOf(NotImplementedError);
    }
    expect(leaks).toStrictEqual([]);
  });
});

// Chứng minh bộ kiểm ở trên không rỗng: một adapter cố tình gửi nguyên dữ liệu phải bị bắt.
describe("bộ kiểm rò rỉ của hợp đồng notifier", () => {
  it("bắt được adapter gửi nguyên cảnh báo ra ngoài", async () => {
    const sink = createWriteSink();
    const leaky: NotifierPort = {
      provider: "leaky",
      async notifyOwner(alert) {
        sink.write(JSON.stringify(alert));
      },
    };
    const { leaks } = await leaksOf(leaky, sink);
    expect(leaks).toEqual(
      expect.arrayContaining(["901234567", "12 Nguyễn Huệ", "482913", "vt-LEAKCHECK-view-token"]),
    );
  });

  it("bắt được lỗi có URL chứa bot token", async () => {
    const leaky: NotifierPort = {
      provider: "leaky",
      async notifyOwner() {
        throw new Error(`fetch failed: ${TELEGRAM_URL_WITH_TOKEN}`);
      },
    };
    const { leaks } = await leaksOf(leaky);
    expect(leaks).toContain(TELEGRAM_URL_WITH_TOKEN);
  });
});
