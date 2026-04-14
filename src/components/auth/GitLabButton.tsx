"use client";

/**
 * GitLab 로그인 버튼 (Phase 14-6).
 *
 * GitLab 브랜드 컬러 (#FC6D26) 기반 아이콘 + 텍스트 버튼.
 */

interface GitLabButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function GitLabButton({ onClick, disabled }: GitLabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* GitLab 로고 */}
      <svg width="20" height="20" viewBox="0 0 380 380" fill="none">
        <path
          d="M190.156 362.829L253.722 167.088H126.59L190.156 362.829Z"
          fill="#E24329"
        />
        <path
          d="M190.156 362.829L126.59 167.088H18.3516L190.156 362.829Z"
          fill="#FC6D26"
        />
        <path
          d="M18.3516 167.088L2.77266 215.024C1.35644 219.389 2.89197 224.189 6.61695 227.013L190.156 362.829L18.3516 167.088Z"
          fill="#FCA326"
        />
        <path
          d="M18.3516 167.088H126.59L80.9883 26.8867C79.4016 22.0539 72.6055 22.0539 71.0188 26.8867L18.3516 167.088Z"
          fill="#E24329"
        />
        <path
          d="M190.156 362.829L253.722 167.088H361.961L190.156 362.829Z"
          fill="#FC6D26"
        />
        <path
          d="M361.961 167.088L377.54 215.024C378.956 219.389 377.421 224.189 373.696 227.013L190.156 362.829L361.961 167.088Z"
          fill="#FCA326"
        />
        <path
          d="M361.961 167.088H253.722L299.324 26.8867C300.911 22.0539 307.707 22.0539 309.294 26.8867L361.961 167.088Z"
          fill="#E24329"
        />
      </svg>
      GitLab으로 로그인
    </button>
  );
}
