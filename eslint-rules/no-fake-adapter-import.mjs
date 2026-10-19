import path from "node:path";

/**
 * Adapter giả (`src/server/adapters/<port>/fakes/*`) chỉ được import từ:
 * - `src/server/adapters/<port>/index.ts` của CHÍNH port đó, nơi duy nhất chọn adapter;
 * - file test (`*.test.ts`, `*.test.tsx`, `*.test.mts`) và thư mục `tests/`;
 * - các file khác trong cùng thư mục `fakes/` đó.
 * Ngoài ra là lối tắt dùng adapter giả mà bỏ qua hàm chọn (CLAUDE.md bất biến 7, ARCHITECTURE mục 9).
 * Kiểm cả `import`, `export ... from`, `export * from` và `import("...")` với chuỗi cố định.
 *
 * @type {import("eslint").Rule.RuleModule}
 */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Chỉ index.ts của port và test được import adapter giả trong src/server/adapters/<port>/fakes/.",
    },
    schema: [],
    messages: {
      forbidden:
        'Không import adapter giả "{{source}}" ở đây. Lấy adapter qua src/server/adapters/{{port}}/index.ts ' +
        "(hàm chọn theo APP_ENV), chỉ index.ts của port và test được import thẳng adapter giả.",
    },
  },
  create(context) {
    const cwd = context.cwd;
    const file = toPosix(path.relative(cwd, context.filename));
    const fileDir = path.posix.dirname(file);
    const isTest = /\.test\.(ts|tsx|mts)$/.test(file) || file.startsWith("tests/");

    /** Đường dẫn (tính từ gốc dự án) mà `source` trỏ tới, hoặc null nếu là gói npm. */
    function resolveSource(source) {
      if (source.startsWith("@/")) {
        return path.posix.normalize(`src/${source.slice(2)}`);
      }
      if (source.startsWith("./") || source.startsWith("../")) {
        return path.posix.normalize(path.posix.join(fileDir, source));
      }
      return null;
    }

    function check(node, sourceNode) {
      if (!sourceNode || sourceNode.type !== "Literal" || typeof sourceNode.value !== "string") {
        return;
      }
      const target = resolveSource(sourceNode.value);
      const match = target?.match(/^src\/server\/adapters\/([^/]+)\/fakes(?:\/|$)/);
      if (!match) {
        return;
      }
      const port = match[1];
      const allowed =
        isTest ||
        file === `src/server/adapters/${port}/index.ts` ||
        file.startsWith(`src/server/adapters/${port}/fakes/`);
      if (!allowed) {
        context.report({ node, messageId: "forbidden", data: { source: sourceNode.value, port } });
      }
    }

    return {
      ImportDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => check(node, node.source),
      ExportAllDeclaration: (node) => check(node, node.source),
      ImportExpression: (node) => check(node, node.source),
    };
  },
};

function toPosix(value) {
  return value.split(path.sep).join("/");
}

export default rule;
