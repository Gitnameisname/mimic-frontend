"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi, versionsApi, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/stores/uiStore";
import { Button } from "@/components/button/Button";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useAuthz } from "@/hooks/useAuthz";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { emptyProseMirrorDoc, isProseMirrorDoc, type ProseMirrorDoc } from "@/types/prosemirror";
import { DocumentTipTapEditor, type EditorViewMode } from "./tiptap/DocumentTipTapEditor";
// S3 Phase 2 FG 2-2 UX1: `?focus_tag=<name>` 으로 진입 시 본문 해당 hashtag 로 점프
import { scrollToInlineTag } from "@/features/tags/scrollToInlineTag";

interface Props {
  documentId: string;
}

type SaveStatus = "saved" | "unsaved" | "saving" | "error";

/**
 * Phase 1 FG 1-2 — TipTap 기반 에디터 페이지.
 *
 * FG 1-1 에서 저장 모델이 `content_snapshot` (ProseMirror doc) 단일 정본으로 확정.
 * FG 1-2 에서 본 컴포넌트가 TipTap 으로 재작성되어 `editor.getJSON()` 결과를
 * 그대로 저장 바디로 사용한다. nodes[] state 와 임시 어댑터는 제거됨.
 *
 * 초기 로드:
 *   1) getLatest 로 현재 draft(또는 published) version id 확인.
 *   2) versionsApi.get(documentId, id) 로 상세(content_snapshot 포함) 재조회.
 *      (getLatest 는 include_content=false 기본이라 두 단계 fetch 필요)
 *
 * 뷰 토글:
 *   FG 1-2 Step 5 에서 헤더 세그먼트 버튼 + 단축키 부착.
 *   FG 1-3 에서 users.preferences 로 선호값 저장/복원.
 */
const AUTOSAVE_DEBOUNCE_MS = 30_000;

