"use client";

import { Component, type ReactNode } from "react";
import { logError } from "@/lib/logger";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 컴포넌트 레벨 에러 격리 — 자식 렌더링 오류가 상위 트리로 전파되지 않도록 차단.
 * Next.js route segment error.tsx는 페이지 단위이므로, 깊은 트리의 위험 컴포넌트에
 * 추가로 적용한다.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logError(error, `ErrorBoundary${info.componentStack.split("\n")[1]?.trim() ?? ""}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700"
          >
            이 영역을 표시하는 중 오류가 발생했습니다.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
