import { describe, expect, it } from "vitest";
import { providerKind, providerNames } from "@/server/adapters/providers";
import { FAKE_ADAPTER_APP_ENVS } from "@/server/adapters/select";
import { selectStorageAdapter } from "@/server/adapters/storage";
import type { PublicBucket, StorageBucket, UploadBucket } from "@/server/adapters/storage/port";
import type { AppEnv } from "@/server/env";
import { NotImplementedError } from "@/server/lib/errors";
import {
  adapterEnv,
  createNetworkGuard,
  createWriteSink,
  errorTexts,
  findLeaks,
  settle,
  TEST_SECRETS,
} from "../../../../tests/helpers/adapters";

// Hợp đồng chung cho MỌI adapter lưu trữ (SECURITY T19): chỉ bucket `incoming` nhận file tải lên,
// bucket riêng tư không có URL công khai, đường dẫn object không thoát ra ngoài bucket.

const ALL_APP_ENVS: readonly AppEnv[] = ["local", "test", "staging", "production"];

const CASES = providerNames("storage").flatMap((provider) =>
  (providerKind("storage", provider) === "fake" ? FAKE_ADAPTER_APP_ENVS : ALL_APP_ENVS).map(
    (appEnv) => ({ provider, appEnv }),
  ),
);

const UNSAFE_PATHS = [
  "",
  ".",
  "..",
  "../etc/passwd",
  "images/../../secret.jpg",
  "/images/a.jpg",
  "images//a.jpg",
  "images/./a.jpg",
  "images/a.jpg/",
  "images\\a.jpg",
  "images/a b.jpg",
  "images/%2e%2e/a.jpg",
  "images/a\u0000.jpg",
  "ảnh/a.jpg",
  `images/${"a".repeat(300)}.jpg`,
];

function build(provider: string, appEnv: AppEnv) {
  const network = createNetworkGuard();
  const adapter = selectStorageAdapter(
    adapterEnv({ APP_ENV: appEnv, STORAGE_PROVIDER: provider as "supabase" | "memory" }),
    { fetch: network.fetch, write: createWriteSink().write },
  );
  return { adapter, network };
}

describe.each(CASES)("hợp đồng storage/$provider (APP_ENV=$appEnv)", ({ provider, appEnv }) => {
  it("createSignedUpload chỉ nhận bucket incoming", async () => {
    const { adapter } = build(provider, appEnv);
    const outcome = await settle(() =>
      adapter.createSignedUpload({ bucket: "media" as UploadBucket, path: "images/a.jpg" }),
    );
    expect(outcome.ok).toBe(false);
  });

  it("getPublicUrl từ chối bucket riêng tư", async () => {
    const { adapter } = build(provider, appEnv);
    const outcome = await settle(() =>
      adapter.getPublicUrl({ bucket: "incoming" as PublicBucket, path: "images/a.jpg" }),
    );
    expect(outcome.ok).toBe(false);
  });

  it("delete từ chối bucket không có trong danh sách", async () => {
    const { adapter } = build(provider, appEnv);
    const outcome = await settle(() =>
      adapter.delete({ bucket: "private-backups" as StorageBucket, paths: ["a.jpg"] }),
    );
    expect(outcome.ok).toBe(false);
  });

  it.each(UNSAFE_PATHS)("mọi thao tác từ chối đường dẫn không an toàn %j", async (path) => {
    const { adapter } = build(provider, appEnv);
    const outcomes = [
      await settle(() => adapter.createSignedUpload({ bucket: "incoming", path })),
      await settle(() => adapter.getPublicUrl({ bucket: "media", path })),
      await settle(() => adapter.delete({ bucket: "incoming", paths: ["images/ok.jpg", path] })),
    ];
    expect(outcomes.map((outcome) => outcome.ok)).toStrictEqual([false, false, false]);
  });

  it("URL công khai không chứa token hay secret", async () => {
    const { adapter } = build(provider, appEnv);
    const outcome = await settle(() =>
      adapter.getPublicUrl({ bucket: "media", path: "images/a.webp" }),
    );
    if (outcome.ok) {
      expect(outcome.value).not.toMatch(/token|sign|secret/i);
      expect(findLeaks([outcome.value], Object.values(TEST_SECRETS))).toStrictEqual([]);
    } else {
      expect(outcome.error).toBeInstanceOf(NotImplementedError);
    }
  });

  it("lỗi ném ra không lộ secret, và không gọi mạng", async () => {
    const { adapter, network } = build(provider, appEnv);
    const outcomes = [
      await settle(() => adapter.createSignedUpload({ bucket: "incoming", path: "../x" })),
      await settle(() => adapter.createSignedUpload({ bucket: "incoming", path: "images/a.jpg" })),
      await settle(() => adapter.getPublicUrl({ bucket: "media", path: "images/a.webp" })),
      await settle(() => adapter.delete({ bucket: "incoming", paths: ["images/a.jpg"] })),
    ];
    const texts = outcomes.flatMap((outcome) => (outcome.ok ? [] : errorTexts(outcome.error)));
    expect(findLeaks(texts, Object.values(TEST_SECRETS))).toStrictEqual([]);
    expect(network.calls).toStrictEqual([]);
  });
});
