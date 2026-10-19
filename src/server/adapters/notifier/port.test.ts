import { describe, expect, it } from "vitest";
import { formatOwnerAlert, maskAddress } from "@/server/adapters/notifier/port";

describe("maskAddress: chỉ giữ phường/xã và tỉnh/thành", () => {
  it.each([
    [
      "12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh",
      "***, Phường Sài Gòn, Thành phố Hồ Chí Minh",
    ],
    ["Số 5 ngõ 10, Tổ 3, Phường Ba Đình, Hà Nội", "***, Phường Ba Đình, Hà Nội"],
    ["  12 Nguyễn Huệ ,  Phường Sài Gòn , TP HCM ", "***, Phường Sài Gòn, TP HCM"],
    // Ít phần hơn: luôn bỏ ít nhất phần đầu (số nhà, tên đường).
    ["Hẻm 7 Lê Lợi, Đà Nẵng", "***, Đà Nẵng"],
    ["12 Nguyễn Huệ", "***"],
    ["", "***"],
    [",,,", "***"],
  ])("%j → %j", (input, expected) => {
    expect(maskAddress(input)).toBe(expected);
  });
});

describe("formatOwnerAlert", () => {
  it("có mã sự kiện, tiêu đề và từng dòng chi tiết", () => {
    const text = formatOwnerAlert({
      event: "payment.exception",
      title: "Giao dịch cần xử lý",
      details: { orderCode: "TVM2345ABCD", amountVnd: 150000, matched: false },
    });
    expect(text).toBe(
      "[payment.exception] Giao dịch cần xử lý\norderCode: TVM2345ABCD\namountVnd: 150000\nmatched: false",
    );
  });

  it("không có chi tiết thì chỉ có một dòng", () => {
    expect(formatOwnerAlert({ event: "system.test", title: "Thử kênh cảnh báo" })).toBe(
      "[system.test] Thử kênh cảnh báo",
    );
  });

  it("che SĐT theo khóa và trong chữ tự do, kể cả ở tiêu đề", () => {
    const text = formatOwnerAlert({
      event: "order.note",
      title: "Khách 0901234567 gọi",
      details: { customerPhone: "+84901234567", note: "gọi lại 0901 234 567 nhé" },
    });
    expect(text).not.toMatch(/901234567|0901 234 567/);
    expect(text).toContain("090****567");
    expect(text).toContain("customerPhone: +84******567");
  });

  it("che địa chỉ theo khóa (address, shippingAddress, diaChi, street...)", () => {
    const address = "12 Nguyễn Huệ, Phường Sài Gòn, Thành phố Hồ Chí Minh";
    const text = formatOwnerAlert({
      event: "order.created",
      title: "Đơn mới",
      details: {
        address,
        shippingAddress: address,
        diaChi: address,
        addressLine1: "12 Nguyễn Huệ",
        street: "Nguyễn Huệ",
      },
    });
    expect(text).not.toContain("12 Nguyễn Huệ");
    expect(text).not.toContain(": Nguyễn Huệ");
    expect(text).toContain("shippingAddress: ***, Phường Sài Gòn, Thành phố Hồ Chí Minh");
    expect(text).toContain("diaChi: ***, Phường Sài Gòn, Thành phố Hồ Chí Minh");
  });

  it("địa chỉ lồng trong object con cũng bị che; địa chỉ không phải chuỗi bị ẩn hẳn", () => {
    const text = formatOwnerAlert({
      event: "order.created",
      title: "Đơn mới",
      details: {
        customer: { name: "An", address: "12 Nguyễn Huệ, Phường Sài Gòn, TP HCM" },
        deliveryAddress: { line: "12 Nguyễn Huệ", ward: "Phường Sài Gòn" },
      },
    });
    expect(text).not.toContain("12 Nguyễn Huệ");
    expect(text).toContain("***, Phường Sài Gòn, TP HCM");
    expect(text).toContain("deliveryAddress: [ĐÃ ẨN]");
  });

  it("bỏ hẳn khóa nhạy cảm như logger (otp, token, password, pin, secret)", () => {
    const text = formatOwnerAlert({
      event: "auth.alert",
      title: "Cảnh báo",
      details: {
        otp: "482913",
        viewToken: "vt-abc",
        password: "hunter2",
        handoverPin: "771204",
        webhookSecret: "whsec",
        orderCode: "TVM2345ABCD",
      },
    });
    expect(text).not.toMatch(/482913|vt-abc|hunter2|771204|whsec/);
    expect(text).not.toMatch(/otp|viewToken|password|handoverPin|webhookSecret/);
    expect(text).toContain("orderCode: TVM2345ABCD");
  });

  it("không sửa object gốc", () => {
    const details = { customerPhone: "0901234567", address: "12 Nguyễn Huệ, P. Sài Gòn, HCM" };
    formatOwnerAlert({ event: "x", title: "y", details });
    expect(details).toStrictEqual({
      customerPhone: "0901234567",
      address: "12 Nguyễn Huệ, P. Sài Gòn, HCM",
    });
  });
});
