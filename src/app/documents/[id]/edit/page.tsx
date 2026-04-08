import { DocumentEditPage } from "@/features/editor/DocumentEditPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentEditPage documentId={id} />;
}