export function DocumentEditPage({ documentId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { can } = useAuthz();
  const readOnly = !can("document.edit");

  const [title, setTitle] = useState("");
  const [doc, setDoc] = useState<ProseMirrorDoc>(() => emptyProseMirrorDoc());
  const [viewMode, setViewMode] = useState<EditorViewMode>("block");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isDirty, setIsDirty] = useState(false);

  // Phase 1 FG 1-3: 서버 저장된 뷰 선호 로드 + 토글 시 debounced PATCH.
  const { preferences, updatePreference } = useUserPreferences();
  const viewModePreferenceAppliedRef = useRef(false);

  // 초기 1회 — 서버 선호값을 viewMode state 로 복사.
  useEffect(() => {
    if (viewModePreferenceAppliedRef.current) return;
    const saved = preferences?.editor_view_mode;
    if (saved === "block" || saved === "flow") {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- 서버 선호 초기 1회 복사 */
      setViewMode(saved);
    }
    if (preferences !== undefined) {
      // preferences fetch 완료(값 없음 포함) 시점에 가드 활성화
      viewModePreferenceAppliedRef.current = true;
    }
  }, [preferences]);

  // viewMode 변경 → 서버 PATCH (debounce 400ms). 초기 복사 직후 사이클에서는
  // 동일 값으로의 쓰기를 방지.
  useEffect(() => {
    if (!viewModePreferenceAppliedRef.current) return;
    const saved = preferences?.editor_view_mode;
    if (saved === viewMode) return;
    updatePreference({ editor_view_mode: viewMode });
    // preferences 는 의도적으로 deps 에 포함하지 않음 — optimistic 반영 이후
    // 같은 값에 대한 재전송을 피한다. hook 자체가 onMutate 에서 query 갱신.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, updatePreference]);

  const docQuery = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => documentsApi.get(documentId),
  });

  const latestQuery = useQuery({
    queryKey: ["version-latest", documentId],
    queryFn: () => versionsApi.getLatest(documentId),
    enabled: !!docQuery.data,
  });

  // FG 1-2: latest 는 include_content=false 기본. 상세 재조회로 content_snapshot 확보.
  const versionDetailQuery = useQuery({
    queryKey: ["version-detail", documentId, latestQuery.data?.id],
    queryFn: () => versionsApi.get(documentId, latestQuery.data!.id),
    enabled: !!latestQuery.data?.id,
  });

  // 초기 1회 — 서버 스냅샷을 로컬 편집 state 로 복사.
  // F-05 시정(2026-04-18): set-state-in-effect 의 synchronizing-to-external-system
  //   예외 영역. initializedRef 가드로 refetch 덮어쓰기 방지.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    const detail = versionDetailQuery.data;
    if (!detail) return;
    /* eslint-disable react-hooks/set-state-in-effect -- 서버 스냅샷 1회 복사 */
    setTitle(detail.title_snapshot ?? docQuery.data?.title ?? "");
    setDoc(
      isProseMirrorDoc(detail.content_snapshot)
        ? detail.content_snapshot
        : emptyProseMirrorDoc(),
    );
    /* eslint-enable react-hooks/set-state-in-effect */
    initializedRef.current = true;
  }, [docQuery.data, versionDetailQuery.data]);

  // S3 Phase 2 FG 2-2 UX1 (2026-04-25): `?focus_tag=<name>` 진입 시 TipTap 렌더가
  // 끝난 직후 본문의 해당 hashtag 위치로 점프 + flash. 편집기는 마운트 후 한 프레임
  // 더 필요하므로 짧은 setTimeout 으로 대기. 미발견 시 toast degrade.
  const focusTagHandledRef = useRef(false);
  useEffect(() => {
    if (focusTagHandledRef.current) return;
    if (!initializedRef.current) return;
    const focusTag = searchParams.get("focus_tag");
    if (!focusTag) return;
    focusTagHandledRef.current = true;
    const handle = window.setTimeout(() => {
      const ok = scrollToInlineTag(focusTag);
      if (!ok) {
        toast(
          `본문에 #${focusTag} 을 찾지 못했습니다. frontmatter 태그만 있을 수 있습니다.`,
          "info",
        );
      }
    }, 150);
    return () => window.clearTimeout(handle);
  }, [searchParams, versionDetailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      versionsApi.saveDraft(documentId, {
        title,
        content_snapshot: doc,
      }),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => {
      setSaveStatus("saved");
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ["document", documentId] });
      qc.invalidateQueries({ queryKey: ["version-latest", documentId] });
    },
    onError: (err) => {
      setSaveStatus("error");
      toast(getApiErrorMessage(err, "저장에 실패했습니다"), "error");
    },
  });

  // 자동 저장 — 마지막 편집 후 AUTOSAVE_DEBOUNCE_MS 경과 시 1회.
  // (docs/함수도서관 §1.6a `useDebouncedCallback` 적용. 2026-04-25 의미 확정:
  //  기존은 "isDirty=true 진입 시점부터 30s 후 1회" 였으나, 진짜 debounce 로 변경 —
  //  사용자 입력이 멈추면 30s 후 저장, 입력 중이면 타이머 reset.)
  const triggerAutoSave = useCallback(() => {
    if (!latestQuery.data) return;
    saveMutation.mutate();
  }, [saveMutation, latestQuery.data]);

  const [scheduleAutoSave, , cancelAutoSave] = useDebouncedCallback(
    triggerAutoSave,
    AUTOSAVE_DEBOUNCE_MS,
  );

  const handleSave = useCallback(() => {
    if (!latestQuery.data) return;
    // 명시적 저장 시 자동 저장 타이머 취소 (이중 발사 방지)
    cancelAutoSave();
    saveMutation.mutate();
  }, [saveMutation, latestQuery.data, cancelAutoSave]);

  // Cmd/Ctrl + S (저장) + Cmd/Ctrl + Alt + M (뷰 모드 토글)
  // Cmd/Shift 조합은 Chrome 북마크 바(Cmd+Shift+B) / 일반텍스트 붙여넣기(Cmd+Shift+V)
  // 등 브라우저 예약과 충돌해서, 비교적 충돌이 적은 Alt/Option 조합을 기본값으로 한다.
  // (UI 리뷰 5회에서 최종 확정 예정)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        setViewMode((prev) => (prev === "block" ? "flow" : "block"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setSaveStatus("unsaved");
    // 진짜 debounce: 매 편집마다 타이머 reset → 마지막 편집 후 AUTOSAVE_DEBOUNCE_MS
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleDocChange = useCallback(
    (next: ProseMirrorDoc) => {
      setDoc(next);
      // TipTap onUpdate 는 초기 setContent 때도 호출되지 않는다 (emitUpdate:false 옵션).
      // 실 사용자 입력 시점에만 dirty 마킹.
      if (initializedRef.current) {
        markDirty();
      }
    },
    [markDirty],
  );

  const SAVE_STATUS_TEXT: Record<SaveStatus, string> = {
    saved: "저장됨 ✓",
    unsaved: "저장되지 않은 변경사항",
    saving: "저장 중...",
    error: "저장 실패 — 클릭하여 재시도",
  };

  const SAVE_STATUS_COLOR: Record<SaveStatus, string> = {
    saved: "text-gray-400",
    unsaved: "text-amber-500",
    saving: "text-gray-400",
    error: "text-red-500 cursor-pointer",
  };

  if (docQuery.isLoading || latestQuery.isLoading || versionDetailQuery.isLoading) {
    return <div className="p-6"><SkeletonBlock rows={10} /></div>;
  }

  if (docQuery.isError) {
    return <ErrorState retry={docQuery.refetch} className="mt-16" />;
  }

  if (readOnly) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="text-4xl">🔒</div>
        <p className="text-gray-700 font-medium">이 문서를 편집할 권한이 없습니다.</p>
        <p className="text-sm text-gray-500">문서 편집은 작성자(AUTHOR) 이상의 역할이 필요합니다.</p>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/documents/${documentId}`)}>
          문서로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Edit Header — 좁은 화면에서는 wrap 허용 (FG 1-2 모바일 호환: "차단 안 하는 수준") */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isDirty) {
              if (!confirm("저장하지 않은 변경사항이 있습니다. 나가시겠습니까?")) return;
            }
            router.push(`/documents/${documentId}`);
          }}
        >
          ← 취소
        </Button>

        <input
          type="text"
          className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder-gray-300"
          value={title}
          placeholder="제목 없음"
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
          aria-label="문서 제목"
        />

        {/* 뷰 모드 세그먼트 */}
        <div
          role="group"
          aria-label="에디터 뷰 모드"
          className="shrink-0 inline-flex rounded-md border border-gray-200 bg-white overflow-hidden text-xs"
        >
          <button
            type="button"
            aria-pressed={viewMode === "block"}
            onClick={() => setViewMode("block")}
            className={`px-2.5 py-1 transition-colors ${
              viewMode === "block"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            title="블록 뷰 — 블록별 카드 표시 (⌘/Ctrl+Alt+M 으로 토글)"
          >
            블록
          </button>
          <button
            type="button"
            aria-pressed={viewMode === "flow"}
            onClick={() => setViewMode("flow")}
            className={`px-2.5 py-1 border-l border-gray-200 transition-colors ${
              viewMode === "flow"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
            title="일반 뷰 — 흐르는 리치텍스트 (⌘/Ctrl+Alt+M 으로 토글)"
          >
            일반
          </button>
        </div>

        {saveStatus === "error" ? (
          <button
            type="button"
            className={`text-xs shrink-0 ${SAVE_STATUS_COLOR[saveStatus]}`}
            aria-live="polite"
            onClick={handleSave}
          >
            {SAVE_STATUS_TEXT[saveStatus]}
          </button>
        ) : (
          <span
            className={`text-xs shrink-0 ${SAVE_STATUS_COLOR[saveStatus]}`}
            role="status"
            aria-live="polite"
          >
            {SAVE_STATUS_TEXT[saveStatus]}
          </span>
        )}

        <Button
          variant="primary"
          size="sm"
          loading={saveMutation.isPending}
          disabled={!isDirty}
          onClick={handleSave}
        >
          저장
        </Button>
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
        <DocumentTipTapEditor
          initialContent={doc}
          onChange={handleDocChange}
          viewMode={viewMode}
          readOnly={readOnly}
          placeholder="내용을 입력하세요…"
        />
      </div>
    </div>
  );
}
