import { cn } from "../../utils/cn";

interface TablePaginationProps {
  alwaysShow?: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  totalPages: number;
}

export function TablePagination({
  alwaysShow = false,
  currentPage,
  onPageChange,
  totalPages,
}: TablePaginationProps) {
  const pageTotal = Math.max(1, totalPages);

  if (pageTotal <= 1 && !alwaysShow) {
    return null;
  }

  const pages: Array<number | "..."> = [];

  if (pageTotal <= 5) {
    for (let page = 1; page <= pageTotal; page += 1) {
      pages.push(page);
    }
  } else if (currentPage <= 3) {
    pages.push(1, 2, 3, "...", pageTotal);
  } else if (currentPage >= pageTotal - 2) {
    pages.push(1, "...", pageTotal - 2, pageTotal - 1, pageTotal);
  } else {
    pages.push(1, "...", currentPage, "...", pageTotal);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Previous page"
        className="inline-flex h-9 min-w-[64px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        type="button"
      >
        Prev
      </button>
      {pages.map((page, index) =>
        page === "..." ? (
          <span className="px-2 text-sm text-slate-400" key={`ellipsis-${index}`}>
            ...
          </span>
        ) : (
          <button
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-3 text-sm font-medium transition",
              page === currentPage
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            key={page}
            onClick={() => onPageChange(page)}
            type="button"
          >
            {page}
          </button>
        ),
      )}
      <button
        aria-label="Next page"
        className="inline-flex h-9 min-w-[64px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={currentPage === pageTotal}
        onClick={() => onPageChange(Math.min(pageTotal, currentPage + 1))}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
