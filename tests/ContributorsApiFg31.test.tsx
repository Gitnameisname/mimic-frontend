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
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const originalFetch = global.fetch;
type CapturedCall = { url: string; method: string };
const captured: CapturedCall[] = [];
let nextResponseBody: unknown = { data: { creator: null, editors: [], approvers: [] } };

before(() => {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    captured.push({ url, method: init?.method ?? "GET" });
    return new Response(JSON.stringify(nextResponseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

describe("contributorsApi.get — URL 합성", () => {
  test("기본 호출 (옵션 없음) — query string 자체가 없음 (모든 값 undefined → omit)", async () => {
    captured.length = 0;
    nextResponseBody = { data: { creator: null, editors: [], approvers: [] } };
    const { contributorsApi } = await import("../src/lib/api/contributors");
    await contributorsApi.get("doc-1");

    assert.equal(captured.length, 1);
    const url = captured[0].url;
    assert.match(url, /\/api\/v1\/documents\/doc-1\/contributors$/);
  });

  test("include_viewers=false 명시 → ?include_viewers=false (false 값 보존)", async () => {
    captured.length = 0;
    const { contributorsApi } = await import("../src/lib/api/contributors");
    await contributorsApi.get("doc-1", { include_viewers: false });
    assert.match(captured[0].url, /include_viewers=false/);
  });

  test("since 명시 → ?since=ISO", async () => {
    captured.length = 0;
    const { contributorsApi } = await import("../src/lib/api/contributors");
    await contributorsApi.get("doc-1", { since: "2026-04-01T00:00:00Z" });
    const url = captured[0].url;
    assert.match(url, /since=2026-04-01T00%3A00%3A00Z/);
  });

  test("include_viewers=true 전파", async () => {
    captured.length = 0;
    const { contributorsApi } = await import("../src/lib/api/contributors");
    await contributorsApi.get("doc-1", { include_viewers: true });
    const url = captured[0].url;
    assert.match(url, /include_viewers=true/);
  });

  test("limit_per_section custom", async () => {
    captured.length = 0;
    const { contributorsApi } = await import("../src/lib/api/contributors");
    await contributorsApi.get("doc-1", { limit_per_section: 10 });
    assert.match(captured[0].url, /limit_per_section=10/);
  });
});

describe("contributorsApi.get — 응답 unwrap", () => {
  test("envelope { data: ... } 에서 data 만 반환", async () => {
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
    const { contributorsApi } = await import("../src/lib/api/contributors");
    const bundle = await contributorsApi.get("doc-1");
    assert.equal(bundle.creator?.actor_id, "u-1");
    assert.equal(bundle.creator?.display_name, "Alice");
    assert.deepEqual(bundle.editors, []);
  });

  test("viewers 키가 응답에 없는 정상 케이스", async () => {
    nextResponseBody = {
      data: {
        creator: null,
        editors: [],
        approvers: [],
      },
    };
    const { contributorsApi } = await import("../src/lib/api/contributors");
    const bundle = await contributorsApi.get("doc-1");
    assert.equal(bundle.viewers, undefined);
  });

  test("viewers 키가 응답에 있는 케이스", async () => {
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
    const { contributorsApi } = await import("../src/lib/api/contributors");
    const bundle = await contributorsApi.get("doc-1", { include_viewers: true });
    assert.ok(Array.isArray(bundle.viewers));
    assert.equal(bundle.viewers!.length, 1);
    assert.equal(bundle.viewers![0].actor_id, "u-2");
  });

  test("agent / system actor_type 보존", async () => {
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
    const { contributorsApi } = await import("../src/lib/api/contributors");
    const bundle = await contributorsApi.get("doc-1");
    assert.equal(bundle.editors[0].actor_type, "agent");
    assert.equal(bundle.editors[1].actor_type, "system");
  });
});
