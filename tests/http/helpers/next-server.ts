import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../..");
const NEXT_BIN = path.join(PROJECT_ROOT, "node_modules", "next", "dist", "bin", "next");
const READY_TIMEOUT_MS = 60_000;

export interface RunningServer {
  baseUrl: string;
  stop: () => Promise<void>;
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

async function waitUntilReady(baseUrl: string, hasExited: () => boolean, output: () => string) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (hasExited()) {
      throw new Error(`Server Next.js tắt ngay khi khởi động:\n${output()}`);
    }
    try {
      await fetch(baseUrl, { redirect: "manual" });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`Server Next.js không sẵn sàng sau ${READY_TIMEOUT_MS / 1000}s:\n${output()}`);
}

/**
 * Chạy `next start` trên bản build thật trong `.next` (cùng thứ mà `pnpm start` chạy).
 * Truyền `env` tường minh cho tiến trình con để kết quả không phụ thuộc biến môi trường của
 * máy chạy test hay file `.env.local`: Next chỉ nạp từ file những biến chưa có sẵn trong env.
 */
export async function startNextServer(env: Record<string, string>): Promise<RunningServer> {
  if (!existsSync(path.join(PROJECT_ROOT, ".next", "BUILD_ID"))) {
    throw new Error("Chưa có bản build. Chạy `pnpm build` trước, rồi chạy lại `pnpm test:http`.");
  }

  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [NEXT_BIN, "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: PROJECT_ROOT,
      env: { ...process.env, ...env, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  let output = "";
  let exited = false;
  child.stdout.on("data", (chunk: Buffer) => (output += chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => (output += chunk.toString()));
  child.once("exit", () => (exited = true));

  const stop = async () => {
    if (exited || child.pid === undefined) {
      return;
    }
    if (process.platform === "win32") {
      // `child.kill()` trên Windows không dừng tiến trình con của nó; /T dừng cả cây.
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
    await new Promise<void>((resolve) => {
      if (exited) {
        resolve();
      } else {
        child.once("exit", () => resolve());
      }
    });
  };

  try {
    await waitUntilReady(
      baseUrl,
      () => exited,
      () => output,
    );
  } catch (error) {
    await stop();
    throw error;
  }

  return { baseUrl, stop };
}
