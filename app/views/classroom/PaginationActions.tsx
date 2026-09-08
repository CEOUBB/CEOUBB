import { CaretLeft, CaretRight } from "@phosphor-icons/react";

type PaginationActionsProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

// Implements: REQ-PAG-01, REQ-PAG-04
export function PaginationActions({ page, totalPages, onPageChange }: PaginationActionsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination-actions">
      <button
        aria-label="Página anterior"
        className="pagination-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        type="button"
      >
        <CaretLeft aria-hidden="true" size={16} />
        Anterior
      </button>
      <span className="pagination-indicator num">
        Página {page} de {totalPages}
      </span>
      <button
        aria-label="Página siguiente"
        className="pagination-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        type="button"
      >
        Siguiente
        <CaretRight aria-hidden="true" size={16} />
      </button>
    </div>
  );
}
