import type { NextConfig } from "next";

// Ảnh sản phẩm chỉ được phép tải từ domain Supabase Storage của chính dự án.
// SUPABASE_URL chưa cấu hình (chưa chạy `supabase start`, hoặc chưa deploy) thì
// danh sách domain cho phép để trống — mặc định từ chối, không đoán domain.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  // Tắt việc `next dev` tự chèn/ghi lại khối "nextjs-agent-rules" vào CLAUDE.md và tạo AGENTS.md
  // (guide ai-agents, mục "Opting out"). Quy tắc cho agent do dự án tự quản lý trong CLAUDE.md.
  agentRules: false,
  images: {
    // Các chiều rộng này CHÍNH LÀ chiều rộng các bản ảnh của preset (src/lib/images/presets.ts;
    // có test so khớp). Nhờ vậy `srcset` do next/image sinh chỉ gồm cỡ thật, không có cỡ thừa.
    imageSizes: [120, 160, 240, 320],
    deviceSizes: [480, 750, 800, 1040, 1200, 1560],
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
