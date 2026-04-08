import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { ToastContainer } from "@/components/feedback/Toast";

interface Props {
  children: React.ReactNode;
}

export function AdminLayout({ children }: Props) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AdminHeader />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}
