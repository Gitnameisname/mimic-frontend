"use client";

/**
 * /admin/* 루트 레이아웃 (Phase 14-9).
 *
 * AdminLayout에 AuthGuard(ORG_ADMIN) 포함.
 */

import { AdminLayout } from "@/components/admin/layout/AdminLayout";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
