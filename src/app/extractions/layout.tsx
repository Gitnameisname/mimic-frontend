import { AppLayout } from "@/components/layout/AppLayout";

export default function ExtractionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
