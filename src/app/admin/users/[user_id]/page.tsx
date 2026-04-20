import { AdminUserDetailPage } from "@/features/admin/users/AdminUserDetailPage";

export const metadata = { title: "사용자 상세 — Mimir Admin" };

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ user_id: string }>;
}) {
  const { user_id } = await params;
  return <AdminUserDetailPage userId={user_id} />;
}
