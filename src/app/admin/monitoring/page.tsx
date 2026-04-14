import type { Metadata } from "next";
import { AdminMonitoringPage } from "@/features/admin/monitoring/AdminMonitoringPage";

export const metadata: Metadata = {
  title: "모니터링 | Mimir Admin",
  description: "시스템 구성요소 상태와 API 성능 지표 추이를 실시간으로 확인합니다.",
};

export default function MonitoringPage() {
  return <AdminMonitoringPage />;
}
