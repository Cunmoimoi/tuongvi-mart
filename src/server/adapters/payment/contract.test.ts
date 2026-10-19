import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { selectPaymentAdapter } from "@/server/adapters/payment";
import { providerKind, providerNames } from "@/server/adapters/providers";
import { FAKE_ADAPTER_APP_ENVS } from "@/server/adapters/select";
import type { AppEnv } from "@/server/env";
import { NotImplementedError } from "@/server/lib/errors";
import {
  adapterEnv,
  createNetworkGuard,
  createWriteSink,
  errorTexts,
  findLeaks,
  settle,
  TEST_SECRETS,
  type Outcome,
} from "../../../../tests/helpers/adapters";

// Hợp đồng chung cho MỌI adapter thanh toán (thật và giả), chạy ở mọi APP_ENV adapter được phép.
// Adapter chưa làm xong ném NotImplementedError: coi là đóng cửa khi lỗi, vẫn đạt hợp đồng.

const ALL_APP_ENVS: readonly AppEnv[] = ["local", "test", "staging", "production"];

const CASES = providerNames("payment").flatMap((provider) =>
  (providerKind("payment", provider) === "fake" ? FAKE_ADAPTER_APP_ENVS : ALL_APP_ENVS).map(
    (appEnv) => ({ provider, appEnv }),
  ),
);

const BODY = JSON.stringify({
  id: "92704",
  gateway: "Vietcombank",
  transactionDate: "2026-10-19T09:00:00+07:00",
  accountNumber: "0123456789",
  code: "TVM2345ABCD",
  content: "TVM2345ABCD chuyen tien",
  transferType: "in",
  transferAmount: 150000,
  referenceCode: "FT26292000001",
});

// Ký theo cả hai bộ header (SePay theo BUSINESS_RULES 5.3 và adapter giả) để hợp đồng áp được
// cho mọi adapter mà không cần biết adapter nào đọc header nào.
function signedHeaders(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature =
    "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return new Headers({
    "x-sepay-timestamp": String(timestamp),
    "x-sepay-signature": signature,
    "x-fake-timestamp": String(timestamp),
    "x-fake-signature": signature,
  });
}

function build(provider: string, appEnv: AppEnv) {
  const network = createNetworkGuard();
  const adapter = selectPaymentAdapter(
    adapterEnv({ APP_ENV: appEnv, PAYMENT_PROVIDER: provider as "sepay" | "fake" }),
    { fetch: network.fetch, write: createWriteSink().write },
  );
  return { adapter, network };
}

/** Không bao giờ được xác nhận là hợp lệ: hoặc `ok: false`, hoặc NotImplementedError. */
function expectRejected(outcome: Outcome<{ ok: boolean }>) {
  if (outcome.ok) {
    expect(outcome.value.ok).toBe(false);
  } else {
    expect(outcome.error).toBeInstanceOf(NotImplementedError);
  }
}

describe.each(CASES)("hợp đồng payment/$provider (APP_ENV=$appEnv)", ({ provider, appEnv }) => {
  it("verifyWebhook: thiếu chữ ký thì không hợp lệ", async () => {
    const { adapter } = build(provider, appEnv);
    expectRejected(
      await settle(() => adapter.verifyWebhook({ headers: new Headers(), rawBody: BODY })),
    );
  });

  it("verifyWebhook: ký bằng secret khác thì không hợp lệ", async () => {
    const { adapter } = build(provider, appEnv);
    const headers = signedHeaders("secret-cua-ke-gia-mao", BODY);
    expectRejected(await settle(() => adapter.verifyWebhook({ headers, rawBody: BODY })));
  });

  it("verifyWebhook: body bị sửa sau khi ký thì không hợp lệ", async () => {
    const { adapter } = build(provider, appEnv);
    const headers = signedHeaders(TEST_SECRETS.SEPAY_WEBHOOK_SECRET, BODY);
    const tampered = BODY.replace("150000", "15000000");
    expectRejected(await settle(() => adapter.verifyWebhook({ headers, rawBody: tampered })));
  });

  it("verifyWebhook: chữ ký đúng nhưng quá 300 giây thì không hợp lệ", async () => {
    const { adapter } = build(provider, appEnv);
    const old = Math.floor(Date.now() / 1000) - 301;
    const headers = signedHeaders(TEST_SECRETS.SEPAY_WEBHOOK_SECRET, BODY, old);
    expectRejected(await settle(() => adapter.verifyWebhook({ headers, rawBody: BODY })));
  });

  it.each(["", "không phải JSON", "[]", "{}", '{"id":"1","transferAmount":1.5}'])(
    "parseWebhook từ chối body sai định dạng: %j",
    async (rawBody) => {
      const { adapter } = build(provider, appEnv);
      expect((await settle(() => adapter.parseWebhook(rawBody))).ok).toBe(false);
    },
  );

  it.each([0, -1, 101, 1.5])("listTransactions từ chối limit=%s", async (limit) => {
    const { adapter } = build(provider, appEnv);
    expect((await settle(() => adapter.listTransactions({ limit }))).ok).toBe(false);
  });

  it("lỗi ném ra không lộ secret, và không gọi mạng", async () => {
    const { adapter, network } = build(provider, appEnv);
    const outcomes = [
      await settle(() =>
        adapter.verifyWebhook({ headers: signedHeaders("x", BODY), rawBody: BODY }),
      ),
      await settle(() => adapter.parseWebhook("{")),
      await settle(() => adapter.listTransactions({ limit: 500 })),
      await settle(() => adapter.listTransactions({ limit: 10 })),
    ];
    const texts = outcomes.flatMap((outcome) => (outcome.ok ? [] : errorTexts(outcome.error)));
    expect(findLeaks(texts, Object.values(TEST_SECRETS))).toStrictEqual([]);
    expect(network.calls).toStrictEqual([]);
  });
});
