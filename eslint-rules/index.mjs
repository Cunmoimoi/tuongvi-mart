import noFakeAdapterImport from "./no-fake-adapter-import.mjs";
import noServerImportInClient from "./no-server-import-in-client.mjs";

/** Plugin ESLint nội bộ (không phải gói npm) cho các rule riêng của dự án. */
const localPlugin = {
  rules: {
    "no-server-import-in-client": noServerImportInClient,
    "no-fake-adapter-import": noFakeAdapterImport,
  },
};

export default localPlugin;
