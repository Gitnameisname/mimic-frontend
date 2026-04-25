"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goldenSetsApi, type GoldenItemCreateFormData } from "@/lib/api/s2admin";
import { downloadJsonFile as exportJsonFile } from "@/lib/utils/download";
import { formatDateOnly } from "@/lib/utils/date";
import {
  GOLDEN_SET_STATUS_LABELS,
  GOLDEN_SET_DOMAIN_LABELS,
} from "@/lib/constants/labels";
import { GOLDEN_SET_STATUS_BADGE_CLASSES } from "@/lib/constants/badges";
import {
  ApiError,
  API_BASE,
  NetworkError,
  getApiErrorMessage,
} from "@/lib/api/client";
import type {
  GoldenSet,
  GoldenSetDetail,
  GoldenSetDomain,
  GoldenSetItem,
  GoldenSetStatus,
  GoldenSetVersionInfo,
  SourceRef,
} from "@/types/s2admin";

// ─── 상수 ───

// 도서관 §1.7 FE-G3 (2026-04-25): 인라인 상수를 `@/lib/constants` 로 이전.
// 호출지 호환을 위해 로컬 별칭 유지 (DOMAIN_LABELS / STATUS_LABELS / STATUS_BADGE_STYLE).
const DOMAIN_LABELS = GOLDEN_SET_DOMAIN_LABELS;
const STATUS_LABELS = GOLDEN_SET_STATUS_LABELS;
const STATUS_BADGE_STYLE = GOLDEN_SET_STATUS_BADGE_CLASSES;

// ─── 공용 유틸 ───

// 도서관 §1.1 FE-G1 (2026-04-25): 로컬 formatDate 제거 → @/lib/utils/date.formatDateOnly
// 위임. 가시 UX 변경: "2026. 4. 25." (ko locale) → "2026-04-25" (ISO식). F1
// formatDateTime 과 표기 일관 (admin 시간 표기 통일 정책, 2026-04-25 철균 합의).
const formatDate = formatDateOnly;

// 도서관 §1.4 FE-G2 (2026-04-25): 로컬 downloadJsonFile 제거 →
// `@/lib/utils/download` 의 표준 helper 사용. 본 파일 내 호출자는 인자 순서가
// (data, filename) 이므로 thin wrapper 로 호환 유지.
function downloadJsonFile(data: unknown, filename: string) {
  exportJsonFile(filename, data);
}

// ─── 에러 분류 (#31) ───
//
// 목록 에러 배너는 이전에 *모든* 실패에 "S2 ⑥" 안내를 붙여 사용자가 서버 장애·
// 네트워크 실패·레이트 리밋 등을 전부 권한 문제로 오해하게 만들었다. 여기서는
// HTTP 상태 코드 / 에러 객체 형태로 카테고리를 나눠 배너 제목·본문·힌트·재시도
// 노출을 분기한다. S2 ⑥ 안내는 *정말 ACL 이 거부된 경우(403)* 에만 표기한다.
//
// 분류 정책:
//   - 401:   세션 만료 안내 (client.ts 가 자동 리다이렉트 시도 중일 수 있음)
//   - 403:   S2 ⑥ Scope Profile / 권한 힌트 — 여기만 S2 ⑥ 언급
//   - 404:   엔드포인트 미발견 (배포/라우팅 문제)
//   - 429:   레이트 리밋 (잠시 후 재시도 힌트)
//   - 5xx:   서버 일시 장애 — 재시도 버튼 노출
//   - 기타 4xx: 백엔드 메시지 표시 + 재시도 가능
//   - 네트워크 오류(TypeError: Failed to fetch 등): 연결 점검 안내 + 재시도
//   - 그 외:  fallback 메시지 + 재시도
//
// 재시도 가능 여부(canRetry)는 일시적 문제일 때만 true — 401/403/404 는 재시도로
// 해결되지 않으므로 버튼을 숨긴다 (사용자 혼란 감소).

interface ListErrorInfo {
  title: string;
  body: string;
  hint?: string;
  canRetry: boolean;
}

