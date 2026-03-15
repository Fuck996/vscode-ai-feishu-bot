import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  containerStyle?: React.CSSProperties;
}

const MAX_VISIBLE_PAGES = 20;
const PAGE_WINDOW_STEP = 10;

function getVisiblePages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const alignedEnd = Math.ceil(currentPage / PAGE_WINDOW_STEP) * PAGE_WINDOW_STEP;
  let start = Math.max(1, alignedEnd - MAX_VISIBLE_PAGES + 1);
  let end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);

  if (end - start + 1 < MAX_VISIBLE_PAGES) {
    start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function TablePagination({ currentPage, totalPages, onPageChange, containerStyle }: TablePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.125rem', ...containerStyle }}>
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', backgroundColor: 'transparent', color: currentPage === 1 ? '#8c959f' : '#0969da', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, opacity: currentPage === 1 ? 0.7 : 1 }}
      >
        <ChevronLeft size={15} />上一页
      </button>

      {visiblePages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: currentPage === page ? 'none' : '1px solid transparent', backgroundColor: currentPage === page ? '#0969da' : 'transparent', color: currentPage === page ? 'white' : '#1f2328', cursor: 'pointer', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: currentPage === page ? 600 : 400 }}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', border: 'none', backgroundColor: 'transparent', color: currentPage === totalPages ? '#8c959f' : '#0969da', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, opacity: currentPage === totalPages ? 0.7 : 1 }}
      >
        下一页<ChevronRight size={15} />
      </button>
    </div>
  );
}