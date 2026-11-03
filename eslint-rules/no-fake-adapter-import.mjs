import path from "node:path";

/**
 * Adapter giả (`src/server/adapters/<port>/fakes/*`) chỉ được import từ:
 * - `src/server/adapters/<port>/index.ts` của CHÍNH port đó, nơi duy nhất chọn adapter;
 * - file test (`*.test.ts`, `*.test.tsx`, `*.test.mts`) và thư mục `tests/`;
 * - các file khác trong cùng thư mục `fakes/` đó.
 * Ngoài ra là lối tắt dùng adapter giả mà bỏ qua hàm chọn (CLAUDE.md bất biến 7, ARCHITECTURE mục 9).
 * Kiểm cả `import`, `export ... from`, `export * from`, `import(...)` và `require(...)`, với chuỗi
 * cố định hoặc chuỗi template (phần biểu thức coi như `*`: `` `…/fakes/${name}` `` vẫn bị bắt).
 * Đường dẫn tính hoàn toàn lúc chạy (`import(x)`) thì rule không biết được; lớp chặn trong factory
 * của adapter giả vẫn áp dụng.
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

    /** Chuỗi đường dẫn của `sourceNode`; chuỗi template thì phần biểu thức thành `*`. */
    function sourceText(sourceNode) {
      if (sourceNode?.type === "Literal" && typeof sourceNode.value === "string") {
        return sourceNode.value;
      }
      if (sourceNode?.type === "TemplateLiteral") {
        return sourceNode.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join("*");
      }
      return null;
    }

    function check(node, sourceNode) {
      const source = sourceText(sourceNode);
      if (source === null) {
        return;
      }
      const target = resolveSource(source);
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
        context.report({ node, messageId: "forbidden", data: { source, port } });
      }
    }

    return {
      ImportDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => check(node, node.source),
      ExportAllDeclaration: (node) => check(node, node.source),
      ImportExpression: (node) => check(node, node.source),
      // Chỉ `require(...)` gọi trực tiếp, không phải phương thức tên `require` của object khác.
      CallExpression: (node) => {
        if (node.callee.type === "Identifier" && node.callee.name === "require") {
          check(node, node.arguments[0]);
        }
      },
    };
  },
};

function toPosix(value) {
  return value.split(path.sep).join("/");
}

export default rule;
