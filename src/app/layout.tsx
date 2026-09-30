import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="h-full">
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
