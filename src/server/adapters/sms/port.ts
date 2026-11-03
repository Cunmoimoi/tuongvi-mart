import "server-only";

/**
 * Port gửi SMS (ARCHITECTURE mục 9). OTP do Supabase Auth sinh và chuyển tới qua Send SMS Hook;
 * adapter chỉ gửi đi. Adapter không bao giờ ghi OTP hay SĐT đầy đủ ra log (CLAUDE.md bất biến 14);
 * ngoại lệ duy nhất là adapter giả `console` in OTP khi APP_ENV=local để lập trình viên đăng nhập.
 */

export interface SmsOtp {
  /** SĐT nhận, dạng E.164 (`+84901234567`). */
  readonly phone: string;
  readonly code: string;
}

export interface SmsMessage {
  readonly phone: string;
  readonly text: string;
}

export interface SmsPort {
  readonly provider: string;
  sendOtp(otp: SmsOtp): Promise<void>;
  sendMessage(message: SmsMessage): Promise<void>;
}
