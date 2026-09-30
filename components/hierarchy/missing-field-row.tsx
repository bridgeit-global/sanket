'use client';

import type { MouseEvent } from 'react';
import { AlertCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MissingFieldRowProps {
  label: string;
  actionLabel?: string;
  onAction?: (event: MouseEvent) => void;
}

/** Amber row for a profile field the user still needs to fill in. */
export function MissingFieldRow({ label, actionLabel, onAction }: MissingFieldRowProps) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-amber-400 bg-amber-50 px-2 py-1 dark:border-amber-700 dark:bg-amber-950/50">
      <span className="inline-flex min-w-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:text-amber-100">
        <AlertCircle className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      {actionLabel && onAction ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 shrink-0 gap-1 border-amber-500/70 bg-background px-2 text-[10px] font-semibold text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-950"
          onClick={onAction}
        >
          <Pencil className="size-3" aria-hidden />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
