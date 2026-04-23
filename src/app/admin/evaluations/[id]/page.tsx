import { AdminEvaluationDetailPage } from "@/features/admin/evaluations/AdminEvaluationDetailPage";

export const metadata = { title: "평가 실행 상세 — Mimir Admin" };

export default async function EvaluationDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminEvaluationDetailPage evalId={id} />;
}
