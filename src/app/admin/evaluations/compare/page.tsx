import { AdminEvaluationComparePage } from "@/features/admin/evaluations/AdminEvaluationComparePage";

export const metadata = { title: "평가 비교 — Mimir Admin" };

export default async function EvaluationCompareRoute({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  return <AdminEvaluationComparePage a={sp.a ?? null} b={sp.b ?? null} />;
}
