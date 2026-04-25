"use client";

/**
 * 활성 세션 관리 페이지 (Phase 14-7).
 *
 * 활성 세션 목록 표시 + 원격 세션 강제 종료.
 */

import { useEffect, useState } from "react";
import { accountApi, type SessionData } from "@/lib/api/account";
import { Button } from "@/components/button/Button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/date";

/**
 * User-Agent에서 간단한 브라우저/OS 정보를 추출한다.
 */
function parseUserAgent(ua: string | null): string {
  if (!ua) return "알 수 없는 기기";

  let browser = "브라우저";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  let os = "";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return os ? `${browser} · ${os}` : browser;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await accountApi.getSessions();
        if (!cancelled) setSessions(res.data);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "세션 목록을 불러올 수 없습니다");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleRevoke(sessionId: string) {
    setRevokeError("");
    setRevoking(sessionId);
    try {
      await accountApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : "세션 종료에 실패했습니다");
    } finally {
      setRevoking(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 sm:py-16" role="status" aria-live="polite">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true" />
        <span className="sr-only">로딩 중</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-6">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900">활성 세션</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">현재 로그인된 기기와 세션을 관리합니다.</p>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" aria-atomic="true" className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      {revokeError && (
        <div role="alert" aria-live="assertive" aria-atomic="true" className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">
          {revokeError}
        </div>
      )}

      {sessions.length === 0 && !error ? (
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-6 sm:p-8 text-center transition-all duration-200 hover:border-gray-300" role="status" aria-label="세션 목록">
          <p className="text-xs sm:text-sm text-gray-500">활성 세션이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3" role="list" aria-label="활성 세션 목록">
          {sessions.map((session) => (
            <div
              key={session.id}
              role="listitem"
              className={cn(
                "bg-white rounded-lg sm:rounded-xl border p-3 sm:p-4 lg:p-5 flex items-start sm:items-center justify-between gap-3 sm:gap-4 flex-col sm:flex-row transition-all duration-200",
                session.is_current ? "border-blue-200 bg-blue-50/30 hover:border-blue-300" : "border-gray-200 hover:border-gray-300",
              )}
            >
              <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                {/* 기기 아이콘 */}
                <div className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  session.is_current ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500",
                )} aria-label="기기 아이콘">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {parseUserAgent(session.user_agent)}
                    </p>
                    {session.is_current && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                        현재 세션
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1 text-xs text-gray-500 flex-wrap w-full">
                    {session.ip_address && (
                      <span className="font-mono break-all" title={session.ip_address}>{session.ip_address}</span>
                    )}
                    {session.ip_address && session.created_at && (
                      <span aria-hidden="true" className="hidden sm:inline">·</span>
                    )}
                    {session.created_at && (
                      <span className="whitespace-nowrap" title={formatDateTime(session.created_at)}>{formatDateTime(session.created_at)}</span>
                    )}
                  </div>
                </div>
              </div>

              {!session.is_current && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRevoke(session.id)}
                  loading={revoking === session.id}
                  className="flex-shrink-0 w-full sm:w-auto"
                >
                  종료
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
