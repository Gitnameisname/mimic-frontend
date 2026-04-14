"use client";

import { useState } from "react";
import { AdminJobsPage } from "@/features/admin/jobs/AdminJobsPage";
import { AdminJobSchedulesPage } from "@/features/admin/jobs/AdminJobSchedulesPage";
import { cn } from "@/lib/utils";

type Tab = "schedules" | "runs";

export default function JobsPage() {
  const [tab, setTab] = useState<Tab>("schedules");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="백그라운드 작업 보기 전환"
        className="inline-flex rounded-lg border border-gray-200 bg-white p-1"
      >
        {(
          [
            { id: "schedules", label: "스케줄" },
            { id: "runs", label: "실행 이력" },
          ] as const
        ).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-1.5 text-sm rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                active
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "schedules" ? <AdminJobSchedulesPage /> : <AdminJobsPage />}
      </div>
    </div>
  );
}
