/**
 * Cấm import từ "@/server/*" hoặc "server-only" trong file có chỉ thị "use client".
 * Client Component chạy trong trình duyệt: import code server vào đây là rò rỉ
 * secret hoặc logic nghiệp vụ có thẩm quyền ra client (xem CLAUDE.md, bất biến #6).
 *
 * @type {import("eslint").Rule.RuleModule}
 */
const rule = {
  meta: {
    type: "problem",
    docs: {
      description:
        'Cấm import "@/server/*" hoặc "server-only" trong file Client Component ("use client").',
    },
    schema: [],
    messages: {
      forbidden:
        'File Client Component ("use client") không được import "{{source}}". ' +
        "Chuyển logic này vào Server Component hoặc Server Action.",
    },
  },
  create(context) {
    let isClientComponent = false;

    return {
      Program(node) {
        const first = node.body[0];
        isClientComponent =
          first !== undefined &&
          first.type === "ExpressionStatement" &&
          first.expression.type === "Literal" &&
          first.expression.value === "use client";
      },
      ImportDeclaration(node) {
        if (!isClientComponent) return;
        const source = node.source.value;
        if (typeof source !== "string") return;
        if (source === "server-only" || source === "@/server" || source.startsWith("@/server/")) {
          context.report({ node, messageId: "forbidden", data: { source } });
        }
      },
    };
  },
};

export default rule;