function classifyListError(err: unknown): ListErrorInfo {
  const fallback = "골든셋 목록을 불러오지 못했습니다.";

  if (err instanceof ApiError) {
    if (err.status === 401) {
      return {
        title: "세션이 만료되었습니다",
        body: "다시 로그인한 뒤 이 화면으로 돌아와 주세요.",
        canRetry: false,
      };
    }
    if (err.status === 403) {
      return {
        title: "이 목록을 볼 권한이 없습니다",
        body: getApiErrorMessage(err, fallback),
        hint: "Scope Profile 바인딩 또는 역할을 확인해 주세요. (S2 ⑥)",
        canRetry: false,
      };
    }
    if (err.status === 404) {
      return {
        title: "목록 엔드포인트를 찾을 수 없습니다",
        body: getApiErrorMessage(err, fallback),
        hint: "배포 버전 또는 API 경로 설정을 확인해 주세요.",
        canRetry: false,
      };
    }
    if (err.status === 429) {
      return {
        title: "요청이 너무 잦습니다",
        body: "잠시 후 다시 시도해 주세요.",
        canRetry: true,
      };
    }
    if (err.status >= 500) {
      return {
        title: "서버에서 일시적 오류가 발생했습니다",
        body: getApiErrorMessage(err, fallback),
        hint: "잠시 후 다시 시도해 주세요. 문제가 지속되면 관리자에게 문의해 주세요.",
        canRetry: true,
      };
    }
    // 그 외 4xx
    return {
      title: "목록을 불러오지 못했습니다",
      body: getApiErrorMessage(err, fallback),
      canRetry: true,
    };
  }

  // 네트워크 실패 — client.ts 에서 NetworkError 로 래핑됨. 관리자 해결을 위해
  // 요청 URL 과 원본 오류 메시지를 그대로 노출한다 (#서버연결실패 진단 강화).
  if (err instanceof NetworkError) {
    return {
      title: "서버에 연결하지 못했습니다",
      body: `${err.method} ${err.url} — ${err.originalMessage}`,
      hint: `백엔드 서버 기동(${API_BASE}) · CORS · Mixed content · 방화벽을 차례로 확인해 주세요.`,
      canRetry: true,
    };
  }
  // 레거시 경로 (NetworkError 래핑 전)
  if (err instanceof TypeError) {
    return {
      title: "서버에 연결하지 못했습니다",
      body: err.message || "네트워크 상태 또는 서버 가용성을 확인해 주세요.",
      hint: `API 베이스: ${API_BASE}`,
      canRetry: true,
    };
  }

  return {
    title: "목록을 불러오지 못했습니다",
    body: fallback,
    canRetry: true,
  };
}

// ─── 삭제 에러 분류 (#33) ───
//
// 골든셋 삭제는 destructive action 이므로 에러 메시지가 더 구체적이어야 한다.
// 특히 404 는 "이미 삭제되었거나 존재하지 않음" 으로 해석해 사용자 혼란을 줄이고,
// 403 은 여기서만 S2 ⑥ (Scope Profile) 안내를 붙인다. #31 의 classifyListError 와
// 분기 규칙을 공유하지만, 제목/본문은 삭제 행동에 맞게 조정한다.
interface DeleteErrorInfo {
  title: string;
  body: string;
  hint?: string;
  canRetry: boolean;
}

function classifyDeleteError(err: unknown): DeleteErrorInfo {
  const fallback = "삭제에 실패했습니다.";
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return {
        title: "세션이 만료되었습니다",
        body: "다시 로그인한 뒤 삭제를 재시도해 주세요.",
        canRetry: false,
      };
    }
    if (err.status === 403) {
      return {
        title: "삭제 권한이 없습니다",
        body: getApiErrorMessage(err, fallback),
        hint: "Scope Profile 바인딩 또는 역할을 확인해 주세요. (S2 ⑥)",
        canRetry: false,
      };
    }
    if (err.status === 404) {
      return {
        title: "이미 삭제되었거나 존재하지 않습니다",
        body: "목록을 새로고침하면 반영되어 있을 수 있습니다.",
        canRetry: false,
      };
    }
    if (err.status === 429) {
      return {
        title: "요청이 너무 잦습니다",
        body: "잠시 후 다시 시도해 주세요.",
        canRetry: true,
      };
    }
    if (err.status >= 500) {
      return {
        title: "서버에서 일시적 오류가 발생했습니다",
        body: getApiErrorMessage(err, fallback),
        hint: "잠시 후 다시 시도해 주세요.",
        canRetry: true,
      };
    }
    return {
      title: "삭제에 실패했습니다",
      body: getApiErrorMessage(err, fallback),
      canRetry: true,
    };
  }
  if (err instanceof NetworkError) {
    return {
      title: "서버에 연결하지 못했습니다",
      body: `${err.method} ${err.url} — ${err.originalMessage}`,
      hint: `백엔드 서버 기동(${API_BASE}) · CORS · Mixed content · 방화벽을 차례로 확인해 주세요.`,
      canRetry: true,
    };
  }
  if (err instanceof TypeError) {
    return {
      title: "서버에 연결하지 못했습니다",
      body: err.message || "네트워크 상태 또는 서버 가용성을 확인해 주세요.",
      hint: `API 베이스: ${API_BASE}`,
      canRetry: true,
    };
  }
  return {
    title: "삭제에 실패했습니다",
    body: fallback,
    canRetry: true,
  };
}

