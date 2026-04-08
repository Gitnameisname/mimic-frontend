import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-4">
      <p className="text-5xl font-bold text-gray-200">404</p>
      <h1 className="text-lg font-semibold text-gray-900">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/documents"
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        문서 목록으로 돌아가기
      </Link>
    </div>
  );
}
