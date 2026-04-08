import { VersionsPage } from "@/features/versions/VersionsPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VersionsPage documentId={id} />;
}
