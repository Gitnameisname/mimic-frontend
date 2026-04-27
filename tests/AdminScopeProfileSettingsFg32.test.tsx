/**
 * S3 Phase 3 FG 3-2 — scopeProfilesApi.update settings 전파 검증.
 *
 * - update 가 PUT /api/v1/admin/scope-profiles/{id} 로 호출되는지 (PATCH 아님)
 * - body 에 settings.expose_viewers 가 포함되는지
 * - settings 만 갱신 (name / description 미포함) 도 정상
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const originalFetch = global.fetch;
type CapturedCall = { url: string; method: string; body: unknown };
const captured: CapturedCall[] = [];

before(() => {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
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
  }) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

describe("scopeProfilesApi.update — FG 3-2 settings 전파", () => {
  test("PUT verb 사용 (PATCH 아님)", async () => {
    captured.length = 0;
    const { scopeProfilesApi } = await import("../src/lib/api/s2admin");
    await scopeProfilesApi.update("sp-1", { settings: { expose_viewers: true } });
    assert.equal(captured[0].method, "PUT");
    assert.match(captured[0].url, /\/api\/v1\/admin\/scope-profiles\/sp-1$/);
  });

  test("body 에 settings.expose_viewers=true 전파", async () => {
    captured.length = 0;
    const { scopeProfilesApi } = await import("../src/lib/api/s2admin");
    await scopeProfilesApi.update("sp-1", { settings: { expose_viewers: true } });
    assert.deepEqual(captured[0].body, { settings: { expose_viewers: true } });
  });

  test("body 에 settings.expose_viewers=false 전파", async () => {
    captured.length = 0;
    const { scopeProfilesApi } = await import("../src/lib/api/s2admin");
    await scopeProfilesApi.update("sp-1", { settings: { expose_viewers: false } });
    assert.deepEqual(captured[0].body, { settings: { expose_viewers: false } });
  });

  test("name + settings 동시 갱신", async () => {
    captured.length = 0;
    const { scopeProfilesApi } = await import("../src/lib/api/s2admin");
    await scopeProfilesApi.update("sp-1", {
      name: "New Name",
      settings: { expose_viewers: true },
    });
    assert.deepEqual(captured[0].body, {
      name: "New Name",
      settings: { expose_viewers: true },
    });
  });

  test("name 만 갱신 (settings 미포함)", async () => {
    captured.length = 0;
    const { scopeProfilesApi } = await import("../src/lib/api/s2admin");
    await scopeProfilesApi.update("sp-1", { name: "Only Name" });
    assert.deepEqual(captured[0].body, { name: "Only Name" });
  });
});

describe("scopeProfilesApi.create — FG 3-2 settings 옵셔널", () => {
  test("settings 미지정 시 body 에 settings 키 없음", async () => {
    captured.length = 0;
    const { scopeProfilesApi } = await import("../src/lib/api/s2admin");
    await scopeProfilesApi.create({ name: "P" });
    assert.deepEqual(captured[0].body, { name: "P" });
  });

  test("settings 명시 시 전파", async () => {
    captured.length = 0;
    const { scopeProfilesApi } = await import("../src/lib/api/s2admin");
    await scopeProfilesApi.create({
      name: "P",
      settings: { expose_viewers: true },
    });
    assert.deepEqual(captured[0].body, {
      name: "P",
      settings: { expose_viewers: true },
    });
  });
});
