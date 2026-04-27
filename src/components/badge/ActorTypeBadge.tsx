/**
 * ActorTypeBadge — S3 Phase 3 FG 3-1.
 *
 * Contributors 패널에서 user / agent / system 액터를 시각적으로 구분.
 * Phase 3 의 "에이전트 액터 일관성" (S2 ⑤) 정책에 따라 사람과 AI 를 한 패널에서 구분 표시.
 */

import { cn } from "@/lib/utils";

export type ContributorActorType = "user" | "agent" | "system";

interface Props {
  actorType: ContributorActorType;
  className?: string;
}

export const ACTOR_TYPE_LABEL: Record<ContributorActorType, string> = {
  user: "사용자",
  agent: "에이전트",
  system: "시스템",
};

export const ACTOR_TYPE_STYLES: Record<ContributorActorType, string> = {
  user: "bg-gray-100 text-gray-700 border-gray-200",
  agent: "bg-indigo-50 text-indigo-700 border-indigo-200",
  system: "bg-amber-50 text-amber-700 border-amber-200",
};

export function ActorTypeBadge({ actorType, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
        ACTOR_TYPE_STYLES[actorType],
        className,
      )}
      aria-label={`액터 유형: ${ACTOR_TYPE_LABEL[actorType]}`}
    >
      {ACTOR_TYPE_LABEL[actorType]}
    </span>
  );
}
