"use strict";
/**
 * 파일 다운로드 유틸 — `docs/함수도서관/frontend.md` §1.4 등록.
 *
 * 제공 함수:
 *   - {@link downloadJsonFile} — 임의 데이터를 JSON 파일로 브라우저 다운로드.
 *
 * 도입 배경:
 *   - `JSON.stringify` → `Blob` → `URL.createObjectURL` → `<a>` click → revoke
 *     보일러가 admin 페이지 (golden-sets / ConversationList) 에 반복.
 *   - SSR 환경 (Next.js RSC) 에서 안전하게 no-op 하는 가드 필요.
 *
 * 보안·안전성:
 *   - 파일명에 사용자 입력을 그대로 넣지 말 것 — Content-Disposition 인젝션 위험은
 *     없으나(브라우저가 OS 차원에서 막음), 디스크에 쓰여지는 이름이므로 호출자가
 *     화이트리스트.
 *   - 메모리 누수 방지: `URL.revokeObjectURL` 호출 보장.
 *   - SSR 가드: `typeof window === "undefined"` 면 조용히 no-op.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadJsonFile = downloadJsonFile;
/**
 * 임의 데이터를 JSON 파일로 직렬화해 브라우저 다운로드를 트리거한다.
 *
 * @param filename - 저장될 파일명 (확장자 포함 권장. 예: `"export.json"`).
 * @param data - JSON 직렬화 가능한 임의 값. `undefined` / 함수 / 순환참조는 호출자가 사전 정리.
 * @param options - `space` (기본 2) · `type` (기본 `"application/json"`).
 *
 * @returns 동작 트리거 후 즉시 반환 (다운로드 자체는 브라우저가 비동기 처리).
 *   SSR 환경 (`window` 부재) 에서는 no-op 후 반환.
 *
 * @example
 * downloadJsonFile("conversation-2026-04-25.json", { id: "c-1", turns: [...] });
 * downloadJsonFile("compact.json", data, { space: 0 });
 */
function downloadJsonFile(filename, data, options = {}) {
    // SSR 가드 — Next.js RSC / SSG 단계에서 호출돼도 throw 하지 않는다.
    if (typeof window === "undefined" || typeof document === "undefined")
        return;
    const { space = 2, type = "application/json" } = options;
    const json = JSON.stringify(data, null, space);
    const blob = new Blob([json], { type });
    const url = URL.createObjectURL(blob);
    try {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        // body 부착 후 click — Firefox 호환 필수.
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    finally {
        // 메모리 회수 — try/finally 로 보장.
        URL.revokeObjectURL(url);
    }
}
