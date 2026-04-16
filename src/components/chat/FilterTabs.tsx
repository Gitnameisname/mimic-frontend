"use client";

/**
 * FilterTabs — 대화 목록 필터 탭 (전체/7일/30일/보관함).
 *
 * 접근성 (WCAG 2.1 AA):
 *  - role="tablist" 컨테이너
 *  - role="tab" + aria-selected 각 탭
 *  - 방향키(←/→) 키보드 탐색
 */

import { useRef } from "react";
import type { FilterTab } from "@/stores/conversationListStore";

interface FilterTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
}

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "week", label: "7일" },
  { id: "month", label: "30일" },
  { id: "archived", label: "보관함" },
];

export default function FilterTabs({ activeTab, onTabChange }: FilterTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (e.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
    else if (e.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    else return;

    e.preventDefault();
    onTabChange(TABS[nextIndex].id);
    // 포커스 이동
    const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]");
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="대화 목록 필터"
      className="flex border-b border-gray-100 bg-white"
    >
      {TABS.map((tab, i) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={`flex-1 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
            activeTab === tab.id
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
