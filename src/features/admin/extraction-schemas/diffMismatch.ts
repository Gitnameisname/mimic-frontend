/**
 * P5-1 / P5-2 순수 로직 유틸 — React 의존성 없음.
 *
 * AdminExtractionSchemasPage.tsx 에서 재export 되며, 단위 테스트는 이 파일을
 * 직접 import 해 React 트리 전체를 빌드하지 않고도 검증할 수 있다.
 */
import type {
  ExtractionSchemaDiff,
  ExtractionSchemaVersion,
} from "@/types/s2admin";

// ═════════════════════════════════════════════════════════════
// 공통 타입 (페이지 파일에서도 재사용)
// ═════════════════════════════════════════════════════════════

export interface PropertyChange {
  key: string;
  before: unknown;
  after: unknown;
}

export interface FieldsDiff {
  added: string[];
  removed: string[];
  modified: { name: string; changes: PropertyChange[] }[];
}

// ═════════════════════════════════════════════════════════════
// P5-1: 서버/클라 diff 불일치 요약
// ═════════════════════════════════════════════════════════════
//
// 서버 측 `compute_fields_diff` 는 `_deep_equal` 로 bool vs int 를 엄격하게
// 구분한다 (예: True != 1). 클라이언트 `deepEqual` 은 JS 의 strict equality
// 에 기반하므로 대부분의 경우 결과가 일치하지만, JSON 직렬화를 거치는 과정
// 에서 수치 타입이 섞일 수 있어 미묘한 차이가 날 수 있다.
//
// 본 유틸은 "서버 정본" 을 기준으로 클라이언트 결과가 어디까지 어긋나 있는지
// 집계만 수행한다. 조치는 항상 "서버 결과가 기준" 이므로, 이 집계는 사용자에게
// 투명성을 제공하기 위한 UI 라벨용이다.

export interface DiffMismatchSummary {
  /** 양쪽 결과가 동일하면 true */
  equal: boolean;
  /** 서버에만 있는 added 필드 */
  serverOnlyAdded: string[];
  /** 클라에만 있는 added 필드 */
  clientOnlyAdded: string[];
  /** 서버에만 있는 removed 필드 */
  serverOnlyRemoved: string[];
  /** 클라에만 있는 removed 필드 */
  clientOnlyRemoved: string[];
  /** 양쪽 모두 modified 로 보지만 속성 변경 키 집합이 다른 필드명 */
  modifiedKeyDiffers: string[];
  /** 서버에만 modified 인 필드 (클라는 unchanged 로 봄) */
  serverOnlyModified: string[];
  /** 클라에만 modified 인 필드 (서버는 unchanged 로 봄) */
  clientOnlyModified: string[];
}

export function diffMismatchSummary(
  server: ExtractionSchemaDiff,
  client: FieldsDiff
): DiffMismatchSummary {
  const sAdded = new Set(server.added);
  const cAdded = new Set(client.added);
  const sRemoved = new Set(server.removed);
  const cRemoved = new Set(client.removed);
  const sModified = new Map(server.modified.map((m) => [m.name, m]));
  const cModified = new Map(client.modified.map((m) => [m.name, m]));

  const serverOnlyAdded = [...sAdded].filter((x) => !cAdded.has(x)).sort();
  const clientOnlyAdded = [...cAdded].filter((x) => !sAdded.has(x)).sort();
  const serverOnlyRemoved = [...sRemoved].filter((x) => !cRemoved.has(x)).sort();
  const clientOnlyRemoved = [...cRemoved].filter((x) => !sRemoved.has(x)).sort();

  const serverOnlyModified = [...sModified.keys()]
    .filter((n) => !cModified.has(n))
    .sort();
  const clientOnlyModified = [...cModified.keys()]
    .filter((n) => !sModified.has(n))
    .sort();

  // 둘 다 modified 지만 변경된 속성 키 집합이 다른 케이스.
  const modifiedKeyDiffers: string[] = [];
  for (const [name, sMod] of sModified.entries()) {
    const cMod = cModified.get(name);
    if (!cMod) continue;
    const sKeys = new Set(sMod.changes.map((c) => c.key));
    const cKeys = new Set(cMod.changes.map((c) => c.key));
    if (sKeys.size !== cKeys.size) {
      modifiedKeyDiffers.push(name);
      continue;
    }
    for (const k of sKeys) {
      if (!cKeys.has(k)) {
        modifiedKeyDiffers.push(name);
        break;
      }
    }
  }
  modifiedKeyDiffers.sort();

  const equal =
    serverOnlyAdded.length === 0 &&
    clientOnlyAdded.length === 0 &&
    serverOnlyRemoved.length === 0 &&
    clientOnlyRemoved.length === 0 &&
    serverOnlyModified.length === 0 &&
    clientOnlyModified.length === 0 &&
    modifiedKeyDiffers.length === 0;

  return {
    equal,
    serverOnlyAdded,
    clientOnlyAdded,
    serverOnlyRemoved,
    clientOnlyRemoved,
    modifiedKeyDiffers,
    serverOnlyModified,
    clientOnlyModified,
  };
}

