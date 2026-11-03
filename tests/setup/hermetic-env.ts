// Chạy trước mỗi file test (setupFiles). Adapter giả tự đọc `process.env.VERCEL_ENV` (adapters/select.ts,
// ARCHITECTURE mục 9) nên test không được kế thừa biến này từ máy chạy: lỡ shell, bước build trên
// Vercel hay `vercel env pull` đặt `VERCEL_ENV=preview` thì mọi test nạp adapter giả đều đỏ dù code
// đúng. Xóa thẳng (không dùng `vi.stubEnv`) để `vi.unstubAllEnvs()` trong test trả về trạng thái này.
// Test cần một giá trị cụ thể thì tự `vi.stubEnv("VERCEL_ENV", ...)`.
delete process.env.VERCEL_ENV;
