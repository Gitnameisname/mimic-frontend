import { AdminUserDetailPage } from "@/features/admin/users/AdminUserDetailPage";

export const metadata = { title: "사용자 상세 — Mimir Admin" };

export default function UserDetailPage({
  params,
}: {
  params: { user_id: string };
}) {
  return <AdminUserDetailPage userId={params.user_id} />;
}
