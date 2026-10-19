import { describe, expect, it } from "vitest";
import {
  MAX_VISIBLE_TOASTS,
  defaultToastDuration,
  toastReducer,
  type ToastItemData,
} from "@/components/ui/toast";

function toast(id: string): ToastItemData {
  return { id, tone: "info", title: `Thông báo ${id}` };
}

describe("toastReducer", () => {
  it("thêm thông báo vào cuối danh sách", () => {
    const state = toastReducer([toast("1")], { type: "add", toast: toast("2") });
    expect(state.map((item) => item.id)).toStrictEqual(["1", "2"]);
  });

  it("vượt số tối đa thì đẩy cái cũ nhất ra", () => {
    let state: ToastItemData[] = [];
    for (let index = 1; index <= MAX_VISIBLE_TOASTS + 2; index += 1) {
      state = toastReducer(state, { type: "add", toast: toast(String(index)) });
    }
    expect(state).toHaveLength(MAX_VISIBLE_TOASTS);
    expect(state[state.length - 1]?.id).toBe(String(MAX_VISIBLE_TOASTS + 2));
    expect(state.some((item) => item.id === "1")).toBe(false);
  });

  it("đóng đúng thông báo theo id, id lạ thì không đổi gì", () => {
    const state = [toast("1"), toast("2")];
    expect(toastReducer(state, { type: "dismiss", id: "1" }).map((item) => item.id)).toStrictEqual([
      "2",
    ]);
    expect(toastReducer(state, { type: "dismiss", id: "x" })).toHaveLength(2);
  });

  it("không sửa mảng đầu vào", () => {
    const state = Object.freeze([toast("1")]);
    expect(() => toastReducer(state, { type: "add", toast: toast("2") })).not.toThrow();
    expect(() => toastReducer(state, { type: "dismiss", id: "1" })).not.toThrow();
  });
});

describe("defaultToastDuration", () => {
  it("lỗi hiện lâu hơn để kịp đọc", () => {
    expect(defaultToastDuration("error")).toBeGreaterThan(defaultToastDuration("success"));
    expect(defaultToastDuration("info")).toBe(defaultToastDuration("success"));
  });
});