// ─── Create Modal ───

interface CreateModalProps {
  onClose: () => void;
  onCreated: (gs: GoldenSet) => void;
}

function GoldenSetCreateModal({ onClose, onCreated }: CreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<GoldenSetDomain>("custom");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      goldenSetsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        domain,
      }),
    onSuccess: (resp) => {
      onCreated(resp.data);
    },
    onError: (err) => {
      setSubmitError(
        getApiErrorMessage(err, "골든셋 생성에 실패했습니다."),
      );
    },
  });

  const canSubmit =
    name.trim().length > 0 && name.trim().length <= 200 && !mutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="새 골든셋 생성"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">새 골든셋 생성</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div>
            <label htmlFor="gs-name" className="block text-sm font-semibold text-gray-800 mb-1">
              이름 <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="gs-name"
              ref={nameRef}
              type="text"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="예: RAG 기본 평가셋"
            />
          </div>
          <div>
            <label htmlFor="gs-description" className="block text-sm font-semibold text-gray-800 mb-1">
              설명
            </label>
            <textarea
              id="gs-description"
              maxLength={1000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="평가셋의 목적과 범위를 간단히 기술하세요 (선택)"
            />
          </div>
          <div>
            <label htmlFor="gs-domain" className="block text-sm font-semibold text-gray-800 mb-1">
              도메인
            </label>
            <select
              id="gs-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value as GoldenSetDomain)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {(Object.keys(DOMAIN_LABELS) as GoldenSetDomain[]).map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          {submitError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 min-h-[40px]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed min-h-[40px]"
            >
              {mutation.isPending ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Item Add Form (detail panel 내부) ───

interface ItemAddFormProps {
  goldenSetId: string;
  onAdded: () => void;
  onCancel: () => void;
}

function GoldenItemAddForm({ goldenSetId, onAdded, onCancel }: ItemAddFormProps) {
  const [question, setQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [docId, setDocId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const sourceRef: SourceRef = {
        document_id: docId.trim(),
        version_id: versionId.trim(),
        node_id: nodeId.trim(),
      };
      const body: GoldenItemCreateFormData = {
        question: question.trim(),
        expected_answer: expectedAnswer.trim(),
        expected_source_docs: [sourceRef],
        notes: notes.trim() || undefined,
      };
      return goldenSetsApi.addItem(goldenSetId, body);
    },
    onSuccess: () => onAdded(),
    onError: (err) => {
      setSubmitError(getApiErrorMessage(err, "항목 추가에 실패했습니다."));
    },
  });

  const canSubmit =
    question.trim().length > 0 &&
    expectedAnswer.trim().length > 0 &&
    docId.trim().length > 0 &&
    versionId.trim().length > 0 &&
    nodeId.trim().length > 0 &&
    !mutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) mutation.mutate();
      }}
      className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3"
    >
      <p className="text-xs text-gray-600">
        질문과 기대 답변, 그리고 근거 문서 참조(최소 1개)를 입력하세요. 대량 추가는 JSON import 를 권장합니다.
      </p>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          질문 <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        <textarea
          required
          maxLength={2000}
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          기대 답변 <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        <textarea
          required
          maxLength={5000}
          rows={3}
          value={expectedAnswer}
          onChange={(e) => setExpectedAnswer(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          required
          placeholder="document_id *"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
          aria-label="근거 문서 document_id"
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <input
          required
          placeholder="version_id *"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          aria-label="근거 문서 version_id"
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <input
          required
          placeholder="node_id *"
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          aria-label="근거 문서 node_id"
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">노트</label>
        <input
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      {submitError && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5" role="alert">
          {submitError}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 min-h-[32px]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed min-h-[32px]"
        >
          {mutation.isPending ? "추가 중..." : "항목 추가"}
        </button>
      </div>
    </form>
  );
}

// ─── Delete Confirm Modal (#33) ───
//
// destructive action 가드 — GitHub / GitLab "type-to-confirm" 패턴. 이름을 정확히
// 다시 입력해야 "영구 삭제(soft delete)" 버튼이 활성화된다. 머슬 메모리 삭제 방지.
//
// 접근성:
//   - role="dialog" + aria-modal="true" + aria-labelledby
//   - 진입 시 확인 입력란에 자동 포커스, Esc 로 닫기 (단 pending 중에는 닫기 금지)
//   - 44px 최소 터치 타겟, focus-visible ring
//
// 에러 처리: classifyDeleteError 로 분기 (#31 의 classifyListError 와 대칭 구조)

interface DeleteConfirmModalProps {
  goldenSetName: string;
  isPending: boolean;
  errorInfo: DeleteErrorInfo | null;
  onConfirm: () => void;
  onCancel: () => void;
}

function GoldenSetDeleteConfirmModal({
  goldenSetName,
  isPending,
  errorInfo,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canConfirm = typed.trim() === goldenSetName.trim() && !isPending;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="golden-set-delete-title"
      aria-describedby="golden-set-delete-desc"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isPending) onCancel();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-red-200">
        <div className="px-5 py-4 border-b border-red-200 bg-red-50 flex items-center gap-3">
          <svg
            className="w-6 h-6 text-red-600 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 id="golden-set-delete-title" className="text-base font-bold text-red-900">
            골든셋 삭제 확인
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <p id="golden-set-delete-desc" className="text-sm text-gray-700 leading-6">
            아래 골든셋을 <strong className="text-red-700">삭제</strong>하시겠습니까? 모든
            질문-답변 항목도 함께 삭제 처리됩니다. 삭제는 soft delete 로 기록되며 관리자 DB
            에서 복구 가능합니다.
          </p>
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <p className="text-xs text-gray-500">대상 골든셋</p>
            <p className="text-sm font-semibold text-gray-900 break-all">{goldenSetName}</p>
          </div>
          <div>
            <label htmlFor="delete-confirm-input" className="block text-xs font-semibold text-gray-700 mb-1">
              확인을 위해 위 이름을 정확히 다시 입력해 주세요
            </label>
            <input
              ref={inputRef}
              id="delete-confirm-input"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={isPending}
              autoComplete="off"
              spellCheck={false}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={goldenSetName}
              aria-describedby="delete-confirm-help"
            />
            <p id="delete-confirm-help" className="text-[11px] text-gray-500 mt-1">
              일치하지 않으면 삭제 버튼이 활성화되지 않습니다.
            </p>
          </div>

          {errorInfo && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2" role="alert">
              <p className="text-sm font-bold text-red-800">{errorInfo.title}</p>
              <p className="text-xs text-red-700 mt-1">{errorInfo.body}</p>
              {errorInfo.hint && (
                <p className="text-[11px] text-red-600 mt-1">{errorInfo.hint}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 py-2.5 min-h-[44px] rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm}
              className="flex-1 py-2.5 min-h-[44px] rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {isPending ? "삭제 중..." : "영구 삭제"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ───

interface DetailPanelProps {
  goldenSetId: string;
  onClose: () => void;
}

function GoldenSetDetailPanel({ goldenSetId, onClose }: DetailPanelProps) {
  const queryClient = useQueryClient();
  const [addingItem, setAddingItem] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteErrorInfo, setDeleteErrorInfo] = useState<DeleteErrorInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "golden-sets", goldenSetId],
    queryFn: () => goldenSetsApi.get(goldenSetId),
    retry: false,
  });

  const versionsQuery = useQuery({
    queryKey: ["admin", "golden-sets", goldenSetId, "versions"],
    queryFn: () => goldenSetsApi.versions(goldenSetId),
    retry: false,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => goldenSetsApi.deleteItem(goldenSetId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => goldenSetsApi.importJson(goldenSetId, file),
    onSuccess: () => {
      setImportError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId, "versions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
    },
    onError: (err) => setImportError(getApiErrorMessage(err, "import 에 실패했습니다.")),
  });

  const exportMutation = useMutation({
    mutationFn: () => goldenSetsApi.exportJson(goldenSetId),
    onSuccess: (resp) => {
      const payload = resp.data;
      const detail = detailQuery.data?.data;
      const filename = `golden-set-${detail?.name ?? goldenSetId}.json`;
      downloadJsonFile(payload, filename.replace(/\s+/g, "_"));
    },
  });

  // #33: 골든셋 soft delete. 성공 시 모달/패널을 모두 닫고 목록을 invalidate.
  const deleteMutation = useMutation({
    mutationFn: () => goldenSetsApi.delete(goldenSetId),
    onSuccess: () => {
      setDeleteErrorInfo(null);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
      onClose();
    },
    onError: (err) => {
      setDeleteErrorInfo(classifyDeleteError(err));
    },
  });

  const detail: GoldenSetDetail | undefined = detailQuery.data?.data;
  const versions: GoldenSetVersionInfo[] = versionsQuery.data?.data ?? [];

  const errorMessage = detailQuery.isError
    ? getApiErrorMessage(detailQuery.error, "골든셋을 불러오지 못했습니다.")
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="골든셋 상세"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-gray-900 truncate">
            {detail?.name ?? "로딩 중..."}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {detailQuery.isLoading && (
            <p className="text-sm text-gray-500">로딩 중...</p>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
              <p className="text-sm font-bold text-red-800">상세를 불러오지 못했습니다</p>
              <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
            </div>
          )}

          {detail && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  {DOMAIN_LABELS[detail.domain]}
                </span>
                <span className={`px-2 py-0.5 rounded-md ${STATUS_BADGE_STYLE[detail.status]}`}>
                  {STATUS_LABELS[detail.status]}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  v{detail.version}
                </span>
              </div>

              {detail.description && (
                <p className="text-sm text-gray-700 leading-6">{detail.description}</p>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">{detail.items.length}</p>
                  <p className="text-xs text-gray-500 mt-1">문항 수</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">v{detail.version}</p>
                  <p className="text-xs text-gray-500 mt-1">현재 버전</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">{versions.length}</p>
                  <p className="text-xs text-gray-500 mt-1">버전 이력</p>
                </div>
              </div>

              {/* Q&A 항목 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">질문-답변 항목</h3>
                  {!addingItem && (
                    <button
                      type="button"
                      onClick={() => setAddingItem(true)}
                      className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg min-h-[32px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      + 항목 추가
                    </button>
                  )}
                </div>

                {addingItem && (
                  <div className="mb-3">
                    <GoldenItemAddForm
                      goldenSetId={goldenSetId}
                      onAdded={() => {
                        setAddingItem(false);
                        queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId] });
                        queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId, "versions"] });
                        queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
                      }}
                      onCancel={() => setAddingItem(false)}
                    />
                  </div>
                )}

                <ItemList
                  items={detail.items}
                  onDelete={(id) => {
                    if (confirm("이 항목을 삭제하시겠습니까? (soft delete)")) {
                      deleteItemMutation.mutate(id);
                    }
                  }}
                  deleting={deleteItemMutation.isPending}
                />
              </div>

              {/* 버전 이력 */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">버전 이력</h3>
                {versionsQuery.isLoading ? (
                  <p className="text-xs text-gray-500">로딩 중...</p>
                ) : versions.length === 0 ? (
                  <p className="text-xs text-gray-500">버전 이력이 없습니다.</p>
                ) : (
                  <div className="border-l-2 border-gray-200 pl-4 space-y-2">
                    {versions.map((v) => (
                      <div key={v.version} className="relative">
                        <span className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-blue-500" aria-hidden="true" />
                        <p className="text-sm text-gray-800">v{v.version} · {v.item_count} 문항</p>
                        <p className="text-xs text-gray-500">{formatDate(v.created_at)} · {v.created_by}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Import / Export */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Import / Export</h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {importMutation.isPending ? "Import 중..." : "Import (JSON)"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importMutation.mutate(file);
                      // 같은 파일 재선택 가능하도록 value 리셋
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => exportMutation.mutate()}
                    disabled={exportMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {exportMutation.isPending ? "Export 중..." : "Export (JSON)"}
                  </button>
                </div>
                {importError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2" role="alert">
                    {importError}
                  </p>
                )}
                {importMutation.data && !importError && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mt-2">
                    Import 완료 — 성공 {importMutation.data.data.successful_items} / 실패 {importMutation.data.data.failed_items} / 총 {importMutation.data.data.total_items}
                  </p>
                )}
              </div>

              {/* 위험 구역 — 골든셋 soft delete (#33) */}
              <div
                className="rounded-xl border border-red-200 bg-red-50/40 p-4"
                aria-labelledby="danger-zone-title"
              >
                <h3 id="danger-zone-title" className="text-sm font-bold text-red-800 mb-1">
                  위험 구역
                </h3>
                <p className="text-xs text-red-700 mb-3 leading-5">
                  이 골든셋과 모든 질문-답변 항목이 삭제 처리됩니다. soft delete 로
                  기록되므로 관리자 DB 에서 복구할 수 있지만, UI 에서는 즉시 사라집니다.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteErrorInfo(null);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 min-h-[44px] rounded-lg border border-red-300 bg-white text-sm font-semibold text-red-700 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={`${detail.name} 골든셋 삭제`}
                >
                  골든셋 삭제…
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showDeleteConfirm && detail && (
        <GoldenSetDeleteConfirmModal
          goldenSetName={detail.name}
          isPending={deleteMutation.isPending}
          errorInfo={deleteErrorInfo}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => {
            if (!deleteMutation.isPending) {
              setShowDeleteConfirm(false);
              setDeleteErrorInfo(null);
            }
          }}
        />
      )}
    </div>
  );
}

function ItemList({
  items,
  onDelete,
  deleting,
}: {
  items: GoldenSetItem[];
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
        항목이 없습니다. 위 &ldquo;+ 항목 추가&rdquo; 또는 Import (JSON) 를 사용하세요.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">질문</th>
            <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">기대 답변</th>
            <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">근거</th>
            <th scope="col" className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it) => (
            <tr key={it.id}>
              <td className="px-3 py-2.5 text-gray-800 max-w-[220px] truncate" title={it.question}>{it.question}</td>
              <td className="px-3 py-2.5 text-gray-600 max-w-[280px] truncate" title={it.expected_answer}>{it.expected_answer}</td>
              <td className="px-3 py-2.5 text-xs text-gray-500">{it.expected_source_docs.length} ref</td>
              <td className="px-3 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(it.id)}
                  disabled={deleting}
                  className="text-xs font-semibold text-red-700 hover:text-red-800 px-2 py-1 rounded-md hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                  aria-label={`${it.question.slice(0, 30)} 항목 삭제`}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminGoldenSetsPage
// ═══════════════════════════════════════

export function AdminGoldenSetsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const listQuery = useQuery({
    queryKey: ["admin", "golden-sets"],
    queryFn: () => goldenSetsApi.list({ limit: 50 }),
    retry: false,
  });

  const sets: GoldenSet[] = useMemo(
    () => listQuery.data?.data ?? [],
    [listQuery.data],
  );

  const errorInfo = listQuery.isError ? classifyListError(listQuery.error) : null;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {selectedId && (
        <GoldenSetDetailPanel
          goldenSetId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showCreate && (
        <GoldenSetCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(gs) => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
            setSelectedId(gs.id);
          }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">골든셋 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            RAG 품질 평가를 위한 Q&A 컬렉션(Golden Set)을 관리합니다. 항목은 직접 추가하거나 JSON 파일로 bulk import 할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          골든셋 생성
        </button>
      </div>

      {errorInfo && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
          <p className="text-sm font-bold text-red-800">{errorInfo.title}</p>
          <p className="text-xs text-red-700 mt-1">{errorInfo.body}</p>
          {errorInfo.hint && (
            <p className="text-xs text-red-700 mt-1">{errorInfo.hint}</p>
          )}
          {errorInfo.canRetry && (
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              disabled={listQuery.isFetching}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800 px-3 py-1.5 rounded-md border border-red-300 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed min-h-[32px]"
            >
              {listQuery.isFetching ? "재시도 중..." : "다시 시도"}
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="min-w-full text-sm"
            aria-label="골든셋 목록"
            aria-busy={listQuery.isLoading}
          >
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">설명</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">도메인</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">문항</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">버전</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">생성일</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                    로딩 중...
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && sets.length === 0 && !errorInfo && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                    아직 생성된 골든셋이 없습니다. 우측 상단 “골든셋 생성” 버튼으로 시작하세요.
                  </td>
                </tr>
              )}
              {sets.map((s) => (
                <tr
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.name} 골든셋 상세 열기`}
                  className="hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                  onClick={() => setSelectedId(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(s.id);
                    }
                  }}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{s.description ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{DOMAIN_LABELS[s.domain] ?? s.domain}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-md ${STATUS_BADGE_STYLE[s.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{s.item_count ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">v{s.version}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(s.id);
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
