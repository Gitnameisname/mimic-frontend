"use client";

/**
 * useAuthz — 프론트엔드 권한 확인 훅 (Phase 8 JWT 연동 전 임시 구현)
 *
 * 역할은 localStorage에 저장(zustand persist).
 * Phase 8에서 JWT 페이로드로 교체될 예정.
 *
 * 개발 중 역할 전환: DevRoleSwitcher 컴포넌트 또는 useAuthz().setRole() 호출.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---- 타입 ----

export type UserRole =
  | "VIEWER"
  | "AUTHOR"
  | "REVIEWER"
  | "APPROVER"
  | "ORG_ADMIN"
  | "SUPER_ADMIN";

export type AuthzAction =
  | "document.edit"
  | "document.delete"
  | "workflow.submit-review"
  | "workflow.approve"
  | "workflow.reject"
  | "workflow.publish"
  | "workflow.archive"
  | "admin.read"
  | "admin.write";

// ---- 권한 매트릭스 (백엔드 authorization.py와 동기화 유지) ----

const PERMISSION_MAP: Record<AuthzAction, ReadonlyArray<UserRole>> = {
  "document.edit": ["AUTHOR", "ORG_ADMIN", "SUPER_ADMIN"],
  "document.delete": ["ORG_ADMIN", "SUPER_ADMIN"],
  "workflow.submit-review": ["AUTHOR", "ORG_ADMIN", "SUPER_ADMIN"],
  "workflow.approve": ["APPROVER", "ORG_ADMIN", "SUPER_ADMIN"],
  "workflow.reject": ["REVIEWER", "APPROVER", "ORG_ADMIN", "SUPER_ADMIN"],
  "workflow.publish": ["APPROVER", "ORG_ADMIN", "SUPER_ADMIN"],
  "workflow.archive": ["ORG_ADMIN", "SUPER_ADMIN"],
  "admin.read": ["ORG_ADMIN", "SUPER_ADMIN"],
  "admin.write": ["SUPER_ADMIN"],
};

// ---- Zustand 스토어 ----

interface AuthzState {
  role: UserRole;
  actorId: string;
  setRole: (role: UserRole) => void;
  setActorId: (id: string) => void;
}

export const useAuthzStore = create<AuthzState>()(
  persist(
    (set) => ({
      role: "VIEWER" as UserRole,
      actorId: "dev-user",
      setRole: (role) => set({ role }),
      setActorId: (actorId) => set({ actorId }),
    }),
    { name: "mimir-authz" }
  )
);

// ---- 훅 ----

export function useAuthz() {
  const { role, actorId, setRole, setActorId } = useAuthzStore();

  function can(action: AuthzAction): boolean {
    return (PERMISSION_MAP[action] as UserRole[]).includes(role);
  }

  return { role, actorId, setRole, setActorId, can };
}
