"use client";

/**
 * 권한 매트릭스 뷰 (Task 14-10).
 *
 * 백엔드 `_PERMISSION_MATRIX`를 시각화하여 역할별 허용 action을 체크박스 형태로 표시한다.
 * - 그룹별 접기/펼치기
 * - 반응형: 모바일은 horizontal scroll
 * - 읽기 전용 (편집 불가 — RBAC는 코드 레벨 관리)
 */

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<string, string> = {
  document: "문서",
  version: "버전",
  node: "노드",
  draft: "초안",
  workflow: "워크플로",
  search: "검색",
  rag: "RAG 질의응답",
  admin: "관리자",
  other: "기타",
};

export function PermissionMatrix() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "permission-matrix"],
    queryFn: () => adminApi.getPermissionMatrix(),
  });

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (group: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  if (isLoading) {
    return (
      <div
        className="bg-white rounded-xl border border-gray-200 p-6"
        role="status"
        aria-live="polite"
      >
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-8 bg-gray-50 rounded animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
        <span className="sr-only">권한 매트릭스를 불러오는 중입니다.</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="bg-white rounded-xl border border-red-200 p-6"
        role="alert"
      >
        <p className="text-sm text-red-700">
          권한 매트릭스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      </div>
    );
  }

  const matrix = data.data;

  return (
    <section
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      aria-label="역할-권한 매트릭스"
    >
      <header className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900">권한 매트릭스</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          각 action에 대해 역할별 허용 여부를 표시합니다. 매트릭스는 코드 레벨에서 관리되며 UI에서 편집할 수 없습니다.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th
                scope="col"
                className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
              >
                Action
              </th>
              {matrix.roles.map((r) => (
                <th
                  key={r}
                  scope="col"
                  className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.groups.map((group) => {
              const isCollapsed = collapsed.has(group.name);
              const groupLabel = GROUP_LABELS[group.name] ?? group.name;
              return (
                <Fragment key={group.name}>
                  <tr
                    className="bg-gray-50 border-t border-gray-200"
                  >
                    <td
                      colSpan={matrix.roles.length + 1}
                      className="px-4 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(group.name)}
                        aria-expanded={!isCollapsed}
                        aria-controls={`group-${group.name}`}
                        className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-widest hover:text-gray-900 min-h-[36px] w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 rounded"
                      >
                        <svg
                          className={cn(
                            "w-3.5 h-3.5 transition-transform duration-200",
                            isCollapsed ? "" : "rotate-90",
                          )}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <span>{groupLabel}</span>
                        <span className="text-gray-400 font-normal normal-case tracking-normal">
                          ({group.items.length})
                        </span>
                      </button>
                    </td>
                  </tr>
                  {!isCollapsed &&
                    group.items.map((item) => (
                      <tr
                        key={item.action}
                        id={`group-${group.name}`}
                        className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <th
                          scope="row"
                          className="px-4 py-2.5 text-left font-mono text-xs text-gray-700 whitespace-nowrap font-normal"
                        >
                          {item.action}
                        </th>
                        {matrix.roles.map((r) => {
                          const allowed = item.allowed_roles.includes(r);
                          return (
                            <td
                              key={r}
                              className="px-3 py-2.5 text-center"
                              aria-label={
                                allowed
                                  ? `${r}은(는) ${item.action} 허용`
                                  : `${r}은(는) ${item.action} 금지`
                              }
                            >
                              {allowed ? (
                                <svg
                                  className="w-4 h-4 text-green-600 inline"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <span
                                  className="text-gray-300 select-none"
                                  aria-hidden="true"
                                >
                                  ·
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
