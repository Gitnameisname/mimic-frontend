/**
 * Node 런타임 `@/` 경로 별칭 해결 훅.
 *
 * tsc 는 `paths` 를 타입 체크용으로만 쓰고 emit 결과에 경로를 재작성하지 않는다.
 * 따라서 dist-tests/src/components/admin/DataTable.js 는 여전히
 *   require("@/lib/utils")
 * 를 호출한다. 이를 dist-tests/src/lib/utils.js 로 바꾸기 위해
 * Module._resolveFilename 을 얇게 래핑한다. 테스트 전용 파일이며
 * 런타임 번들(Next.js)에는 영향이 없다.
 */
const Module = require("node:module");
const path = require("node:path");

const distSrc = path.resolve(__dirname, "..", "dist-tests", "src");
const originalResolve = Module._resolveFilename;

Module._resolveFilename = function patched(request, parent, ...rest) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(distSrc, request.slice(2));
  }
  return originalResolve.call(this, request, parent, ...rest);
};
