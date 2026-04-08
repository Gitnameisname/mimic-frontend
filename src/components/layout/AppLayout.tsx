import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "@/components/feedback/Toast";

interface Props {
  children: React.ReactNode;
}

export function AppLayout({ children }: Props) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
      <ToastContainer />
    </div>
  );
}
