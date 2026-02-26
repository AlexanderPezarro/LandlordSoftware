import { ChevronUp, ChevronDown } from 'lucide-react';
import styles from './Table.module.scss';

// ---------------------------------------------------------------------------
// Prop interfaces
// ---------------------------------------------------------------------------

export interface TableContainerProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface TableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export interface TableCellProps {
  children?: React.ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
}

export interface TablePaginationProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
  className?: string;
}

export interface TableEmptyProps {
  children?: React.ReactNode;
  colSpan: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TableContainer({ children, className }: TableContainerProps) {
  const classNames = [styles.container, className].filter(Boolean).join(' ');
  return <div className={classNames}>{children}</div>;
}

function TableHead({ children, className }: TableHeadProps) {
  const classNames = [styles.head, className].filter(Boolean).join(' ');
  return <thead className={classNames}>{children}</thead>;
}

function TableBody({ children, className }: TableBodyProps) {
  const classNames = [styles.body, className].filter(Boolean).join(' ');
  return <tbody className={classNames}>{children}</tbody>;
}

function TableRow({ children, onClick, className }: TableRowProps) {
  const classNames = [styles.row, onClick && styles.clickableRow, className]
    .filter(Boolean)
    .join(' ');

  return (
    <tr className={classNames} onClick={onClick}>
      {children}
    </tr>
  );
}

function TableCell({
  children,
  sortable,
  sortDirection,
  onSort,
  align = 'left',
  width,
  className,
}: TableCellProps) {
  const isHeader = sortable !== undefined || sortDirection !== undefined;

  const classNames = [
    styles.cell,
    isHeader && styles.headerCell,
    sortable && styles.sortable,
    align === 'center' && styles.alignCenter,
    align === 'right' && styles.alignRight,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = width ? { width } : {};

  if (isHeader) {
    return (
      <th
        className={classNames}
        style={style}
        onClick={sortable ? onSort : undefined}
        aria-sort={
          sortDirection === 'asc'
            ? 'ascending'
            : sortDirection === 'desc'
              ? 'descending'
              : undefined
        }
      >
        <span className={styles.cellContent}>
          {children}
          {sortable && (
            <span className={styles.sortIcon}>
              {sortDirection === 'asc' ? (
                <ChevronUp size={16} />
              ) : sortDirection === 'desc' ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronUp size={16} className={styles.sortInactive} />
              )}
            </span>
          )}
        </span>
      </th>
    );
  }

  return (
    <td className={classNames} style={style}>
      {children}
    </td>
  );
}

function TableEmpty({
  children = 'No data available',
  colSpan,
  className,
}: TableEmptyProps) {
  const classNames = [styles.emptyRow, className].filter(Boolean).join(' ');
  return (
    <tr>
      <td colSpan={colSpan} className={classNames}>
        {children}
      </td>
    </tr>
  );
}

function TablePagination({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 25, 50],
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(count / rowsPerPage));
  const startItem = count === 0 ? 0 : page * rowsPerPage + 1;
  const endItem = Math.min((page + 1) * rowsPerPage, count);

  const classNames = [styles.pagination, className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      {onRowsPerPageChange && (
        <div className={styles.rowsPerPage}>
          <label htmlFor="rows-per-page" className={styles.rowsPerPageLabel}>
            Rows per page:
          </label>
          <select
            id="rows-per-page"
            className={styles.rowsPerPageSelect}
            value={rowsPerPage}
            onChange={(e) => {
              onRowsPerPageChange(Number(e.target.value));
              onPageChange(0);
            }}
          >
            {rowsPerPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      <span className={styles.pageInfo}>
        {startItem}–{endItem} of {count}
      </span>

      <div className={styles.pageButtons}>
        <button
          type="button"
          className={styles.pageButton}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          &lsaquo;
        </button>
        <button
          type="button"
          className={styles.pageButton}
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

function TableRoot({ children, className }: TableProps) {
  const classNames = [styles.table, className].filter(Boolean).join(' ');
  return <table className={classNames}>{children}</table>;
}

// ---------------------------------------------------------------------------
// Compound component assembly
// ---------------------------------------------------------------------------

export const Table = Object.assign(TableRoot, {
  Container: TableContainer,
  Head: TableHead,
  Body: TableBody,
  Row: TableRow,
  Cell: TableCell,
  Empty: TableEmpty,
  Pagination: TablePagination,
});
