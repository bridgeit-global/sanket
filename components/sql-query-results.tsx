'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { AnalyticsDataTable } from './analytics-data-table';
import type { AnalyticsRow } from '@/lib/analytics/table-utils';

interface SqlQueryResultsProps {
  data: {
    query: string;
    rowCount: number;
    columns: string[];
    data: AnalyticsRow[];
    hasMore: boolean;
    summary: string;
    error?: string;
    details?: string;
    note?: string;
  };
  isReadonly?: boolean;
  onFollowUp?: (text: string) => void;
}

export function SqlQueryResults({ data, isReadonly, onFollowUp }: SqlQueryResultsProps) {
  const [showQuery, setShowQuery] = useState(false);
  const truncated = Boolean(data.hasMore) || data.rowCount > data.data.length;
  const displayed = data.data.length;

  if (data.error) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <h3 className="text-base font-semibold text-destructive">Query error</h3>
        <p className="text-sm text-destructive/90">{data.error}</p>
        {data.details && (
          <p className="text-sm text-muted-foreground">{data.details}</p>
        )}
        {data.note && (
          <p className="text-sm text-muted-foreground">{data.note}</p>
        )}
        {data.query && (
          <details className="rounded-md border border-border bg-muted/40 p-3">
            <summary className="cursor-pointer text-sm font-medium">Show query</summary>
            <code className="mt-2 block break-all text-xs text-muted-foreground">
              {data.query}
            </code>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold">Query results</h3>
        <div className="text-sm text-muted-foreground">
          {data.rowCount} row{data.rowCount !== 1 ? 's' : ''}
        </div>
      </div>

      {data.summary && (
        <p className="text-sm leading-relaxed text-foreground">{data.summary}</p>
      )}

      {data.note && !truncated && (
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">{data.note}</p>
        </div>
      )}

      {data.data.length > 0 ? (
        <AnalyticsDataTable
          columns={data.columns}
          rows={data.data}
          truncated={truncated}
          displayedCount={displayed}
          totalCount={data.rowCount}
          csvFilename="sql-query-results.csv"
        />
      ) : (
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            Query ran successfully but returned no rows.
          </p>
        </div>
      )}

      {data.query && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowQuery((prev) => !prev)}
          >
            {showQuery ? 'Hide query' : 'Show query'}
          </Button>
          {showQuery && (
            <div className="mt-2 rounded-md border border-border bg-muted/40 p-3">
              <code className="block break-all text-xs text-muted-foreground">
                {data.query}
              </code>
            </div>
          )}
        </div>
      )}

      {!isReadonly && data.data.length > 0 && onFollowUp && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-auto whitespace-normal text-left text-xs"
            onClick={() =>
              onFollowUp('Create a report from these query results')
            }
          >
            Create a report from these results
          </Button>
        </div>
      )}
    </div>
  );
}
