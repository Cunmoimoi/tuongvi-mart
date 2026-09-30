import "server-only";

/**
 * Nơi khai báo bảng Drizzle của schema `app`.
 * Chưa có bảng nghiệp vụ nào: T0.3 chỉ dựng schema, role, phân quyền và các hàm dùng lại.
 * Từ T2.1 trở đi mỗi module thêm file riêng ở thư mục này rồi re-export tại đây.
 */
export const APP_SCHEMA = "app";
