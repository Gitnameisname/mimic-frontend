import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { ThemeApplier, themePreloadSnippet } from "@/components/theme/ThemeApplier";

export const metadata: Metadata = {
  title: "Mimir",
  description: "범용 문서/지식 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // S3 Phase 2 FG 2-2 UX1: preload script 가 data-theme 을 세팅할 수 있으므로
    // Next 권장 패턴에 따라 suppressHydrationWarning 로 html 속성 mismatch 만 억제.
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        {/* 첫 paint 전에 저장된 테마(light/dark)만 복원해 flash 방지.
            "system" 은 속성 없음 = SSR 기본 → 서버/클라이언트 동일. */}
        <script dangerouslySetInnerHTML={{ __html: themePreloadSnippet }} />
      </head>
      <body className="h-full antialiased">
        <Providers>
          <ThemeApplier />
          {children}
        </Providers>
      </body>
    </html>
  );
}
