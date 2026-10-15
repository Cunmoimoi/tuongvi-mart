import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "./globals.css";

// Tự host lúc build: Next.js tải file font về khi `next build` và phục vụ từ /_next/static/media
// của chính site, trình duyệt không gọi Google lúc chạy (nên CSP `default-src 'self'` đủ, không
// cần mở font-src ra ngoài). Trọng lượng theo docs/UI_SPEC.md mục 2.2.
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Tường Vi Mart",
  description: "Tạp hóa online Tường Vi Mart",
};

// Không đặt maximumScale/userScalable: không chặn người dùng phóng to trang
// (docs/UI_SPEC.md mục 2.3).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // CSP dùng nonce riêng cho từng request (src/proxy.ts), và Next.js chỉ gắn nonce vào script
  // lúc render theo request. Trang tĩnh dựng sẵn lúc build không có nonce nên trình duyệt sẽ chặn
  // chính script của Next.js. `connection()` ép mọi trang render động; hệ quả là HTML không còn
  // được CDN cache (ARCHITECTURE.md mục 11: bù bằng cache dữ liệu ở tầng server).
  await connection();

  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
