"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffMismatchSummary = diffMismatchSummary;
exports.detectRepeatRollback = detectRepeatRollback;
function diffMismatchSummary(server, client) {
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
    const modifiedKeyDiffers = [];
    for (const [name, sMod] of sModified.entries()) {
        const cMod = cModified.get(name);
        if (!cMod)
            continue;
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
    const equal = serverOnlyAdded.length === 0 &&
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
const DEFAULT_SUMMARY_RE = /^v(\d+)\s*로\s*되돌리기/;
/**
 * P6-1: 한 버전이 롤백으로 생성된 것인지, 그리고 그 target 이 무엇이었는지 반환.
 * 둘 다 없으면 null.
 */
function rollbackTargetOf(v) {
    if (typeof v.rolled_back_from_version === "number" &&
        Number.isInteger(v.rolled_back_from_version) &&
        v.rolled_back_from_version >= 1) {
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
function detectRepeatRollback(recentVersions, targetVersion, currentVersion) {
    // versions 는 DESC 순 (최신이 먼저). 첫 번째 아이템이 곧 현재 버전.
    if (recentVersions.length === 0)
        return { detected: false };
    const head = recentVersions[0];
    if (head.version !== currentVersion)
        return { detected: false };
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
