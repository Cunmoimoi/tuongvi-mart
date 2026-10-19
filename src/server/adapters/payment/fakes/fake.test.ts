import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createFakePayment } from "@/server/adapters/payment/fakes/fake";
import type { BankTransaction } from "@/server/adapters/payment/port";
import { AppError } from "@/server/lib/errors";

// Adapter giả cho local/test: kiểm chữ ký HMAC thật (cùng cách tính với BUSINESS_RULES 5.3, header
// riêng `x-fake-*`), không có đường nào "cho qua" webhook không ký.

const SECRET = "fake-webhook-secret-for-tests";
const NOW = new Date("2026-10-19T02:00:00Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);
const clock = { now: () => NOW };

function payment(transactions: readonly BankTransaction[] = []) {
  return createFakePayment({ appEnv: "test", webhookSecret: SECRET, clock, transactions });
}

function sign(body: string, timestamp = NOW_SECONDS, secret = SECRET) {
  return new Headers({
    "x-fake-timestamp": String(timestamp),
    "x-fake-signature":
      "sha256=" + createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex"),
  });
}

const PAYLOAD = {
  id: "92704",
  gateway: "Vietcombank",
  transactionDate: "2026-10-19T09:00:00+07:00",
  accountNumber: "0123456789",
  code: "TVM2345ABCD",
  content: "TVM2345ABCD chuyen tien",
  transferType: "in",
  transferAmount: 150000,
  referenceCode: "FT26292000001",
};
const BODY = JSON.stringify(PAYLOAD);

describe("payment/fake: verifyWebhook", () => {
  it("chữ ký đúng → hợp lệ", async () => {
    expect(await payment().verifyWebhook({ headers: sign(BODY), rawBody: BODY })).toStrictEqual({
      ok: true,
    });
  });

  it("thiếu chữ ký hoặc thiếu timestamp → missing-signature", async () => {
    const signed = sign(BODY);
    const noSignature = new Headers({ "x-fake-timestamp": String(NOW_SECONDS) });
    const noTimestamp = new Headers({ "x-fake-signature": signed.get("x-fake-signature") ?? "" });
    for (const headers of [new Headers(), noSignature, noTimestamp]) {
      expect(await payment().verifyWebhook({ headers, rawBody: BODY })).toStrictEqual({
        ok: false,
        reason: "missing-signature",
      });
    }
  });

  it("ký bằng secret khác, sửa body, hay sửa timestamp → bad-signature", async () => {
    const adapter = payment();
    const wrongSecret = sign(BODY, NOW_SECONDS, "secret-khac");
    const tamperedBody = BODY.replace("150000", "15000000");
    const movedTimestamp = new Headers(sign(BODY));
    movedTimestamp.set("x-fake-timestamp", String(NOW_SECONDS - 1));

    for (const [headers, rawBody] of [
      [wrongSecret, BODY],
      [sign(BODY), tamperedBody],
      [movedTimestamp, BODY],
    ] as const) {
      expect(await adapter.verifyWebhook({ headers, rawBody })).toStrictEqual({
        ok: false,
        reason: "bad-signature",
      });
    }
  });

  it("chữ ký không đúng dạng (thiếu tiền tố, chữ hoa, rỗng) → bad-signature", async () => {
    const valid = sign(BODY).get("x-fake-signature") ?? "";
    for (const signature of [valid.slice("sha256=".length), valid.toUpperCase(), "sha256="]) {
      const headers = new Headers({
        "x-fake-timestamp": String(NOW_SECONDS),
        "x-fake-signature": signature,
      });
      expect((await payment().verifyWebhook({ headers, rawBody: BODY })).ok).toBe(false);
    }
  });

  it("lệch quá 300 giây (cả quá khứ lẫn tương lai) → stale-timestamp; đúng 300 giây vẫn nhận", async () => {
    const adapter = payment();
    for (const timestamp of [NOW_SECONDS - 301, NOW_SECONDS + 301]) {
      expect(
        await adapter.verifyWebhook({ headers: sign(BODY, timestamp), rawBody: BODY }),
      ).toStrictEqual({ ok: false, reason: "stale-timestamp" });
    }
    for (const timestamp of [NOW_SECONDS - 300, NOW_SECONDS + 300]) {
      expect(
        (await adapter.verifyWebhook({ headers: sign(BODY, timestamp), rawBody: BODY })).ok,
      ).toBe(true);
    }
  });

  it.each(["abc", "1.5", "", "-1", "1e9"])(
    "timestamp không phải số nguyên giây %j → không hợp lệ",
    async (timestamp) => {
      const headers = new Headers({
        "x-fake-timestamp": timestamp,
        "x-fake-signature":
          "sha256=" + createHmac("sha256", SECRET).update(`${timestamp}.${BODY}`).digest("hex"),
      });
      expect((await payment().verifyWebhook({ headers, rawBody: BODY })).ok).toBe(false);
    },
  );
});

describe("payment/fake: parseWebhook", () => {
  it("chuẩn hóa thành BankTransaction", () => {
    expect(payment().parseWebhook(BODY)).toStrictEqual({
      providerTransactionId: "92704",
      gateway: "Vietcombank",
      occurredAt: new Date("2026-10-19T02:00:00Z"),
      accountNumber: "0123456789",
      direction: "in",
      amountVnd: 150000,
      content: "TVM2345ABCD chuyen tien",
      paymentCode: "TVM2345ABCD",
      referenceCode: "FT26292000001",
    });
  });

  it("code và referenceCode có thể null; transferType out", () => {
    const tx = payment().parseWebhook(
      JSON.stringify({ ...PAYLOAD, code: null, referenceCode: null, transferType: "out" }),
    );
    expect(tx.paymentCode).toBeNull();
    expect(tx.referenceCode).toBeNull();
    expect(tx.direction).toBe("out");
  });

  it.each([
    ["số tiền thập phân", { transferAmount: 1500.5 }],
    ["số tiền âm", { transferAmount: -150000 }],
    ["số tiền bằng 0", { transferAmount: 0 }],
    ["số tiền dạng chuỗi", { transferAmount: "150000" }],
    ["số tiền quá lớn", { transferAmount: Number.MAX_SAFE_INTEGER + 1 }],
    ["transferType lạ", { transferType: "both" }],
    ["ngày không có múi giờ", { transactionDate: "2026-10-19 09:00:00" }],
    ["thiếu id", { id: undefined }],
    ["id rỗng", { id: "" }],
  ])("%s → AppError VALIDATION_FAILED", (_label, patch) => {
    const body = JSON.stringify({ ...PAYLOAD, ...patch });
    expect(() => payment().parseWebhook(body)).toThrow(AppError);
    try {
      payment().parseWebhook(body);
    } catch (error) {
      expect((error as AppError).code).toBe("VALIDATION_FAILED");
      expect((error as AppError).cause).toBeUndefined();
    }
  });

  it("body không phải JSON → AppError VALIDATION_FAILED", () => {
    expect(() => payment().parseWebhook("{")).toThrow(AppError);
  });
});

describe("payment/fake: listTransactions", () => {
  const transactions = ["1", "2", "3", "4"].map((id) => ({
    ...payment().parseWebhook(BODY),
    providerTransactionId: id,
  }));

  it("trả giao dịch theo thứ tự, sau sinceId, tối đa limit", async () => {
    const adapter = payment(transactions);
    const ids = async (query: { sinceId?: string; limit: number }) =>
      (await adapter.listTransactions(query)).map((tx) => tx.providerTransactionId);
    expect(await ids({ limit: 100 })).toStrictEqual(["1", "2", "3", "4"]);
    expect(await ids({ limit: 2 })).toStrictEqual(["1", "2"]);
    expect(await ids({ sinceId: "2", limit: 100 })).toStrictEqual(["3", "4"]);
    expect(await ids({ sinceId: "4", limit: 100 })).toStrictEqual([]);
  });

  it("sinceId không tồn tại → từ chối (không âm thầm trả lại từ đầu)", async () => {
    await expect(
      payment(transactions).listTransactions({ sinceId: "99", limit: 10 }),
    ).rejects.toThrow(RangeError);
  });

  it("giữ bản sao: sửa mảng đầu vào sau khi tạo không ảnh hưởng", async () => {
    const input = [...transactions];
    const adapter = payment(input);
    input.length = 0;
    expect(await adapter.listTransactions({ limit: 10 })).toHaveLength(4);
  });
});

describe("payment/fake: khởi tạo", () => {
  it("từ chối secret rỗng", () => {
    expect(() => createFakePayment({ appEnv: "test", webhookSecret: "" })).toThrow();
  });

  it.each(["staging", "production"] as const)("từ chối APP_ENV=%s", (appEnv) => {
    expect(() => createFakePayment({ appEnv, webhookSecret: SECRET })).toThrow(/adapter giả/);
  });
});
