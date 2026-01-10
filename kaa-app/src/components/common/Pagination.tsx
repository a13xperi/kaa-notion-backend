/**
 * Pagination Component
 * Reusable pagination with page numbers and navigation.
 */

import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  disabled = false,
  className = '',
}: PaginationProps) {
  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    
    // Always show first page
    pages.push(1);
    
    // Calculate range around current page
    const leftSibling = Math.max(2, currentPage - siblingCount);
    const rightSibling = Math.min(totalPages - 1, currentPage + siblingCount);
    
    // Add left ellipsis if needed
    if (leftSibling > 2) {
      pages.push('ellipsis');
    }
    
    // Add pages around current
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }
    
    // Add right ellipsis if needed
    if (rightSibling < totalPages - 1) {
      pages.push('ellipsis');
    }
    
    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers();
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <nav
      className={`pagination ${className}`}
      aria-label="Pagination"
    >
      {showFirstLast && (
        <button
          className="pagination__button pagination__button--nav"
          onClick={() => onPageChange(1)}
          disabled={disabled || !canGoPrev}
          aria-label="Go to first page"
        >
          ««
        </button>
      )}

      <button
        className="pagination__button pagination__button--nav"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || !canGoPrev}
        aria-label="Go to previous page"
      >
        «
      </button>

      <div className="pagination__pages">
        {pageNumbers.map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="pagination__ellipsis">
              …
            </span>
          ) : (
            <button
              key={page}
              className={`pagination__button pagination__button--page ${
                page === currentPage ? 'pagination__button--active' : ''
              }`}
              onClick={() => onPageChange(page)}
              disabled={disabled || page === currentPage}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
      </div>

      <button
        className="pagination__button pagination__button--nav"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || !canGoNext}
        aria-label="Go to next page"
      >
        »
      </button>

      {showFirstLast && (
        <button
          className="pagination__button pagination__button--nav"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || !canGoNext}
          aria-label="Go to last page"
        >
          »»
        </button>
      )}
    </nav>
  );
}

export default Pagination;
