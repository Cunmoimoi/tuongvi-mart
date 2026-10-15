import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE_ENV, CONFIGURED_SERVICES, UNCONFIGURED_SERVICES } from "./helpers/base-env";
import { startNextServer, type RunningServer } from "./helpers/next-server";

// Test HTTP gọi vào bản build thật (`next start`): chạy `pnpm build` rồi `pnpm test:http`.
// Chứng minh: /dev/ui chỉ có khi APP_ENV=local (môi trường khác trả 404), và font chữ được tự host.

const SCENARIOS = {
  local: {
    ...BASE_ENV,
    ...UNCONFIGURED_SERVICES,
    APP_ENV: "local",
    APP_URL: "http://localhost:3000",
  },
  test: {
    ...BASE_ENV,
    ...UNCONFIGURED_SERVICES,
    APP_ENV: "test",
    APP_URL: "http://localhost:3000",
  },
  staging: {
    ...BASE_ENV,
    ...CONFIGURED_SERVICES,
    APP_ENV: "staging",
    APP_URL: "https://staging.example.test",
  },
  production: {
    ...BASE_ENV,
    ...CONFIGURED_SERVICES,
    APP_ENV: "production",
    APP_URL: "https://shop.example.test",
  },
} as const;

type ScenarioName = keyof typeof SCENARIOS;

const GALLERY_TITLE = "Bộ component giao diện";
const servers = {} as Record<ScenarioName, RunningServer>;

beforeAll(async () => {
  const names = Object.keys(SCENARIOS) as ScenarioName[];
  const started = await Promise.allSettled(names.map((name) => startNextServer(SCENARIOS[name])));
  const failed = started.find((result) => result.status === "rejected");
  // Nếu có server không lên được thì dừng các server đã lên rồi mới báo lỗi, tránh để sót tiến trình.
  if (failed) {
    await Promise.all(
      started.map((result) => (result.status === "fulfilled" ? result.value.stop() : undefined)),
    );
    throw failed.reason;
  }
  started.forEach((result, index) => {
    const name = names[index];
    if (name && result.status === "fulfilled") {
      servers[name] = result.value;
    }
  });
});

afterAll(async () => {
  await Promise.all(Object.values(servers).map((server) => server.stop()));
});

async function get(scenario: ScenarioName, path: string) {
  const response = await fetch(servers[scenario].baseUrl + path, { redirect: "manual" });
  return { response, body: await response.text() };
}

describe("/dev/ui chỉ có ở APP_ENV=local", () => {
  it("local: trả 200 và có bộ component", async () => {
    const { response, body } = await get("local", "/dev/ui");
    expect(response.status).toBe(200);
    expect(body).toContain(GALLERY_TITLE);
  });

  it.each(["test", "staging", "production"] as const)(
    "%s: trả 404 và không lộ nội dung trang",
    async (scenario) => {
      const { response, body } = await get(scenario, "/dev/ui");
      expect(response.status).toBe(404);
      expect(body).not.toContain(GALLERY_TITLE);
      expect(body).not.toContain("QuantityStepper");
    },
  );

  it.each(["test", "staging", "production"] as const)(
    "%s: 404 vẫn có đủ header bảo mật",
    async (scenario) => {
      const { response } = await get(scenario, "/dev/ui");
      expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    },
  );
});

describe("font chữ tự host và viewport", () => {
  it("HTML không tham chiếu Google Fonts; font phục vụ từ /_next/static/media của chính site", async () => {
    const { response, body } = await get("local", "/dev/ui");
    expect(response.status).toBe(200);
    expect(body).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);

    // CSS: @font-face chỉ trỏ vào file cùng origin (/_next/static/media), không tới Google.
    const cssPaths = [...body.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]);
    expect(cssPaths.length).toBeGreaterThan(0);
    const fontUrls: string[] = [];
    let css = "";
    for (const cssPath of cssPaths) {
      const cssUrl = new URL(cssPath ?? "", servers.local.baseUrl);
      const text = await (await fetch(cssUrl)).text();
      css += text;
      // Next ghi url tương đối (../media/xxx.woff2): quy về URL tuyệt đối theo vị trí file CSS.
      for (const match of text.matchAll(/url\(([^)]+\.woff2)\)/g)) {
        fontUrls.push(new URL(match[1] ?? "", cssUrl).toString());
      }
    }
    expect(css).toContain("@font-face");
    expect(css).toContain("Be Vietnam Pro");
    expect(css).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);

    expect(fontUrls.length, "phải có file woff2 tự host").toBeGreaterThan(0);
    for (const fontUrl of fontUrls) {
      expect(new URL(fontUrl).origin).toBe(new URL(servers.local.baseUrl).origin);
      expect(fontUrl).toContain("/_next/static/media/");
    }
    const font = await fetch(fontUrls[0] ?? "");
    expect(font.status).toBe(200);
    expect(font.headers.get("content-type")).toMatch(/font\/woff2|application\/octet-stream/);

    // CSP không có font-src riêng: rơi về default-src 'self', đủ cho font tự host.
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toMatch(/(^|;\s*)font-src/);
  });

  it("viewport cho phép phóng to (không maximum-scale, không user-scalable)", async () => {
    const { body } = await get("local", "/dev/ui");
    const viewport = body.match(/<meta name="viewport" content="([^"]*)"/)?.[1] ?? "";
    expect(viewport).toContain("width=device-width");
    expect(viewport).toContain("initial-scale=1");
    expect(viewport).not.toMatch(/maximum-scale|user-scalable/i);
  });
});
