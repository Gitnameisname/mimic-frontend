import { AdminDocTypeDetailPage } from "@/features/admin/document-types/AdminDocTypeDetailPage";

export const metadata = { title: "문서 유형 상세 — Mimir Admin" };

export default async function DocTypeDetailPage({
  params,
}: {
  params: Promise<{ type_code: string }>;
}) {
  const { type_code } = await params;
  return <AdminDocTypeDetailPage typeCode={type_code} />;
}
