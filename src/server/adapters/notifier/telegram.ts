import "server-only";
import type { NotifierPort } from "@/server/adapters/notifier/port";
import { assertConfigured } from "@/server/adapters/select";
import { NotImplementedError } from "@/server/lib/errors";

// Adapter Telegram: chưa làm. Khi làm: nội dung dựng bằng `formatOwnerAlert`; URL gọi API chứa
// nguyên bot token (`/bot<token>/sendMessage`) nên không bao giờ đưa URL, request hay lỗi gốc của
// `fetch` vào log hoặc vào lỗi ném ra. Cho tới lúc đó `notifyOwner` ném NotImplementedError.

export interface TelegramConfig {
  readonly botToken: string;
  readonly chatId: string;
  readonly fetch: typeof fetch;
}

const ID = "notifier/telegram";

export function createTelegramNotifier(config: TelegramConfig): NotifierPort {
  assertConfigured(config, ID);
  return {
    provider: "telegram",
    async notifyOwner() {
      throw new NotImplementedError(`${ID}.notifyOwner`);
    },
  };
}
