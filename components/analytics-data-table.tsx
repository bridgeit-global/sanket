'use client';

import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import {
  copyText,
  downloadCsv,
  formatCell,
  pickBarSeries,
  rowsToCsv,
  sortRows,
  type AnalyticsRow,
} from '@/lib/analytics/table-utils';
import { cn } from '@/lib/utils';

type AnalyticsDataTableProps = {
  columns: string[];
  rows: AnalyticsRow[];
  truncated?: boolean;
  displayedCount?: number;
  totalCount?: number;
  showChart?: boolean;
  csvFilename?: string;
  className?: string;
};

export function AnalyticsDataTable({
  columns,
  rows,
  truncated = false,
  displayedCount,
  totalCount,
  showChart = true,
  csvFilename = 'analytics-results.csv',
  className,
}: AnalyticsDataTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows;
    return sortRows(rows, sortColumn, sortDirection);
  }, [rows, sortColumn, sortDirection]);

  const barSeries = showChart ? pickBarSeries(columns, sortedRows) : null;
  const maxBarValue = barSeries
    ? Math.max(
        ...sortedRows.map((row) => Number(row[barSeries.valueKey]) || 0),
        1,
      )
    : 1;

  const shown = displayedCount ?? rows.length;
  const total = totalCount ?? rows.length;

  const onSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('desc');
  };

  const handleCopy = async () => {
    const ok = await copyText(rowsToCsv(columns, sortedRows));
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const handleDownload = () => {
    downloadCsv(csvFilename, rowsToCsv(columns, sortedRows));
  };

  if (columns.length === 0 || rows.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copyState === 'copied'
            ? 'Copied'
            : copyState === 'failed'
              ? 'Copy failed'
              : 'Copy table'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
          Download CSV
        </Button>
      </div>

      {barSeries && (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
          {sortedRows.map((row, index) => {
            const label = formatCell(row[barSeries.labelKey]);
            const value = Number(row[barSeries.valueKey]) || 0;
            const width = Math.max(4, Math.round((value / maxBarValue) * 100));
            return (
              <div key={`${label}-${index}`} className="space-y-1">
                <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate font-medium text-foreground">{label}</span>
                  <span className="shrink-0 tabular-nums">{value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-foreground/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="min-w-full">
          <thead className="bg-muted/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="sticky top-0 z-10 border-b border-border bg-muted/90 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground backdrop-blur"
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() => onSort(column)}
                  >
                    {column}
                    {sortColumn === column && (
                      <span aria-hidden>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border/60 last:border-0 hover:bg-muted/40"
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className="whitespace-nowrap px-3 py-2 text-sm text-foreground tabular-nums"
                  >
                    {formatCell(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {truncated && (
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            Showing first {shown} of {total} rows. Download CSV for the visible rows, or ask for a
            narrower filter.
          </p>
        </div>
      )}
    </div>
  );
}