// ═════════════════════════════════════════════════════════════
// P5-2 / P6-1: 반복 rollback 감지
// ═════════════════════════════════════════════════════════════
//
// 동일 `target_version` 으로 연속 롤백은 서버 계약상 허용되지만, 감사 로그/버전
// 테이블이 빠르게 팽창할 수 있으므로 UI 에서 경고를 노출한다.
//
// 감지 대상(P6-1 확장):
//   - kind="immediate": 가장 최근(head) 버전이 이미 같은 target 으로의 rollback.
//     (P5-2 의 원래 경로. "직전에 이미 되돌리셨습니다".)
//   - kind="ping-pong": 최근 N 개 버전 이력 중 동일 target 으로의 rollback 이
//     이미 존재. A→B→A 같은 왕복 패턴에서 사용자가 다시 같은 방향을 시도할 때
//     감지된다. immediate 보다 약한 신호이지만 감사 로그 누적을 줄이는 데 의미.
//
// 탐지 경로(각 버전에 대해):
//   1) 1순위: `rolled_back_from_version` (서버 1급 필드, P5-2 / P6-2 migration)
//   2) 2순위(호환): `change_summary` 가 기본 패턴 `"v{N} 로 되돌리기"` 와 일치
//      (구버전 서버 or 사용자 정의 요약이 default 형태).

export interface RepeatRollbackHint {
  detected: boolean;
  /** 감지 근거가 된 rollback 버전 번호 */
  recentVersion?: number;
  /** 감지 근거: "metadata" 또는 "summary" */
  via?: "metadata" | "summary";
  /**
   * P6-1: 감지 종류.
   * - "immediate": head(현재 버전) 자체가 직전에 같은 target 으로 한 rollback.
   * - "ping-pong": 최근 이력 중 head 가 아닌 지점에서 같은 target 으로 이미 rollback 한 적 있음.
   */
  kind?: "immediate" | "ping-pong";
}

const DEFAULT_SUMMARY_RE = /^v(\d+)\s*로\s*되돌리기/;

/**
 * P6-1: 한 버전이 롤백으로 생성된 것인지, 그리고 그 target 이 무엇이었는지 반환.
 * 둘 다 없으면 null.
 */
function rollbackTargetOf(
  v: ExtractionSchemaVersion
): { target: number; via: "metadata" | "summary" } | null {
  if (
    typeof v.rolled_back_from_version === "number" &&
    Number.isInteger(v.rolled_back_from_version) &&
    v.rolled_back_from_version >= 1
  ) {
    return { target: v.rolled_back_from_version, via: "metadata" };
  }
  if (v.change_summary) {
    const m = v.change_summary.match(DEFAULT_SUMMARY_RE);
    if (m) {
      const n = Number(m[1]);
      if (Number.isInteger(n) && n >= 1) {
        return { target: n, via: "summary" };
      }
    }
  }
  return null;
}

/**
 * P6-1: 핑퐁 감지의 최대 탐색 깊이. `recentVersions` 는 DESC 정렬된 버전 이력
 * (page size 10). 5 를 넘어 더 깊이 보면 오래된 rollback 까지 "최근" 취급하게
 * 되어 오탐이 늘고, 렌더 비용도 증가. 5 가 경험적으로 합리적.
 */
const PING_PONG_LOOKBACK = 5;

export function detectRepeatRollback(
  recentVersions: ExtractionSchemaVersion[],
  targetVersion: number,
  currentVersion: number
): RepeatRollbackHint {
  // versions 는 DESC 순 (최신이 먼저). 첫 번째 아이템이 곧 현재 버전.
  if (recentVersions.length === 0) return { detected: false };
  const head = recentVersions[0];
  if (head.version !== currentVersion) return { detected: false };

  // ── Case A (immediate): head 자체가 직전 rollback ────────────
  const headRollback = rollbackTargetOf(head);
  if (headRollback && headRollback.target === targetVersion) {
    return {
      detected: true,
      recentVersion: head.version,
      via: headRollback.via,
      kind: "immediate",
    };
  }

  // ── Case B (ping-pong): 최근 N 개 버전 이내에 동일 target 으로의 rollback ──
  const upper = Math.min(recentVersions.length, PING_PONG_LOOKBACK);
  for (let i = 1; i < upper; i++) {
    const v = recentVersions[i];
    const r = rollbackTargetOf(v);
    if (r && r.target === targetVersion) {
      return {
        detected: true,
        recentVersion: v.version,
        via: r.via,
        kind: "ping-pong",
      };
    }
  }

  return { detected: false };
}
