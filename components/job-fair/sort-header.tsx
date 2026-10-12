'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableHead } from '@/components/ui/table';
import type { JobFairSortDir } from '@/lib/job-fair/page-query';

export function SortableColumnHead({
  label,
  column,
  sort,
  dir,
  onSort,
  className,
}: {
  label: string;
  column: string;
  sort: string;
  dir: JobFairSortDir;
  onSort: (column: string) => void;
  className?: string;
}) {
  const active = sort === column;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="inline-flex h-10 max-w-full items-center gap-1 rounded-md text-left hover:text-foreground"
        onClick={() => onSort(column)}
      >
        <span className="truncate">{label}</span>
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="size-3.5 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="size-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-3.5 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}

export function JobFairSortBar({
  options,
  sort,
  dir,
  onSort,
  onDir,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  sort: string;
  dir: JobFairSortDir;
  onSort: (column: string) => void;
  onDir: (dir: JobFairSortDir) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b p-4 sm:grid-cols-2 lg:hidden">
      <div className="min-w-0 space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Sort by</div>
        <Select value={sort} onValueChange={onSort}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-1.5">
        <div className="text-xs font-medium text-muted-foreground">Order</div>
        <Select value={dir} onValueChange={(value) => onDir(value === 'asc' ? 'asc' : 'desc')}>
          <SelectTrigger className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
