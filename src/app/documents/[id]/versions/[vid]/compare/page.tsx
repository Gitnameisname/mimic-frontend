import { VersionComparePage } from "@/features/diff/VersionComparePage";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; vid: string }>;
  searchParams: Promise<{ base?: string }>;
}) {
  const { id, vid } = await params;
  const { base } = await searchParams;

  return (
    <VersionComparePage
      documentId={id}
      versionBId={vid}
      versionAId={base}
    />
  );
}
