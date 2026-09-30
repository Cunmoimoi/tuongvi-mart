import type { NextConfig } from "next";

// Ảnh sản phẩm chỉ được phép tải từ domain Supabase Storage của chính dự án.
// SUPABASE_URL chưa cấu hình (chưa chạy `supabase start`, hoặc chưa deploy) thì
// danh sách domain cho phép để trống — mặc định từ chối, không đoán domain.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
