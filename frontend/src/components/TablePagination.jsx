import React from 'react';

/**
 * TablePagination Component
 * 
 * Standardized, accessible pagination for all admin tables/lists:
 * - Page size options: 10, 25, 50 (defaults to 10)
 * - Label: "Showing 1–10 of N [items]"
 * - Previous & Next buttons with disabled state
 * - Numeric page buttons with ellipses logic (1 ... 4 5 6 ... 12)
 * - Responsive flex-column on mobile, row on tablet/desktop
 */
export default function TablePagination({
  currentPage = 1,
  pageSize = 10,
  totalItems = 0,
  itemLabel = 'records',
  pageSizeOptions = [10, 25, 50],
  onPageChange,
  onPageSizeChange,
}) {
  if (totalItems <= 0) return null;

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate numbered pages with ellipses
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('ellipsis-1');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('ellipsis-2');
    pages.push(totalPages);
  }

  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 pt-3 border-top mt-2">
      {/* Left: Record Range & Page Size Dropdown */}
      <div className="d-flex flex-wrap align-items-center gap-2">
        <span className="small text-muted">
          Showing <strong className="text-dark">{startItem}–{endItem}</strong> of <strong className="text-dark">{totalItems}</strong> {itemLabel}
        </span>
        {onPageSizeChange && (
          <div className="d-flex align-items-center gap-1 ms-2">
            <span className="small text-muted" style={{ fontSize: '0.78rem' }}>Per page:</span>
            <select
              className="form-select form-select-sm py-0.5 px-2"
              style={{ width: 'auto', fontSize: '0.8rem', height: '28px' }}
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
              }}
              aria-label="Select number of records per page"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      {totalPages > 1 && (
        <nav aria-label="Table navigation" className="d-flex align-items-center gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 px-2.5 py-1"
            style={{ minHeight: '30px', fontSize: '0.8rem' }}
            title="Previous page"
          >
            <i className="bi bi-chevron-left" style={{ fontSize: '0.75rem' }}></i>
            <span className="d-none d-sm-inline">Previous</span>
          </button>

          <div className="d-flex align-items-center gap-1">
            {pages.map((p, idx) => {
              if (typeof p === 'string') {
                return (
                  <span key={`ellipsis-${idx}`} className="text-muted px-1 small user-select-none">
                    …
                  </span>
                );
              }
              const isActive = p === currentPage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange && onPageChange(p)}
                  className={`btn btn-sm px-2.5 py-0.5 ${isActive ? 'btn-pg-primary fw-bold text-white' : 'btn-outline-secondary'}`}
                  style={{ minWidth: '30px', height: '30px', fontSize: '0.8rem' }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 px-2.5 py-1"
            style={{ minHeight: '30px', fontSize: '0.8rem' }}
            title="Next page"
          >
            <span className="d-none d-sm-inline">Next</span>
            <i className="bi bi-chevron-right" style={{ fontSize: '0.75rem' }}></i>
          </button>
        </nav>
      )}
    </div>
  );
}
