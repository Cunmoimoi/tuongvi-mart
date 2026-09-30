/**
 * Chặn mọi công cụ có thể tạo/sửa/xóa dữ liệu chạy nhầm vào database thật.
 *
 * Test tích hợp tạo rồi xóa bảng thật trong schema `app` để kiểm tra phân quyền, và
 * script đặt mật khẩu chạy ALTER ROLE. Cả hai chỉ được phép chạm vào Postgres trên máy
 * này. Guard nằm trong code chứ không nằm trong tài liệu, vì tài liệu không chặn được ai.
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export type LocalDbGuardInput = {
  appEnv: string | undefined;
  allowedAppEnvs: readonly string[];
  /** Tên biến môi trường → chuỗi kết nối. Biến chưa đặt bị coi là lỗi. */
  connectionUrls: Readonly<Record<string, string | undefined>>;
};

export type LocalDbConfig = {
  appEnv: string;
  connectionUrls: Record<string, string>;
};

export class LocalDbGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalDbGuardError";
  }
}

function localHostnameProblem(rawUrl: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "chuỗi kết nối không phải URL hợp lệ";
  }
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return `giao thức "${parsed.protocol}" không phải Postgres`;
  }
  // .hostname bỏ dấu ngoặc vuông của IPv6, nên "[::1]" về thành "::1".
  const hostname = parsed.hostname.toLowerCase();
  if (!LOCAL_HOSTNAMES.has(hostname)) {
    return `trỏ tới "${hostname}", không phải localhost hay 127.0.0.1`;
  }
  return undefined;
}

/**
 * Ném LocalDbGuardError nếu không chắc chắn đang trỏ vào database local.
 * Trả về đúng các giá trị đã kiểm tra để nơi gọi dùng tiếp mà không cần kiểm lại.
 */
export function requireLocalDatabase(input: LocalDbGuardInput): LocalDbConfig {
  const problems: string[] = [];
  const connectionUrls: Record<string, string> = {};

  const { appEnv } = input;
  if (appEnv === undefined || !input.allowedAppEnvs.includes(appEnv)) {
    problems.push(
      `APP_ENV phải là một trong [${input.allowedAppEnvs.join(", ")}], đang là ` +
        (appEnv === undefined ? "(chưa đặt)" : `"${appEnv}"`),
    );
  }

  for (const [name, rawUrl] of Object.entries(input.connectionUrls)) {
    if (!rawUrl) {
      problems.push(`${name} chưa được đặt`);
      continue;
    }
    const problem = localHostnameProblem(rawUrl);
    if (problem === undefined) {
      connectionUrls[name] = rawUrl;
    } else {
      problems.push(`${name}: ${problem}`);
    }
  }

  if (problems.length > 0) {
    throw new LocalDbGuardError(
      "Từ chối chạy vì không chắc đang dùng database local:\n" +
        problems.map((problem) => `  - ${problem}`).join("\n") +
        "\nSửa .env.local rồi chạy lại. Không bao giờ trỏ lệnh này vào database thật.",
    );
  }

  // appEnv đã qua kiểm tra ở trên; gán lại cho TypeScript thấy nó không undefined.
  return { appEnv: appEnv as string, connectionUrls };
}

/** Nạp .env.local nếu có. Biến đã có trong môi trường (ví dụ ở CI) được ưu tiên. */
export function loadLocalEnvFile(): void {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Không có .env.local (thường là CI): dùng biến môi trường sẵn có.
  }
}
