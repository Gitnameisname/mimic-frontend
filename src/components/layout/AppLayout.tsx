"use client";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "@/components/feedback/Toast";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface Props {
  children: React.ReactNode;
}

export function AppLayout({ children }: Props) {
  return (
    <AuthGuard>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
        </div>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
