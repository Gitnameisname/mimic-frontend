/**
 * ContributorsPanel — S3 Phase 3 FG 3-1.
 *
 * 문서 상세에 표시되는 4 카테고리 contributor 패널:
 *   1. 작성자 (creator) — 단일
 *   2. 편집자 (editors) — N
 *   3. 승인자 (approvers) — N
 *   4. 최근 열람자 (viewers) — N (응답에 viewers 키가 있을 때만; FG 3-2 정책 게이트 결합)
 *
 * UX:
 *   - 기본 상태: collapsed (사용자가 토글로 펼침). 화면 폭에 무관.
 *   - 기간 필터: 최근 7일 / 30일 / 90일 / 전체. 변경 시 since 쿼리 동기화.
 *   - viewers 노출 토글: 사용자 의사. 정책에 의해 강제 false 가능 (FG 3-2 결합 시).
 *   - 빈 상태 / 로딩 스켈레톤 / 에러 상태 분리.
 *
 * 디자인:
 *   - 가로 좁은 카드, max-w-3xl 본문 안에 배치 (Phase 3 단계 — 우측 사이드바는 후속).
 *   - 각 항목: 아바타(이니셜) + 이름 + actor_type 뱃지 + 최근 활동 시각 (relative).
 */

"use client";

import { useMemo, useState } from "react";

import { ActorTypeBadge } from "@/components/badge/ActorTypeBadge";
import { ErrorState } from "@/components/feedback/ErrorState";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import type { Contributor } from "@/lib/api/contributors";

import { useContributors } from "./hooks/useContributors";

interface Props {
  documentId: string;
  className?: string;
}

type SinceWindow = "7d" | "30d" | "90d" | "all";

const SINCE_OPTIONS: ReadonlyArray<{ value: SinceWindow; label: string; days: number | null }> = [
  { value: "7d", label: "최근 7일", days: 7 },
  { value: "30d", label: "최근 30일", days: 30 },
  { value: "90d", label: "최근 90일", days: 90 },
  { value: "all", label: "전체", days: null },
];

function _initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // 한글 이름은 첫 1 글자, 영문은 첫 두 단어의 머리글
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function _sinceISO(option: SinceWindow): string | undefined {
  const opt = SINCE_OPTIONS.find((o) => o.value === option);
  if (!opt || opt.days == null) return undefined;
  const ms = opt.days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}


function _ContributorRow({ contributor }: { contributor: Contributor }) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <div
        className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        {_initials(contributor.display_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm text-gray-900 truncate">{contributor.display_name}</span>
          <ActorTypeBadge actorType={contributor.actor_type} />
          {contributor.role_badge && (
            <span className="text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
              {contributor.role_badge}
            </span>
          )}
        </div>
        {contributor.last_activity_at && (
          <div className="text-[11px] text-gray-500 mt-0.5">
            {relativeTime(contributor.last_activity_at)}
          </div>
        )}
      </div>
    </li>
  );
}

interface SectionProps {
  title: string;
  emptyMessage: string;
  items: Contributor[] | undefined;
}

function _Section({ title, emptyMessage, items }: SectionProps) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
        <span>{title}</span>
        <span className="text-[11px] text-gray-400 font-normal">
          {items && items.length > 0 ? `${items.length}명` : ""}
        </span>
      </h3>
      {items && items.length > 0 ? (
        <ul className="space-y-0">{items.map((c) => <_ContributorRow key={`${c.actor_type}:${c.actor_id}`} contributor={c} />)}</ul>
      ) : (
        <div className="text-xs text-gray-400 py-2">{emptyMessage}</div>
      )}
    </section>
  );
}

export function ContributorsPanel({ documentId, className }: Props) {
  const [open, setOpen] = useState(false);
  const [sinceOpt, setSinceOpt] = useState<SinceWindow>("30d");
  const [includeViewers, setIncludeViewers] = useState(false);

  const since = useMemo(() => _sinceISO(sinceOpt), [sinceOpt]);

  const query = useContributors(documentId, {
    since,
    includeViewers,
    enabled: open,
  });

  return (
    <div
      className={cn(
        "border border-gray-200 rounded-lg bg-white",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={`contributors-panel-${documentId}`}
      >
        <span className="text-sm font-semibold text-gray-800">참여자</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn("w-4 h-4 text-gray-500 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          id={`contributors-panel-${documentId}`}
          className="px-4 pb-4 border-t border-gray-100"
        >
          {/* 필터 컨트롤 */}
          <div className="flex items-center gap-2 mt-3 mb-3 flex-wrap">
            <label className="text-[11px] text-gray-600">기간:</label>
            <select
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={sinceOpt}
              onChange={(e) => setSinceOpt(e.target.value as SinceWindow)}
              aria-label="기간 필터"
            >
              {SINCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="text-[11px] text-gray-600 inline-flex items-center gap-1.5 ml-auto">
              <input
                type="checkbox"
                checked={includeViewers}
                onChange={(e) => setIncludeViewers(e.target.checked)}
                className="w-3 h-3"
              />
              열람자 표시
            </label>
          </div>

          {/* 본문 */}
          {query.isLoading ? (
            <SkeletonBlock rows={6} />
          ) : query.isError ? (
            <ErrorState
              title="참여자 정보를 불러올 수 없습니다"
              description="권한이 없거나 일시적인 오류일 수 있습니다."
              retry={() => query.refetch()}
            />
          ) : query.data ? (
            <div>
              {/* 작성자 */}
              <_Section
                title="작성자"
                emptyMessage="작성자 정보가 없습니다"
                items={query.data.creator ? [query.data.creator] : []}
              />
              {/* 편집자 */}
              <_Section
                title="편집자"
                emptyMessage="해당 기간 동안 편집한 사람이 없습니다"
                items={query.data.editors}
              />
              {/* 승인자 */}
              <_Section
                title="승인자"
                emptyMessage="아직 발행된 적이 없습니다"
                items={query.data.approvers}
              />
              {/* 최근 열람자 — viewers 키가 응답에 있을 때만 */}
              {query.data.viewers !== undefined && (
                <_Section
                  title="최근 열람자"
                  emptyMessage="해당 기간 동안 열람한 사람이 없습니다"
                  items={query.data.viewers}
                />
              )}
              {/* viewers 가 정책에 의해 가려졌고 사용자가 토글을 켰던 경우 안내 */}
              {includeViewers && query.data.viewers === undefined && (
                <div className="text-[11px] text-gray-400 mt-1">
                  열람자 정보는 조직 정책에 의해 가려졌습니다.
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
