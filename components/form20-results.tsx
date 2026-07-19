'use client';

import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { AnalyticsDataTable } from './analytics-data-table';
import {
  candidateVoteColumns,
  compactForm20Columns,
  type AnalyticsRow,
} from '@/lib/analytics/table-utils';

export type Form20Winner = {
  name?: string;
  totalVotes?: number;
  runnerUp?: string;
  runnerUpVotes?: number;
  margin?: number;
};

export type Form20Turnout = {
  percentage?: number;
  votesPolled?: number;
  electors?: number;
};

export type Form20ResultsData = {
  answer?: string;
  summary?: string;
  results?: AnalyticsRow[];
  rowCount?: number;
  truncated?: boolean;
  note?: string;
  error?: string;
  mappingSource?: string;
  winner?: Form20Winner;
  turnout?: Form20Turnout;
  candidateA?: string;
  candidateB?: string;
  missingParts?: string[];
};

type Form20ResultsProps = {
  data: Form20ResultsData;
  isReadonly?: boolean;
  onFollowUp?: (text: string) => void;
};

function friendlyError(error: string): string {
  const lower = error.toLowerCase();
  if (lower.includes('unknown candidate') || lower.includes('could not resolve')) {
    return 'Could not match that candidate name to Form 20. Try a fuller name or spelling.';
  }
  if (lower.includes('no form 20 parts mapped') || lower.includes('no booth')) {
    return 'No booth→ward mapping found for that ward. Check the ward number.';
  }
  if (lower.includes('requires partnos') || lower.includes('requires wardno')) {
    return 'This Form 20 request needs a part or ward number.';
  }
  return error;
}

function FollowUpChips({
  chips,
  onFollowUp,
}: {
  chips: string[];
  onFollowUp?: (text: string) => void;
}) {
  if (!onFollowUp || chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Button
          key={chip}
          type="button"
          variant="secondary"
          size="sm"
          className="h-auto whitespace-normal text-left text-xs"
          onClick={() => onFollowUp(chip)}
        >
          {chip}
        </Button>
      ))}
    </div>
  );
}

