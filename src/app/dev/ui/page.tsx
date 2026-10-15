import type { Metadata } from "next";
import { assertDevUiEnabled } from "@/server/dev-ui";
import { UiGallery } from "./ui-gallery";

export const metadata: Metadata = {
  title: "Bộ component (chỉ local)",
  robots: { index: false, follow: false },
};

// Chỉ tồn tại khi APP_ENV=local; môi trường khác trả 404 (xem src/server/dev-ui.ts).
export default function DevUiPage() {
  assertDevUiEnabled();
  return <UiGallery />;
}
