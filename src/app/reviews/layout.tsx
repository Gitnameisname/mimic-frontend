import { AppLayout } from "@/components/layout/AppLayout";

export default function ReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
