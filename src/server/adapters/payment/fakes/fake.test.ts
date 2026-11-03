import { createHmac } from "node:crypto";
import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import { createFakePayment } from "@/server/adapters/payment/fakes/fake";
import type {
  BankTransaction,
  PaymentProviderPort,
  VerifiedWebhook,
} from "@/server/adapters/payment/port";
import { AppError } from "@/server/lib/errors";
import { sanitizeForLog } from "@/server/lib/logger";

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

/** Webhook đã xác thực bởi chính `adapter`, cách duy nhất để có đầu vào cho `parseWebhook`. */
async function verified(adapter: PaymentProviderPort, body: string): Promise<VerifiedWebhook> {
  const result = await adapter.verifyWebhook({ headers: sign(body), rawBody: body });
  if (!result.ok) {
    throw new Error(`webhook thử phải hợp lệ, nhận ${result.reason}`);
  }
  return result.webhook;
}

async function parse(body: string): Promise<BankTransaction> {
  const adapter = payment();
  return adapter.parseWebhook(await verified(adapter, body));
}

describe("payment/fake: verifyWebhook", () => {
  it("chữ ký đúng → hợp lệ, trả webhook đã xác thực (đóng băng, không có thuộc tính nào)", async () => {
    const result = await payment().verifyWebhook({ headers: sign(BODY), rawBody: BODY });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.webhook)).toBe(true);
      expect(Reflect.ownKeys(result.webhook)).toStrictEqual([]);
    }
  });

  // CLAUDE.md bất biến 14: ghi log hay audit kết quả xác thực (việc rất tự nhiên ở route webhook)
  // không được kéo theo nguyên body.
  it("log, JSON hay inspect kết quả xác thực không lộ body webhook", async () => {
    const result = await payment().verifyWebhook({ headers: sign(BODY), rawBody: BODY });
    const texts = [
      JSON.stringify(result),
      JSON.stringify(sanitizeForLog({ result })),
      inspect(result, { depth: 10, showHidden: true }),
    ];
    for (const text of texts) {
      expect(text).not.toContain("Vietcombank");
      expect(text).not.toContain("TVM2345ABCD");
    }
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
  it("chuẩn hóa thành BankTransaction", async () => {
    expect(await parse(BODY)).toStrictEqual({
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

  it("code và referenceCode có thể null; transferType out", async () => {
    const tx = await parse(
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
  ])("%s → AppError VALIDATION_FAILED", async (_label, patch) => {
    const error: unknown = await parse(JSON.stringify({ ...PAYLOAD, ...patch })).catch(
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe("VALIDATION_FAILED");
    expect((error as AppError).cause).toBeUndefined();
  });

  it("body không phải JSON → AppError VALIDATION_FAILED", async () => {
    await expect(parse("{")).rejects.toThrow(AppError);
  });

  // CLAUDE.md bất biến 3: không có đường nào đọc giao dịch từ body chưa qua verifyWebhook.
  it("từ chối object tự dựng hay ép kiểu, kể cả khi body đúng định dạng", () => {
    const adapter = payment();
    const forged = [
      { rawBody: BODY },
      Object.freeze({ rawBody: BODY }),
      // Cùng hình dạng với object thật (rỗng, đóng băng) nhưng không do verifyWebhook cấp.
      Object.freeze({}),
      BODY,
      null,
      undefined,
    ] as unknown as VerifiedWebhook[];
    for (const webhook of forged) {
      expect(() => adapter.parseWebhook(webhook)).toThrow(TypeError);
    }
  });

  it("từ chối webhook do adapter KHÁC xác thực", async () => {
    const webhook = await verified(payment(), BODY);
    expect(() => payment().parseWebhook(webhook)).toThrow(TypeError);
  });

  it("không sửa được body sau khi đã xác thực", async () => {
    const adapter = payment();
    const webhook = await verified(adapter, BODY);
    const tampered = BODY.replace("150000", "15000000");
    expect(() => {
      (webhook as unknown as { rawBody: string }).rawBody = tampered;
    }).toThrow(TypeError);
    expect(adapter.parseWebhook(webhook).amountVnd).toBe(150000);
  });
});

describe("payment/fake: listTransactions", () => {
  const transactions: BankTransaction[] = ["1", "2", "3", "4"].map((id) => ({
    providerTransactionId: id,
    gateway: "Vietcombank",
    occurredAt: new Date("2026-10-19T02:00:00Z"),
    accountNumber: "0123456789",
    direction: "in",
    amountVnd: 150000,
    content: "TVM2345ABCD chuyen tien",
    paymentCode: "TVM2345ABCD",
    referenceCode: "FT26292000001",
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
