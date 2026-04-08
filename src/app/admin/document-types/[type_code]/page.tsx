import { AdminDocTypeDetailPage } from "@/features/admin/document-types/AdminDocTypeDetailPage";

export const metadata = { title: "문서 유형 상세 — Mimir Admin" };

export default function DocTypeDetailPage({
  params,
}: {
  params: { type_code: string };
}) {
  return <AdminDocTypeDetailPage typeCode={params.type_code} />;
}
