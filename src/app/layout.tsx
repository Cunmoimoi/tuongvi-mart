import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="vi" className="h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
