/**
 * S2 멀티턴 채팅 페이지.
 *
 * 3-컬럼 레이아웃:
 *  - 좌측: ConversationList placeholder (Task 3-9에서 구현)
 *  - 중앙: ChatWindow (메인 채팅 영역)
 *  - 우측: ReferencePanel placeholder (Task 3-8에서 확장)
 */
import { ChatPage } from "@/features/chat/ChatPage";

export const metadata = {
  title: "멀티턴 AI 대화 | Mimir",
  description: "문서 기반 멀티턴 AI 대화 시스템",
};

export default function Page() {
  return <ChatPage />;
}
