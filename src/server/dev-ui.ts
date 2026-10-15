import "server-only";
import { notFound } from "next/navigation";
import { env, type AppEnv } from "@/server/env";

/**
 * Trang `/dev/ui` (bộ component ở mọi trạng thái) chỉ tồn tại khi `APP_ENV=local`. Môi trường
 * khác (test, staging, production) coi như không có trang này và trả 404, kể cả khi ai đó biết
 * đường dẫn. Hàm thuần để test được từng giá trị `AppEnv`.
 */
export function isDevUiEnabled(appEnv: AppEnv): boolean {
  return appEnv === "local";
}

/**
 * Gọi ở đầu mọi trang dưới `/dev/`. Không phải `local` thì ném `notFound()` (HTTP 404) trước khi
 * dựng bất cứ nội dung nào. Đây là kiểm tra trong chính trang, không dựa vào `proxy.ts`
 * (CLAUDE.md bất biến 2).
 */
export function assertDevUiEnabled(appEnv: AppEnv = env.APP_ENV): void {
  if (!isDevUiEnabled(appEnv)) {
    notFound();
  }
}
