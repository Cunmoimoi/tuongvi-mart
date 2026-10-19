import "server-only";
import type { SmsPort } from "@/server/adapters/sms/port";
import { NotImplementedError } from "@/server/lib/errors";

// Adapter SMS thật: chưa làm. Nhà cung cấp chưa chốt (câu hỏi mở Q6 trong docs/README.md); `esms`
// là tên giữ chỗ theo ARCHITECTURE. Khi chốt: đổi tên file và tên trong providers.ts, thêm biến
// khóa API vào env.ts (bắt buộc ở staging/production), nhận `fetch` qua cấu hình như các adapter khác.

const ID = "sms/esms";

export function createEsmsSms(): SmsPort {
  return {
    provider: "esms",
    async sendOtp() {
      throw new NotImplementedError(`${ID}.sendOtp`);
    },
    async sendMessage() {
      throw new NotImplementedError(`${ID}.sendMessage`);
    },
  };
}
