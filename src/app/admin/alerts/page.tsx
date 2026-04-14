import type { Metadata } from "next";
import { AdminAlertsPage } from "@/features/admin/alerts/AdminAlertsPage";

export const metadata: Metadata = {
  title: "알림 관리 | Mimir Admin",
  description: "알림 규칙을 정의하고 알림 이력을 확인 및 확인 처리합니다.",
};

export default function AlertsPage() {
  return <AdminAlertsPage />;
}
