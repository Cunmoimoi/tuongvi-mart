import "server-only";

/**
 * Nơi khai báo bảng Drizzle của schema `app`.
 * Mỗi module thêm một file riêng ở thư mục này rồi re-export tại đây; drizzle-kit đọc file này
 * để sinh migration (xem drizzle.config.ts).
 */
export { APP_SCHEMA, appSchema } from "./app-schema";
export { rateLimits } from "./rate-limits";
