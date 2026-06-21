interface PagerProps {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

export function Pager({ page, pageCount, onChange }: PagerProps) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3" dir="rtl">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
      >
        السابق
      </button>
      <span className="text-xs text-gray-500">صفحة {page} من {pageCount}</span>
      <button
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        disabled={page >= pageCount}
        className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 disabled:opacity-40 hover:bg-gray-50"
      >
        التالي
      </button>
    </div>
  );
}
