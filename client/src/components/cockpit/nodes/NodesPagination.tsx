import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface NodesPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setPageSize: (size: number) => void;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const NodesPagination: React.FC<NodesPaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  setPageSize,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
}) => {
  if (totalItems <= 0) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-3 sm:flex-row">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted-foreground">
          Menampilkan <strong className="text-slate-200">{startIndex + 1}</strong> -{' '}
          <strong className="text-slate-200">{endIndex}</strong> dari{' '}
          <strong className="text-slate-200">{totalItems}</strong> node
        </span>

        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <span>Per Hal:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded border border-border/80 bg-obsidian-950 px-2 py-1 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-flame"
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="h-7.5 w-7.5 p-0"
          title="Halaman Pertama"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="h-7.5 w-7.5 p-0"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <span className="rounded border border-border/80 bg-obsidian-950 px-2.5 py-1 font-mono text-xs text-slate-200">
          <strong className="text-flame">{currentPage}</strong> / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-7.5 w-7.5 p-0"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-7.5 w-7.5 p-0"
          title="Halaman Terakhir"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
