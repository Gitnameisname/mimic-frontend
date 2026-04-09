import { Suspense } from "react";
import { SearchPage } from "@/features/search/SearchPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-100 bg-white animate-pulse h-20" />
            ))}
          </div>
        </div>
      }
    >
      <SearchPage />
    </Suspense>
  );
}
