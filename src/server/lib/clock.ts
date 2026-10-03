import "server-only";

/**
 * Nguồn thời gian duy nhất cho code nghiệp vụ (hết hạn đơn, cửa sổ rate limit, hạn token...).
 * Hàm cần biết "bây giờ" nhận `clock: Clock = systemClock` làm tham số, để test truyền vào
 * đồng hồ cố định thay vì phải chờ thời gian trôi thật.
 *
 * Cố ý không có `setClock()` toàn cục hay đồng hồ giả trong code production: không có đường
 * nào để chỉnh giờ của cả ứng dụng khi đang chạy (CLAUDE.md bất biến 7 và 8).
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};
