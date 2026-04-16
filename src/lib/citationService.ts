/**
 * Citation 검증 서비스.
 *
 * - content_hash를 서버에 검증 요청
 * - 인메모리 캐시 (TTL 1시간)
 * - 오류 시 "failed" 처리 (non-blocking)
 */

import { api } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// 캐시
// ---------------------------------------------------------------------------

const _cache = new Map<string, { valid: boolean; expiry: number }>();

const _cacheKey = (
  docId: string,
  verId: string,
  nodeId: string | null | undefined,
  hash: string
) => `${docId}:${verId ?? ""}:${nodeId ?? ""}:${hash}`;

const _TTL_MS = 60 * 60 * 1000; // 1시간

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export async function verifyCitationHash(
  documentId: string,
  versionId: string,
  nodeId: string | null | undefined,
  contentHash: string
): Promise<boolean> {
  const key = _cacheKey(documentId, versionId, nodeId, contentHash);

  const cached = _cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.valid;
  }
  _cache.delete(key);

  try {
    // POST /api/v1/citations/verify 가 없으면 404 → catch 에서 false 처리
    const res = await api.post<{ success: boolean; data: { is_valid: boolean } }>(
      "/api/v1/citations/verify",
      {
        document_id: documentId,
        version_id: versionId,
        node_id: nodeId ?? null,
        content_hash: contentHash,
      }
    );
    const valid = res.data?.is_valid ?? false;
    _cache.set(key, { valid, expiry: Date.now() + _TTL_MS });
    return valid;
  } catch {
    // 엔드포인트 없음 or 네트워크 오류 → 검증 불가
    return false;
  }
}

export function clearCitationCache(): void {
  _cache.clear();
}

export function invalidateCitationCache(
  documentId: string,
  versionId: string
): void {
  for (const key of _cache.keys()) {
    if (key.startsWith(`${documentId}:${versionId}`)) {
      _cache.delete(key);
    }
  }
}
