import { VersionDetailPage } from "@/features/versions/VersionDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { id, vid } = await params;
  return <VersionDetailPage documentId={id} versionId={vid} />;
}
