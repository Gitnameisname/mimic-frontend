"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 3 FG 3-1 — contributorsApi.get URL 합성 검증.
 *
 * - 기본: ?include_viewers=false&limit_per_section=50 (값이 명시되지 않은 since 는 omit)
 * - since 명시 → ?since=...
 * - include_viewers=true → 파라미터 반영
 * - limit_per_section custom
 * - 빈 옵션 → 기본 path만 (qs 비어있으면 ? 없음)
 * - 응답 envelope { data: ... } 에서 data 만 unwrap
 * - viewers 가 없는 응답도 정상 처리 (선택 키)
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const originalFetch = global.fetch;
const captured = [];
let nextResponseBody = { data: { creator: null, editors: [], approvers: [] } };
(0, node_test_1.before)(() => {
    global.fetch = (async (input, init) => {
        const url = typeof input === "string" ? input : String(input);
        captured.push({ url, method: init?.method ?? "GET" });
        return new Response(JSON.stringify(nextResponseBody), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.describe)("contributorsApi.get — URL 합성", () => {
    (0, node_test_1.test)("기본 호출 (옵션 없음) — query string 자체가 없음 (모든 값 undefined → omit)", async () => {
        captured.length = 0;
        nextResponseBody = { data: { creator: null, editors: [], approvers: [] } };
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        await contributorsApi.get("doc-1");
        strict_1.default.equal(captured.length, 1);
        const url = captured[0].url;
        strict_1.default.match(url, /\/api\/v1\/documents\/doc-1\/contributors$/);
    });
    (0, node_test_1.test)("include_viewers=false 명시 → ?include_viewers=false (false 값 보존)", async () => {
        captured.length = 0;
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        await contributorsApi.get("doc-1", { include_viewers: false });
        strict_1.default.match(captured[0].url, /include_viewers=false/);
    });
    (0, node_test_1.test)("since 명시 → ?since=ISO", async () => {
        captured.length = 0;
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        await contributorsApi.get("doc-1", { since: "2026-04-01T00:00:00Z" });
        const url = captured[0].url;
        strict_1.default.match(url, /since=2026-04-01T00%3A00%3A00Z/);
    });
    (0, node_test_1.test)("include_viewers=true 전파", async () => {
        captured.length = 0;
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        await contributorsApi.get("doc-1", { include_viewers: true });
        const url = captured[0].url;
        strict_1.default.match(url, /include_viewers=true/);
    });
    (0, node_test_1.test)("limit_per_section custom", async () => {
        captured.length = 0;
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        await contributorsApi.get("doc-1", { limit_per_section: 10 });
        strict_1.default.match(captured[0].url, /limit_per_section=10/);
    });
});
(0, node_test_1.describe)("contributorsApi.get — 응답 unwrap", () => {
    (0, node_test_1.test)("envelope { data: ... } 에서 data 만 반환", async () => {
        nextResponseBody = {
            data: {
                creator: {
                    actor_id: "u-1",
                    display_name: "Alice",
                    actor_type: "user",
                    last_activity_at: "2026-04-27T12:00:00Z",
                    role_badge: "AUTHOR",
                },
                editors: [],
                approvers: [],
            },
        };
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        const bundle = await contributorsApi.get("doc-1");
        strict_1.default.equal(bundle.creator?.actor_id, "u-1");
        strict_1.default.equal(bundle.creator?.display_name, "Alice");
        strict_1.default.deepEqual(bundle.editors, []);
    });
    (0, node_test_1.test)("viewers 키가 응답에 없는 정상 케이스", async () => {
        nextResponseBody = {
            data: {
                creator: null,
                editors: [],
                approvers: [],
            },
        };
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        const bundle = await contributorsApi.get("doc-1");
        strict_1.default.equal(bundle.viewers, undefined);
    });
    (0, node_test_1.test)("viewers 키가 응답에 있는 케이스", async () => {
        nextResponseBody = {
            data: {
                creator: null,
                editors: [],
                approvers: [],
                viewers: [
                    {
                        actor_id: "u-2",
                        display_name: "Bob",
                        actor_type: "user",
                        last_activity_at: "2026-04-27T11:00:00Z",
                        role_badge: null,
                    },
                ],
            },
        };
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        const bundle = await contributorsApi.get("doc-1", { include_viewers: true });
        strict_1.default.ok(Array.isArray(bundle.viewers));
        strict_1.default.equal(bundle.viewers.length, 1);
        strict_1.default.equal(bundle.viewers[0].actor_id, "u-2");
    });
    (0, node_test_1.test)("agent / system actor_type 보존", async () => {
        nextResponseBody = {
            data: {
                creator: null,
                editors: [
                    {
                        actor_id: "agent-1",
                        display_name: "에이전트",
                        actor_type: "agent",
                        last_activity_at: null,
                        role_badge: null,
                    },
                    {
                        actor_id: "sys-1",
                        display_name: "Mimir 시스템",
                        actor_type: "system",
                        last_activity_at: null,
                        role_badge: null,
                    },
                ],
                approvers: [],
            },
        };
        const { contributorsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/contributors")));
        const bundle = await contributorsApi.get("doc-1");
        strict_1.default.equal(bundle.editors[0].actor_type, "agent");
        strict_1.default.equal(bundle.editors[1].actor_type, "system");
    });
});
