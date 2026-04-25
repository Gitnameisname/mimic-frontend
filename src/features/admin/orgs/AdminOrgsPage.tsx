"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { Modal, ModalActions } from "@/components/feedback/Modal";
import { FormField } from "@/components/form/FormField";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import type { AdminOrg, AdminOrgDetail, OrgMember } from "@/types/admin";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateOnly } from "@/lib/utils/date";

// ---- 생성 모달 ----

function CreateOrgModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const mutation = useMutationWithToast({
    mutationFn: () =>
      adminApi.createOrg({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      }),
    successMessage: "조직이 생성되었습니다.",
    errorMessage: "조직 생성에 실패했습니다.",
    invalidateKeys: [["admin", "orgs"]],
    onSuccess: () => onClose(),
  });

  return (
    <Modal title="조직 추가" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (!form.name.trim()) return setError("조직 이름을 입력하세요.");
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <FormField
          label="조직 이름" required
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="예: 개발팀"
        />
        <FormField
          label="설명"
          type="textarea"
          value={form.description}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          placeholder="조직 설명 (선택)"
          rows={2}
        />
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <ModalActions onClose={onClose} isPending={mutation.isPending} />
      </form>
    </Modal>
  );
}

// ---- 상세 패널 ----

function OrgDetailPanel({
  orgId,
  onClose,
}: {
  orgId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canDelete = hasRole?.("SUPER_ADMIN") ?? false;
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [editError, setEditError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "org", orgId],
    queryFn: () => adminApi.getOrg(orgId),
    enabled: !!orgId,
  });
  const org = data?.data as AdminOrgDetail | undefined;

  const updateMutation = useMutation({
    mutationFn: () =>
      adminApi.updateOrg(orgId, {
        name: editForm.name.trim() || undefined,
        description: editForm.description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] });
      setEditing(false);
    },
    onError: (e: Error) => setEditError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteOrg(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] });
      onClose();
    },
  });

  function startEdit() {
    if (!org) return;
    setEditForm({ name: org.name, description: org.description ?? "" });
    setEditError("");
    setEditing(true);
  }

  const memberColumns: Column<OrgMember>[] = [
    {
      key: "display_name",
      header: "이름",
      render: (m) => <span className="font-medium text-gray-800">{m.display_name}</span>,
    },
    {
      key: "email",
      header: "이메일",
      render: (m) => <span className="text-gray-500 text-xs">{m.email}</span>,
    },
    {
      key: "role_name",
      header: "역할",
      render: (m) => (
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
          {m.role_name}
        </span>
      ),
    },
    {
      key: "joined_at",
      header: "합류일",
      render: (m) => formatDateOnly(m.joined_at),
    },
  ];

  return (
    <div className="w-96 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">조직 상세</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : !org ? (
          <p className="text-gray-400">정보를 불러올 수 없습니다.</p>
        ) : editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEditError("");
              if (!editForm.name.trim()) return setEditError("조직 이름을 입력하세요.");
              updateMutation.mutate();
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">조직 이름</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">설명</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>
            {editError && <p className="text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded">{editError}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1 bg-blue-600 text-white text-xs font-medium rounded-lg py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-xs rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">조직 이름</p>
              <p className="font-semibold text-gray-900">{org.name}</p>
            </div>
            {org.description && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">설명</p>
                <p className="text-gray-600">{org.description}</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">상태</p>
                <StatusBadge value={org.status} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">멤버 수</p>
                <p className="text-gray-700 font-medium">{org.member_count}명</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">생성일</p>
                <p className="text-gray-700">{formatDateOnly(org.created_at)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={startEdit}
                className="flex-1 text-xs border border-gray-200 text-gray-600 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
              >
                수정
              </button>
              {canDelete && (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  title="SUPER_ADMIN만 사용 가능"
                  className="flex-1 text-xs border border-red-200 text-red-600 rounded-lg py-1.5 hover:bg-red-50 transition-colors min-h-[36px]"
                >
                  삭제
                </button>
              )}
            </div>

            {/* 멤버 목록 */}
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                멤버 ({org.members.length}명)
              </p>
              {org.members.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">멤버가 없습니다.</p>
              ) : (
                <DataTable
                  columns={memberColumns}
                  rows={org.members}
                  rowKey={(m) => m.user_id}
                  emptyMessage=""
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* 삭제 확인 */}
      {deleteConfirm && org && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">조직 삭제</h2>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{org.name}</strong> 조직을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- 메인 페이지 ----

export function AdminOrgsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orgs", page, search],
    queryFn: () => adminApi.getOrgs({ page, page_size: 20, search: search || undefined }),
  });

  const columns: Column<AdminOrg>[] = [
    {
      key: "name",
      header: "조직 이름",
      render: (row) => <span className="font-medium text-gray-900">{row.name}</span>,
    },
    {
      key: "description",
      header: "설명",
      render: (row) => (
        <span className="text-gray-500 truncate max-w-xs block">{row.description ?? "-"}</span>
      ),
    },
    {
      key: "member_count",
      header: "멤버 수",
      width: "100px",
      render: (row) => `${row.member_count}명`,
    },
    {
      key: "status",
      header: "상태",
      width: "90px",
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: "created_at",
      header: "생성일",
      render: (row) => formatDateOnly(row.created_at),
    },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4 sm:p-6 space-y-5 overflow-y-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">조직 관리</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 active:scale-95 min-h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            조직 추가
          </button>
        </div>

        {/* 검색 */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
              setPage(1);
            }}
            className="flex gap-3 items-end"
          >
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">조직 이름 검색</label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="조직 이름..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              검색
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                초기화
              </button>
            )}
          </form>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
            총 {data?.total ?? 0}개 조직
          </div>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(r) => r.id}
            loading={isLoading}
            onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
            emptyMessage="등록된 조직이 없습니다."
          />
          <Pagination
            page={page}
            pageSize={20}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* 상세 패널 */}
      {selectedId && (
        <OrgDetailPanel orgId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
