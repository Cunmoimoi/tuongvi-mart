// Tách Content-Security-Policy thành { tên directive → danh sách nguồn }, dùng chung cho unit test
// (src/server/security) và test HTTP vào server build thật (tests/http).
// Theo spec CSP, directive xuất hiện nhiều lần thì chỉ bản đầu tiên có hiệu lực.
export function parseCsp(header: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const part of header.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name && !directives.has(name.toLowerCase())) {
      directives.set(name.toLowerCase(), sources);
    }
  }
  return directives;
}

/** Lấy giá trị nonce từ nguồn `'nonce-xxx'` của script-src; `undefined` nếu không có. */
export function extractNonce(header: string): string | undefined {
  const scriptSrc = parseCsp(header).get("script-src") ?? [];
  const source = scriptSrc.find((item) => item.startsWith("'nonce-"));
  return source?.slice("'nonce-".length, -1);
}
