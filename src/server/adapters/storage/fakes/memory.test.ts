import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "@/server/adapters/storage/fakes/memory";

// Adapter giả `memory`: giữ danh sách file trong bộ nhớ, không gọi Supabase. URL có scheme
// `memory://` để không ai nhầm là URL thật.

const NOW = new Date("2026-10-19T02:00:00Z");
const clock = { now: () => NOW };

describe("storage/memory", () => {
  it("createSignedUpload: URL có token ngẫu nhiên, hết hạn sau 2 giờ", async () => {
    const storage = createMemoryStorage({ appEnv: "test", clock });
    const first = await storage.createSignedUpload({ bucket: "incoming", path: "images/a.jpg" });
    const second = await storage.createSignedUpload({ bucket: "incoming", path: "images/b.jpg" });

    expect(first.bucket).toBe("incoming");
    expect(first.path).toBe("images/a.jpg");
    expect(first.url).toBe(`memory://incoming/images/a.jpg?token=${first.token}`);
    expect(first.token.length).toBeGreaterThanOrEqual(43);
    expect(first.token).not.toBe(second.token);
    expect(first.expiresAt).toStrictEqual(new Date("2026-10-19T04:00:00Z"));
  });

  it("delete xóa file đã ghi nhận; xóa file không tồn tại thì bỏ qua", async () => {
    const storage = createMemoryStorage({ appEnv: "local", clock });
    await storage.createSignedUpload({ bucket: "incoming", path: "images/a.jpg" });
    expect(storage.has("incoming", "images/a.jpg")).toBe(true);

    await storage.delete({ bucket: "incoming", paths: ["images/a.jpg", "images/khong-co.jpg"] });
    expect(storage.has("incoming", "images/a.jpg")).toBe(false);
  });

  it("file cùng đường dẫn ở bucket khác là file khác", async () => {
    const storage = createMemoryStorage({ appEnv: "test", clock });
    await storage.createSignedUpload({ bucket: "incoming", path: "images/a.jpg" });
    await storage.delete({ bucket: "media", paths: ["images/a.jpg"] });
    expect(storage.has("incoming", "images/a.jpg")).toBe(true);
  });

  it("getPublicUrl trả URL memory:// của bucket media, không có token", () => {
    const storage = createMemoryStorage({ appEnv: "test", clock });
    expect(storage.getPublicUrl({ bucket: "media", path: "images/a.webp" })).toBe(
      "memory://media/images/a.webp",
    );
  });

  it.each(["staging", "production"] as const)("từ chối APP_ENV=%s", (appEnv) => {
    expect(() => createMemoryStorage({ appEnv })).toThrow(/adapter giả/);
  });
});
