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
 * S3 Phase 3 FG 3-2 — scopeProfilesApi.update settings 전파 검증.
 *
 * - update 가 PUT /api/v1/admin/scope-profiles/{id} 로 호출되는지 (PATCH 아님)
 * - body 에 settings.expose_viewers 가 포함되는지
 * - settings 만 갱신 (name / description 미포함) 도 정상
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const originalFetch = global.fetch;
const captured = [];
(0, node_test_1.before)(() => {
    global.fetch = (async (input, init) => {
        const url = typeof input === "string" ? input : String(input);
        captured.push({
            url,
            method: init?.method ?? "GET",
            body: init?.body ? JSON.parse(String(init.body)) : null,
        });
        return new Response(JSON.stringify({ data: { id: "sp-1" } }), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.describe)("scopeProfilesApi.update — FG 3-2 settings 전파", () => {
    (0, node_test_1.test)("PUT verb 사용 (PATCH 아님)", async () => {
        captured.length = 0;
        const { scopeProfilesApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/s2admin")));
        await scopeProfilesApi.update("sp-1", { settings: { expose_viewers: true } });
        strict_1.default.equal(captured[0].method, "PUT");
        strict_1.default.match(captured[0].url, /\/api\/v1\/admin\/scope-profiles\/sp-1$/);
    });
    (0, node_test_1.test)("body 에 settings.expose_viewers=true 전파", async () => {
        captured.length = 0;
        const { scopeProfilesApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/s2admin")));
        await scopeProfilesApi.update("sp-1", { settings: { expose_viewers: true } });
        strict_1.default.deepEqual(captured[0].body, { settings: { expose_viewers: true } });
    });
    (0, node_test_1.test)("body 에 settings.expose_viewers=false 전파", async () => {
        captured.length = 0;
        const { scopeProfilesApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/s2admin")));
        await scopeProfilesApi.update("sp-1", { settings: { expose_viewers: false } });
        strict_1.default.deepEqual(captured[0].body, { settings: { expose_viewers: false } });
    });
    (0, node_test_1.test)("name + settings 동시 갱신", async () => {
        captured.length = 0;
        const { scopeProfilesApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/s2admin")));
        await scopeProfilesApi.update("sp-1", {
            name: "New Name",
            settings: { expose_viewers: true },
        });
        strict_1.default.deepEqual(captured[0].body, {
            name: "New Name",
            settings: { expose_viewers: true },
        });
    });
    (0, node_test_1.test)("name 만 갱신 (settings 미포함)", async () => {
        captured.length = 0;
        const { scopeProfilesApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/s2admin")));
        await scopeProfilesApi.update("sp-1", { name: "Only Name" });
        strict_1.default.deepEqual(captured[0].body, { name: "Only Name" });
    });
});
(0, node_test_1.describe)("scopeProfilesApi.create — FG 3-2 settings 옵셔널", () => {
    (0, node_test_1.test)("settings 미지정 시 body 에 settings 키 없음", async () => {
        captured.length = 0;
        const { scopeProfilesApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/s2admin")));
        await scopeProfilesApi.create({ name: "P" });
        strict_1.default.deepEqual(captured[0].body, { name: "P" });
    });
    (0, node_test_1.test)("settings 명시 시 전파", async () => {
        captured.length = 0;
        const { scopeProfilesApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/s2admin")));
        await scopeProfilesApi.create({
            name: "P",
            settings: { expose_viewers: true },
        });
        strict_1.default.deepEqual(captured[0].body, {
            name: "P",
            settings: { expose_viewers: true },
        });
    });
});
