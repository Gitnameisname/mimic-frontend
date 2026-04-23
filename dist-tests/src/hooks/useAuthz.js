"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuthzStore = void 0;
exports.useAuthz = useAuthz;
/**
 * useAuthz — 프론트엔드 권한 확인 훅
 *
 * SEC3-FE-002: localStorage persist 제거 — 역할을 세션 메모리에만 저장.
 * localStorage 저장 시 DevTools에서 role을 SUPER_ADMIN으로 위변조 가능하여 제거.
 * TODO(S3-Phase1): JWT 페이로드 클레임 기반으로 교체.
 */
const zustand_1 = require("zustand");
// ---- 권한 매트릭스 (백엔드 authorization.py와 동기화 유지) ----
const PERMISSION_MAP = {
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
exports.useAuthzStore = (0, zustand_1.create)()((set) => ({
    role: "VIEWER",
    actorId: "",
    setRole: (role) => set({ role }),
    setActorId: (actorId) => set({ actorId }),
}));
// ---- 훅 ----
function useAuthz() {
    const { role, actorId, setRole, setActorId } = (0, exports.useAuthzStore)();
    function can(action) {
        return PERMISSION_MAP[action].includes(role);
    }
    return { role, actorId, setRole, setActorId, can };
}
