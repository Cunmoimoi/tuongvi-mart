import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import localPlugin from "./eslint-rules/index.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strict,
  {
    plugins: { local: localPlugin },
    rules: {
      "local/no-server-import-in-client": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "xlsx",
              message:
                "Không dùng gói 'xlsx' (rủi ro bảo mật đã biết, xem ROADMAP). Nêu phương án thay thế và chờ đồng ý trước khi dùng.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores của eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "docs/reference/**"]),
]);

export default eslintConfig;
