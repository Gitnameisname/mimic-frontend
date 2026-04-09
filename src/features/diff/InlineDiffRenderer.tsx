"use client";

import type { InlineDiffToken } from "@/types/diff";

interface Props {
  tokens: InlineDiffToken[];
  skipped?: boolean;
}

/**
 * 인라인 diff 토큰 배열을 HTML로 렌더링한다.
 *
 * 보안: 텍스트는 textContent로 삽입하여 XSS를 방지한다.
 * (React의 기본 이스케이프 처리 활용)
 */
export function InlineDiffRenderer({ tokens, skipped }: Props) {
  if (skipped) {
    return (
      <span className="text-xs text-gray-400 italic">
        (텍스트가 너무 길어 인라인 diff를 생략했습니다)
      </span>
    );
  }

  if (!tokens || tokens.length === 0) {
    return null;
  }

  return (
    <span className="inline leading-relaxed break-words">
      {tokens.map((token, i) => {
        if (token.type === "added") {
          return (
            <mark
              key={i}
              className="bg-green-100 text-green-900 underline decoration-green-500 rounded-sm px-0.5"
            >
              {token.text}
            </mark>
          );
        }
        if (token.type === "deleted") {
          return (
            <del
              key={i}
              className="bg-red-100 text-red-900 line-through decoration-red-500 rounded-sm px-0.5"
            >
              {token.text}
            </del>
          );
        }
        return <span key={i}>{token.text}</span>;
      })}
    </span>
  );
}
