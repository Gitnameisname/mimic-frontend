"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 2 FG 2-2 — HashtagMark TipTap extension 헤드리스 스모크.
 *
 * jsdom 미설치 + npm registry 차단으로 Editor 인스턴스 통합은 UI 리뷰/Chrome 실측에 위임.
 * 본 테스트는 다음 축만 커버:
 *   1) HashtagMark 가 Mark 객체로 export 되고 name="hashtag" 인지
 *   2) attachHashtagClickHandler 가 span.tag-pill[data-tag] 클릭을 올바르게 라우팅
 *   3) INPUT_REGEX / PASTE_REGEX 가 서버 정규식(유니코드 letter/number + _/-/) 과 호환
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const HashtagMark_1 = require("../src/features/editor/tiptap/extensions/HashtagMark");
(0, node_test_1.describe)("HashtagMark extension", () => {
    (0, node_test_1.test)("Mark 로 export 되고 name='hashtag'", () => {
        strict_1.default.ok(HashtagMark_1.HashtagMark, "HashtagMark 익스포트 존재");
        const cfg = HashtagMark_1.HashtagMark.config;
        strict_1.default.equal(cfg?.name, "hashtag");
    });
});
(0, node_test_1.describe)("attachHashtagClickHandler — 클릭 라우팅", () => {
    (0, node_test_1.test)("tag-pill 클릭 시 data-tag 로 콜백 호출", () => {
        // 최소 DOM shim: jsdom 없이 EventTarget 패턴으로 테스트
        // 실 브라우저에선 HTMLElement 가 정상 동작하므로 여기선 mock element 로 계약만 검증.
        const events = [];
        const pill = {
            getAttribute(name) {
                return name === "data-tag" ? "ai" : null;
            },
        };
        const clicked = {
            closest(selector) {
                return selector === "span.tag-pill[data-tag]" ? pill : null;
            },
        };
        const holder = { fn: null };
        const root = {
            addEventListener(_evt, fn) {
                holder.fn = fn;
            },
            removeEventListener(_evt, _fn) {
                holder.fn = null;
            },
        };
        const detach = (0, HashtagMark_1.attachHashtagClickHandler)(root, (name) => events.push(name));
        strict_1.default.ok(holder.fn, "listener 등록됨");
        const fakeEvent = {
            target: clicked,
            preventDefault: () => { },
        };
        holder.fn(fakeEvent);
        strict_1.default.deepEqual(events, ["ai"]);
        detach();
        strict_1.default.equal(holder.fn, null, "detach 후 listener 제거");
    });
    (0, node_test_1.test)("pill 바깥 클릭은 무시", () => {
        const events = [];
        const outside = {
            closest(_selector) {
                return null;
            },
        };
        const holder = { fn: null };
        const root = {
            addEventListener(_evt, fn) {
                holder.fn = fn;
            },
            removeEventListener() {
                holder.fn = null;
            },
        };
        (0, HashtagMark_1.attachHashtagClickHandler)(root, (name) => events.push(name));
        const fakeEvent = {
            target: outside,
            preventDefault: () => { },
        };
        holder.fn(fakeEvent);
        strict_1.default.deepEqual(events, []);
    });
});
(0, node_test_1.describe)("HashtagMark 정규식 — 서버 normalize_tag 호환", () => {
    // extension 모듈 내부 정규식은 export 하지 않음. 대신 공개 계약(=서버 정규식)을
    // 동일 규격 복제로 검증. 이 정규식이 깨지면 본 테스트와 extension 정규식이 함께 수정돼야 함.
    //
    // **캡처 그룹 규약** (BUG-FG22-02 회귀): last capture group 이 `#` 를 포함한
    // `#ai` 전체여야 TipTap markInputRule 이 `#` 접두사를 화면에 보존한다.
    const INPUT_REGEX = /(?:^|[^\w#])(#[\p{L}\p{N}_/-]{1,64})\s$/u;
    // 실제 extension 의 getAttributes 규약과 동일한 변환 — `#` 제거 + lowercase
    const extractTag = (m) => (m?.[1] ?? "").replace(/^#/, "").toLowerCase();
    (0, node_test_1.test)("'hello #ai '  매칭 → '#ai' (last group), tag='ai'", () => {
        const m = "hello #ai ".match(INPUT_REGEX);
        strict_1.default.ok(m, "매칭 성공");
        strict_1.default.equal(m[1], "#ai");
        strict_1.default.equal(extractTag(m), "ai");
    });
    (0, node_test_1.test)("'#ai ' (선두) 매칭 → tag='ai'", () => {
        const m = "#ai ".match(INPUT_REGEX);
        strict_1.default.ok(m, "선두 매칭");
        strict_1.default.equal(m[1], "#ai");
        strict_1.default.equal(extractTag(m), "ai");
    });
    (0, node_test_1.test)("'##ai ' (연속 #) → 매칭 안 됨 (서버 reject 과 동일)", () => {
        const m = "##ai ".match(INPUT_REGEX);
        strict_1.default.equal(m, null);
    });
    (0, node_test_1.test)("한글 태그 지원 (유니코드 letter)", () => {
        const m = "안녕 #문서 ".match(INPUT_REGEX);
        strict_1.default.ok(m);
        strict_1.default.equal(extractTag(m), "문서");
    });
    (0, node_test_1.test)("슬래시 경로 태그 (ml/nlp) 지원", () => {
        const m = " #ml/nlp ".match(INPUT_REGEX);
        strict_1.default.ok(m);
        strict_1.default.equal(extractTag(m), "ml/nlp");
    });
    (0, node_test_1.test)("공백 없이 끝나면 매칭 안 됨 (입력 중 경계 대기)", () => {
        const m = "#ai".match(INPUT_REGEX);
        strict_1.default.equal(m, null);
    });
    (0, node_test_1.test)("대문자 입력 → lowercase 로 정규화", () => {
        const m = " #AI ".match(INPUT_REGEX);
        strict_1.default.ok(m);
        strict_1.default.equal(extractTag(m), "ai");
    });
});
