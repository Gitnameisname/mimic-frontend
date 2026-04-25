"use strict";
/**
 * useFolders — S3 Phase 2 FG 2-1.
 *
 * React Query 훅: 전체 트리 조회 + 생성 / rename / move / delete + document_folder 설정.
 */
"use client";
/**
 * useFolders — S3 Phase 2 FG 2-1.
 *
 * React Query 훅: 전체 트리 조회 + 생성 / rename / move / delete + document_folder 설정.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOLDERS_QUERY_KEY = void 0;
exports.useFolders = useFolders;
exports.useCreateFolder = useCreateFolder;
exports.useRenameFolder = useRenameFolder;
exports.useMoveFolder = useMoveFolder;
exports.useDeleteFolder = useDeleteFolder;
exports.useSetDocumentFolder = useSetDocumentFolder;
const react_query_1 = require("@tanstack/react-query");
const folders_1 = require("@/lib/api/folders");
const client_1 = require("@/lib/api/client");
const uiStore_1 = require("@/stores/uiStore");
exports.FOLDERS_QUERY_KEY = ["folders", "tree"];
function useFolders() {
    return (0, react_query_1.useQuery)({
        queryKey: exports.FOLDERS_QUERY_KEY,
        queryFn: async () => (await folders_1.foldersApi.list()).items,
        staleTime: 30_000,
    });
}
function useCreateFolder() {
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (body) => folders_1.foldersApi.create(body),
        onSuccess: (created) => {
            qc.setQueryData(exports.FOLDERS_QUERY_KEY, (prev) => prev ? [...prev, created].sort((a, b) => a.path.localeCompare(b.path)) : [created]);
            (0, uiStore_1.toast)(`폴더 "${created.name}" 이 생성되었습니다`, "success");
        },
        onError: (err) => {
            (0, uiStore_1.toast)((0, client_1.getApiErrorMessage)(err, "폴더 생성에 실패했습니다"), "error");
        },
    });
}
function useRenameFolder() {
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (args) => folders_1.foldersApi.rename(args.id, args.newName),
        onSuccess: () => {
            // rename 은 path prefix 변경으로 다른 폴더도 영향. 전체 invalidate
            qc.invalidateQueries({ queryKey: exports.FOLDERS_QUERY_KEY });
            (0, uiStore_1.toast)("폴더 이름이 변경되었습니다", "success");
        },
        onError: (err) => {
            (0, uiStore_1.toast)((0, client_1.getApiErrorMessage)(err, "폴더 이름 변경에 실패했습니다"), "error");
        },
    });
}
function useMoveFolder() {
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (args) => folders_1.foldersApi.move(args.id, { new_parent_id: args.newParentId }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: exports.FOLDERS_QUERY_KEY });
            (0, uiStore_1.toast)("폴더가 이동되었습니다", "success");
        },
        onError: (err) => {
            (0, uiStore_1.toast)((0, client_1.getApiErrorMessage)(err, "폴더 이동에 실패했습니다"), "error");
        },
    });
}
function useDeleteFolder() {
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (id) => folders_1.foldersApi.delete(id),
        onMutate: async (id) => {
            await qc.cancelQueries({ queryKey: exports.FOLDERS_QUERY_KEY });
            const previous = qc.getQueryData(exports.FOLDERS_QUERY_KEY);
            if (previous) {
                qc.setQueryData(exports.FOLDERS_QUERY_KEY, previous.filter((f) => f.id !== id));
            }
            return { previous };
        },
        onError: (err, _id, ctx) => {
            if (ctx?.previous)
                qc.setQueryData(exports.FOLDERS_QUERY_KEY, ctx.previous);
            (0, uiStore_1.toast)((0, client_1.getApiErrorMessage)(err, "폴더 삭제에 실패했습니다"), "error");
        },
        onSuccess: () => {
            (0, uiStore_1.toast)("폴더가 삭제되었습니다", "success");
        },
    });
}
function useSetDocumentFolder() {
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (args) => folders_1.foldersApi.setDocumentFolder(args.documentId, args.folderId),
        onSuccess: (_data, vars) => {
            // 문서 목록 / 문서 상세 모두 polder 변화에 반응하도록 invalidate.
            // DocumentListPage 는 ["documents", ...] 단수 prefix 로 캐시되고, DocumentDetailPage 는
            // ["document", id] 로 캐시된다 — 두 개를 분리 invalidate 해야 UI 가 stale 이 안 된다.
            qc.invalidateQueries({ queryKey: ["documents"] });
            qc.invalidateQueries({ queryKey: ["document", vars.documentId] });
            (0, uiStore_1.toast)("문서 폴더가 변경되었습니다", "success");
        },
        onError: (err) => {
            (0, uiStore_1.toast)((0, client_1.getApiErrorMessage)(err, "문서 폴더 변경에 실패했습니다"), "error");
        },
    });
}
