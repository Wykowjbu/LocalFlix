"use client";

export default function LoadMoreButton({
  loading,
  hasMore,
  onClick,
}: {
  loading: boolean;
  hasMore: boolean;
  onClick: () => void;
}) {
  if (!hasMore && !loading) return null;

  return (
    <div className="flex justify-center py-8">
      {loading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <button
          type="button"
          onClick={onClick}
          className="cursor-pointer rounded-sm border border-[#808080] px-8 py-2 text-[14px] text-[#b3b3b3] transition-colors hover:border-white hover:text-white"
        >
          Tải thêm
        </button>
      )}
    </div>
  );
}
