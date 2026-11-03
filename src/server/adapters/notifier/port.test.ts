import { describe, expect, it } from "vitest";
import {
  formatOwnerAlert,
  MAX_OWNER_ALERT_LENGTH,
  maskAddress,
} from "@/server/adapters/notifier/port";

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

  // Tọa độ chính xác hơn cả địa chỉ: ẩn hẳn, không giữ phần nào (kể cả dạng chuỗi "lat, lng").
  it("ẩn hẳn tọa độ và vị trí (lat, lng, latitude, coordinates, location, geo, toaDo...)", () => {
    const text = formatOwnerAlert({
      event: "order.created",
      title: "Đơn mới",
      details: {
        lat: 10.776889,
        lng: 106.700806,
        deliveryLat: 10.776889,
        latitude: "10.776889",
        longitude: "106.700806",
        coordinates: [10.776889, 106.700806],
        location: "10.776889, 106.700806",
        geo: { lat: 10.776889, lon: 106.700806 },
        gpsPoint: "10.776889,106.700806",
        toaDo: "10.776889, 106.700806",
        viTri: "10.776889, 106.700806",
        orderCode: "TVM2345ABCD",
      },
    });
    expect(text).not.toMatch(/10\.776|106\.700/);
    expect(text).toContain("lat: [ĐÃ ẨN]");
    expect(text).toContain("location: [ĐÃ ẨN]");
    expect(text).toContain("orderCode: TVM2345ABCD");
  });

  it("không ẩn nhầm khóa thường có chứa chữ lat/lng (template, platform, translated)", () => {
    const text = formatOwnerAlert({
      event: "x",
      title: "y",
      details: { template: "a", platform: "web", translated: true },
    });
    expect(text).toBe("[x] y\ntemplate: a\nplatform: web\ntranslated: true");
  });

  it("nhận khóa tọa độ ở mọi kiểu đặt tên (snake_case, kebab-case, viết hoa)", () => {
    const text = formatOwnerAlert({
      event: "x",
      title: "y",
      details: {
        delivery_lat: 10.776889,
        "toa-do": "10.776889, 106.700806",
        GPSPoint: "10.776889,106.700806",
        vi_tri: "10.776889, 106.700806",
        latLng: [10.776889, 106.700806],
      },
    });
    expect(text).not.toMatch(/10\.776|106\.700/);
  });

  it("khóa mơ hồ (location, viTri) chứa tọa độ ở dạng số, mảng hay object lồng thì vẫn ẩn", () => {
    const text = formatOwnerAlert({
      event: "x",
      title: "y",
      details: {
        location: [10.776889, 106.700806],
        pickupLocation: 106.700806,
        storeLocation: { name: "Kho Quận 1", lat: 10.776889, lng: 106.700806 },
        viTri: { x: "10.776889", y: "106.700806" },
      },
    });
    expect(text).not.toMatch(/10\.776|106\.700/);
    expect(text).toContain("location: [ĐÃ ẨN]");
  });

  // Nghiệp vụ chọn kho, tồn kho dùng các khóa này: ẩn nhầm thì chủ shop mất đúng thông tin cần.
  it("không ẩn nhầm khóa nghiệp vụ (tên kho, phân bổ tồn, người điều phối, vị trí kệ...)", () => {
    const details = {
      storeLocation: "Kho Quận 1",
      location: "Kho Thủ Đức",
      viTri: "Kệ A3",
      stockAllocation: 12,
      relocation: "chuyển kho",
      coordinatorName: "An",
      salon: "a",
      longDescription: "mô tả",
      geography: "miền Nam",
      shelfLocation: 3,
    };
    const text = formatOwnerAlert({ event: "inventory.alert", title: "Tồn kho", details });
    expect(text).not.toContain("[ĐÃ ẨN]");
    for (const value of Object.values(details)) {
      expect(text).toContain(`: ${value}`);
    }
  });

  // Nội dung chuyển khoản do người chuyển tự gõ: không được tạo dòng mới hay đảo chiều chữ để giả
  // một cảnh báo khác trong cùng tin.
  it.each([
    ["xuống dòng", "\n"],
    ["về đầu dòng", "\r"],
    ["CRLF", "\r\n"],
    ["phân cách dòng Unicode", "\u2028"],
    ["phân cách đoạn Unicode", "\u2029"],
    ["tab dọc", "\v"],
    ["NEL", "\u0085"],
  ])("ký tự %s trong dữ liệu không tạo được dòng mới", (_label, breaker) => {
    const forged = `abc${breaker}[payment.paid] Đã nhận đủ tiền đơn TVM9999ZZZZ`;
    const text = formatOwnerAlert({
      event: `payment.exception${breaker}x`,
      title: `Giao dịch cần xử lý${breaker}y`,
      details: { content: forged, [`key${breaker}[fake]`]: "v" },
    });
    const lines = text.split(/\r\n|[\n\r\v\f\u0085\u2028\u2029]/);
    expect(lines).toHaveLength(3);
    expect(lines.filter((line) => line.startsWith("["))).toHaveLength(1);
    expect(text).toContain("[payment.paid] Đã nhận đủ tiền");
  });

  it("bỏ ký tự đổi chiều chữ, ký tự vô hình và ký tự điều khiển", () => {
    const text = formatOwnerAlert({
      event: "payment.exception",
      title: "Cảnh báo",
      details: { content: "a\u202Eb\u2066c\u200Bd\u0000e\u001Bf\u061Cg\u200Fh" },
    });
    expect(text).not.toMatch(/[\u202E\u2066\u200B\u0000\u001B\u061C\u200F]/);
    expect(text).toContain("content: a b c d e f g h");
  });

  // Ép một dòng biến ký tự vô hình thành dấu cách; SĐT bị chèn ký tự đó phải được che SAU bước này,
  // nếu không tin sẽ hiện rõ `0901 234567`.
  it.each([
    ["zero-width", "\u200B"],
    ["NUL", "\u0000"],
    ["ESC", "\u001B"],
    ["đổi chiều chữ", "\u202E"],
  ])("SĐT bị chèn ký tự %s vẫn bị che (tiêu đề, chi tiết, object lồng)", (_label, inserted) => {
    const phone = `0901${inserted}234567`;
    const text = formatOwnerAlert({
      event: "payment.exception",
      title: `Khách ${phone} gọi`,
      details: { content: `goi ${phone}`, nested: { note: phone } },
    });
    expect(text).not.toMatch(/0901\s?234567/);
    expect(text).not.toContain("234567");
    expect(text).toContain("090*");
  });

  it("giữ nguyên chữ tiếng Việt có dấu (kể cả dạng dấu tổ hợp)", () => {
    const decomposed = "Nguye\u0302\u0303n";
    const text = formatOwnerAlert({
      event: "x",
      title: "Tiếng Việt",
      details: { name: decomposed },
    });
    expect(text).toBe(`[x] Tiếng Việt\nname: ${decomposed}`);
  });

  it(`tin dài hơn ${MAX_OWNER_ALERT_LENGTH} ký tự bị cắt bớt, có ghi chú đã cắt`, () => {
    const text = formatOwnerAlert({
      event: "x",
      title: "y",
      details: { content: "a".repeat(10_000) },
    });
    expect(text.length).toBeLessThanOrEqual(MAX_OWNER_ALERT_LENGTH);
    expect(text.startsWith("[x] y\ncontent: aaa")).toBe(true);
    expect(text.endsWith("(đã cắt bớt)")).toBe(true);
  });

  it("cắt bớt không để lại nửa cặp surrogate (emoji)", () => {
    for (let pad = 0; pad < 4; pad += 1) {
      const text = formatOwnerAlert({
        event: "x",
        title: "y".repeat(pad),
        details: { content: "😀".repeat(5_000) },
      });
      expect(text.length).toBeLessThanOrEqual(MAX_OWNER_ALERT_LENGTH);
      expect(text).not.toMatch(
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/,
      );
    }
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
