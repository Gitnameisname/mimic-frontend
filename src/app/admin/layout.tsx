import { AdminLayout } from "@/components/admin/layout/AdminLayout";

export const metadata = {
  title: "Mimir Admin",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
