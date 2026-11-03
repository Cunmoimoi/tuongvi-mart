import "server-only";
import type { SmsMessage, SmsOtp, SmsPort } from "@/server/adapters/sms/port";
import { assertFakeAdapterAllowed } from "@/server/adapters/select";
import type { AppEnv } from "@/server/env";
import { maskPhone, sanitizeForLog } from "@/server/lib/logger";

// ADAPTER GIẢ, chỉ nạp được khi APP_ENV là local hoặc test. Không gửi SMS, chỉ in ra console:
// - local: in OTP và nội dung tin để lập trình viên đăng nhập, thử luồng được;
// - test: không in OTP hay nội dung (log CI nhiều người đọc được), chỉ in SĐT đã che.
// SĐT luôn bị che như logger (CLAUDE.md bất biến 14).

const ID = "sms/console";

export interface ConsoleSmsOptions {
  readonly appEnv: AppEnv;
  readonly write?: (line: string) => void;
}

export function createConsoleSms(options: ConsoleSmsOptions): SmsPort {
  assertFakeAdapterAllowed(options.appEnv, ID);
  const write = options.write ?? ((line: string) => console.info(line));
  const showContent = options.appEnv === "local";

  return {
    provider: "console",
    async sendOtp({ phone, code }: SmsOtp) {
      const content = showContent ? `mã ${code}` : "mã ẩn (chỉ in khi APP_ENV=local)";
      write(`[${ID}] OTP tới ${maskPhone(phone)}: ${content}`);
    },
    async sendMessage({ phone, text }: SmsMessage) {
      const content = showContent
        ? String(sanitizeForLog(text))
        : `${text.length} ký tự, nội dung ẩn (chỉ in khi APP_ENV=local)`;
      write(`[${ID}] Tin nhắn tới ${maskPhone(phone)}: ${content}`);
    },
  };
}