export function Form20Results({ data, isReadonly, onFollowUp }: Form20ResultsProps) {
  const [compactColumns, setCompactColumns] = useState(false);

  const answer = String(data.answer ?? data.summary ?? '').trim();
  const rows = Array.isArray(data.results) ? data.results : [];
  const allColumns = rows.length > 0 ? Object.keys(rows[0] as AnalyticsRow) : [];
  const rowCount = typeof data.rowCount === 'number' ? data.rowCount : rows.length;
  const truncated = Boolean(data.truncated) || rowCount > rows.length;

  const preferredCandidates = useMemo(
    () => [data.candidateA, data.candidateB].filter((name): name is string => Boolean(name)),
    [data.candidateA, data.candidateB],
  );

  const displayColumns = useMemo(() => {
    if (!compactColumns) return allColumns;
    return compactForm20Columns(allColumns, rows, preferredCandidates, 3);
  }, [allColumns, rows, preferredCandidates, compactColumns]);

  const hasManyCandidates = candidateVoteColumns(allColumns).length > 3;

  const followUps = useMemo(() => {
    const chips: string[] = [];
    if (data.winner) {
      chips.push('Top parts by margin');
      chips.push('Form 20 votes by ward');
    }

    const first = rows[0];
    const wardNo =
      (first?.wardNo != null ? String(first.wardNo) : null) ??
      (rows.length === 1 && first?.wardNo != null ? String(first.wardNo) : null);
    const singleWard =
      rows.length > 0 &&
      rows.every((row) => row.wardNo != null && String(row.wardNo) === String(rows[0].wardNo));

    if (singleWard && rows[0]?.wardNo != null) {
      chips.push(`Show parts in ward ${rows[0].wardNo}`);
    } else if (wardNo && rows.some((row) => row.partCount != null)) {
      chips.push(`Show parts in ward ${wardNo}`);
    }

    if (rows.length === 1 && rows[0]?.partNo != null) {
      chips.push(`Which ward is part ${rows[0].partNo} in?`);
      chips.push(`Compare top candidates in part ${rows[0].partNo}`);
    }

    return [...new Set(chips)].slice(0, 3);
  }, [data.winner, rows]);

  if (data.error) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <h3 className="text-base font-semibold text-destructive">
          Couldn’t load Form 20 results
        </h3>
        <p className="text-sm text-destructive/90">{friendlyError(String(data.error))}</p>
        {answer && answer !== data.error && (
          <p className="text-sm text-muted-foreground">{answer}</p>
        )}
      </div>
    );
  }

  const winner = data.winner;
  const turnout = data.turnout;
  const firstRow = rows[0];
  const showWardKpi =
    !winner &&
    rows.length === 1 &&
    firstRow?.wardNo != null &&
    (firstRow.totalVotes != null || firstRow.partCount != null);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Form 20 results</h3>
          <p className="text-xs text-muted-foreground">
            AC 172 · 2024
            {data.mappingSource ? ` · ${data.mappingSource}` : ''}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {rowCount} row{rowCount !== 1 ? 's' : ''}
        </div>
      </div>

      {answer && <p className="text-sm leading-relaxed text-foreground">{answer}</p>}

      {(winner || turnout) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {winner?.name && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Winner</p>
              <p className="text-sm font-medium">{winner.name}</p>
              {winner.totalVotes != null && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {winner.totalVotes.toLocaleString()} votes
                </p>
              )}
            </div>
          )}
          {winner?.runnerUp && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Runner-up</p>
              <p className="text-sm font-medium">{winner.runnerUp}</p>
              {winner.runnerUpVotes != null && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {winner.runnerUpVotes.toLocaleString()} votes
                </p>
              )}
            </div>
          )}
          {winner?.margin != null && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className="text-sm font-medium tabular-nums">
                {winner.margin.toLocaleString()}
              </p>
            </div>
          )}
          {turnout?.percentage != null && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Turnout</p>
              <p className="text-sm font-medium tabular-nums">{turnout.percentage}%</p>
              {turnout.votesPolled != null && turnout.electors != null && (
                <p className="text-xs tabular-nums text-muted-foreground">
                  {turnout.votesPolled.toLocaleString()} / {turnout.electors.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {data.candidateA && data.candidateB && (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">Head-to-head · </span>
          <span className="font-medium">{data.candidateA}</span>
          <span className="text-muted-foreground"> vs </span>
          <span className="font-medium">{data.candidateB}</span>
        </div>
      )}

      {showWardKpi && firstRow && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Ward</p>
            <p className="text-sm font-medium">{String(firstRow.wardNo)}</p>
          </div>
          {firstRow.partCount != null && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Parts</p>
              <p className="text-sm font-medium tabular-nums">
                {String(firstRow.partCount)}
              </p>
            </div>
          )}
          {firstRow.totalVotes != null && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Total votes</p>
              <p className="text-sm font-medium tabular-nums">
                {Number(firstRow.totalVotes).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}

      {data.note && !truncated && (
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">{data.note}</p>
        </div>
      )}

      {data.missingParts && data.missingParts.length > 0 && (
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            Missing parts: {data.missingParts.join(', ')}
          </p>
        </div>
      )}

      {hasManyCandidates && rows.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCompactColumns((prev) => !prev)}
        >
          {compactColumns ? 'Show all candidates' : 'Show compact columns'}
        </Button>
      )}

      {rows.length > 0 ? (
        <AnalyticsDataTable
          columns={displayColumns}
          rows={rows}
          truncated={truncated}
          displayedCount={rows.length}
          totalCount={rowCount}
          csvFilename="form20-results.csv"
        />
      ) : (
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">
            No rows for this request. Check the ward or part number and try again.
          </p>
        </div>
      )}

      {!isReadonly && <FollowUpChips chips={followUps} onFollowUp={onFollowUp} />}
    </div>
  );
}
