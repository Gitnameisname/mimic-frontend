/**
 * SidebarExploreTree — Sidebar 중간 "탐색" 섹션 컨테이너.
 *
 * S3 Phase 2 FG 2-1.
 *  - 상단: 기존 NAV_ITEMS (Sidebar.tsx 에서 직접 렌더)
 *  - 중간: 본 컴포넌트 — CollectionsTree + FoldersTree 세로 배치
 *  - 하단: SidebarUserPanel
 *  - 모바일 / rail 모드에서는 compact=true 로 축약 표시
 */

"use client";

import { CollectionsTree } from "./CollectionsTree";
import { FoldersTree } from "./FoldersTree";
import { TagsSection } from "@/features/tags/TagsSection";

interface Props {
  compact?: boolean;
}

export function SidebarExploreTree({ compact = false }: Props) {
  return (
    // `flex-1` 로 사이드바의 남은 세로 공간을 모두 차지하고, 내부에서 자체 스크롤.
    // 상단의 NAV 와 하단의 UserPanel 은 고정 크기.
    <div
      className="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto border-t border-[var(--color-border)] pt-1"
      aria-label="탐색"
    >
      <CollectionsTree compact={compact} />
      <FoldersTree compact={compact} />
      <TagsSection compact={compact} />
    </div>
  );
}
