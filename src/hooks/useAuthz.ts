"use client";

/**
 * useAuthz — 프론트엔드 권한 확인 훅
 *
 * SEC3-FE-002: localStorage persist 제거 — 역할을 세션 메모리에만 저장.
 * localStorage 저장 시 DevTools에서 role을 SUPER_ADMIN으로 위변조 가능하여 제거.
 * TODO(S3-Phase1): JWT 페이로드 클레임 기반으로 교체.
 */

import { create } from "zustand";

// ---- 타입 ----

export type UserRole =
  | "VIEWER"
  | "AUTHOR"
  | "REVIEWER"
  | "APPROVER"
  | "ORG_ADMIN"
  | "SUPER_ADMIN";

export type AuthzAction =
  | "document.create"
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
  "document.create": ["AUTHOR", "ORG_ADMIN", "SUPER_ADMIN"],
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

export const useAuthzStore = create<AuthzState>()((set) => ({
  role: "VIEWER" as UserRole,
  actorId: "",
  setRole: (role) => set({ role }),
  setActorId: (actorId) => set({ actorId }),
}));

// ---- 훅 ----

export function useAuthz() {
  const { role, actorId, setRole, setActorId } = useAuthzStore();

  function can(action: AuthzAction): boolean {
    return (PERMISSION_MAP[action] as UserRole[]).includes(role);
  }

  return { role, actorId, setRole, setActorId, can };
}
