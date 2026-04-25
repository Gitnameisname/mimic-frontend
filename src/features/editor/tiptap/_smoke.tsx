"use client";

/**
 * FG 1-2 Step 0 — TipTap × React 19 호환 smoke.
 *
 * 본 파일은 **타입/번들링 레벨 호환** 검증 전용이며 실제 라우팅되지 않는다.
 * Next dev 서버로 시각 확인이 필요하면 임시 페이지에서 import 해 렌더하면 된다.
 *
 * 검증 포인트:
 *   1. @tiptap/react / @tiptap/starter-kit / @tiptap/extension-placeholder
 *      import 가 TypeScript 컴파일을 통과하는가
 *   2. useEditor 훅 + EditorContent 조합이 React 19 타입 시스템과 충돌하지 않는가
 *   3. Editor 옵션 객체(extensions / content / editable 등) 가 타입 체크 통과
 *
 * FG 1-2 Step 2 의 DocumentTipTapEditor 로 확장 예정. 본 smoke 파일은 Step 2
 * 시점에 삭제한다.
 */

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

export default function TipTapSmoke(): React.ReactElement | null {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Type here…" }),
    ],
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    },
    // Next.js 16 + React 19 의 SSR 경고 회피 (TipTap 3.x 공식 권장)
    immediatelyRender: false,
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
