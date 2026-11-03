import "server-only";

/**
 * Port captcha (ARCHITECTURE mục 9). Nơi gọi coi mọi lỗi ném ra là "không qua" (đóng cửa khi lỗi),
 * kể cả `NotImplementedError` của adapter chưa làm xong.
 */

export interface CaptchaInput {
  /** Token trình duyệt nhận từ widget. */
  readonly token: string;
  readonly remoteIp?: string;
}

export type CaptchaResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "missing-token" | "invalid-token" };

export interface CaptchaPort {
  readonly provider: string;
  verify(input: CaptchaInput): Promise<CaptchaResult>;
}
