"use client";

/**
 * DocumentTipTapEditor — ProseMirror doc 단일 정본 위의 에디터 컴포넌트.
 *
 * Phase 1 FG 1-2 의 중심 컴포넌트. 블록 뷰 ↔ 일반 뷰 토글을 같은
 * ``EditorState`` 위에서 구현한다.
 *
 * Props
 * -----
 * - ``initialContent``: 서버에서 로드한 ``content_snapshot`` (ProseMirror doc).
 * - ``onChange``: 편집 시 변경된 doc JSON 을 부모로 상향. auto-save /
 *   dirty 플래그 / 저장 버튼은 부모가 관리한다.
 * - ``viewMode``: "block" | "flow". 본 Step 2 에서는 CSS 클래스만 분기하고,
 *   블록 카드 NodeView 는 Step 3 에서 덧붙인다.
 * - ``readOnly``: true 면 편집 불가. 권한 없는 뷰어 / 읽기 전용 모드에 사용.
 * - ``placeholder``: 빈 문서일 때 표시할 힌트.
 *
 * 저장 경로
 * ---------
 * 본 컴포넌트는 저장 호출을 하지 않는다. 부모(`DocumentEditPage`) 가
 * ``versionsApi.saveDraft(documentId, { content_snapshot: doc, title })`` 로
 * PUT 호출. 저장 포맷은 ``editor.getJSON()`` 그대로.
 *
 * SSR
 * ---
 * Next.js 16 + React 19 SSR 경고를 피하기 위해 ``immediatelyRender: false``
 * 사용 (TipTap 3.x 공식 권장).
 */

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { NodeId } from "./extensions/NodeId";
// S3 Phase 2 FG 2-2 (2026-04-24): 본문 인라인 #태그 시각 강조
import { HashtagMark, attachHashtagClickHandler } from "./extensions/HashtagMark";
import { emptyProseMirrorDoc, isProseMirrorDoc, type ProseMirrorDoc } from "@/types/prosemirror";

export type EditorViewMode = "block" | "flow";

export interface DocumentTipTapEditorProps {
  initialContent: ProseMirrorDoc;
  onChange: (doc: ProseMirrorDoc) => void;
  viewMode: EditorViewMode;
  readOnly?: boolean;
  placeholder?: string;
  /** 부모에서 ref 같은 접근이 필요하면 editor 를 노출. */
  onEditorReady?: (editor: ReturnType<typeof useEditor>) => void;
}

export function DocumentTipTapEditor({
  initialContent,
  onChange,
  viewMode,
  readOnly = false,
  placeholder = "내용을 입력하세요…",
  onEditorReady,
}: DocumentTipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 블록 분할 시 NodeId extension 이 새 id 부여할 수 있도록 history 등 기본만
      }),
      Placeholder.configure({ placeholder }),
      NodeId,
      // FG 2-2: hashtag 시각 강조. 서버 파서가 정본이므로 이 mark 는 UX 용.
      HashtagMark,
    ],
    content: isProseMirrorDoc(initialContent) ? initialContent : emptyProseMirrorDoc(),
    editable: !readOnly,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const doc = ed.getJSON() as unknown as ProseMirrorDoc;
      onChange(doc);
    },
  });

  // readOnly prop 변경 반영
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // initialContent 가 바뀌면 (다른 문서 로드 / 외부 리셋) 에디터 동기화
  // 주의: 매 render 마다 호출되지 않도록 JSON 비교는 참조 동등성만 사용한다.
  //   부모가 같은 객체 참조를 유지하면 setContent 가 재호출되지 않는다.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (current === initialContent) return;
    // 외부 리셋 의도 — 사용자가 편집 중이면 주의 필요. 부모가 제어.
    editor.commands.setContent(
      isProseMirrorDoc(initialContent) ? initialContent : emptyProseMirrorDoc(),
      { emitUpdate: false },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, initialContent]);

  // 외부로 editor 노출 (선택)
  useEffect(() => {
    if (!editor || !onEditorReady) return;
    onEditorReady(editor);
  }, [editor, onEditorReady]);

  // viewMode 는 Step 2 단계에서는 wrapper className 만 분기.
  // Step 3 에서 블록 카드 NodeView 가 붙으면 CSS 변수로 분기한다.
  const wrapperClass =
    viewMode === "block"
      ? "mimir-editor mimir-editor--block"
      : "mimir-editor mimir-editor--flow";

  return (
    <div
      className={wrapperClass}
      data-view-mode={viewMode}
      // 에디터 영역의 기본 간격 / 폰트 사이즈는 전역 CSS 에서 제어.
      // 본 컴포넌트는 상위 컨테이너가 max-width / 좌우 여백을 관리한다고 가정.
    >
      <EditorContent editor={editor} />
    </div>
  );
}

export default DocumentTipTapEditor;
