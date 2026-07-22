'use client';

import { ChevronRight, ExternalLink, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/hooks/use-translations';
import { formatCurrency } from '@/lib/mla-office-utils';
import type { AdmFundRecordWithDetails } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface AdmFundSummaryRowProps {
  fund: AdmFundRecordWithDetails;
  onSelect: (id: string) => void;
}

export function AdmFundSummaryRow({ fund, onSelect }: AdmFundSummaryRowProps) {
  const { t } = useTranslations();
  const isOverallocated = fund.allocatedBudget > fund.budget;
  const documentsWithUrl = fund.documents.filter(
    (d) => d.attachmentFileUrl || d.fileUrl,
  );

  return (
    <div className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect(fund.id)}
          className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('adm.viewFund')}
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-semibold">
                {fund.categoryName}
              </Badge>
              {fund.batchLabel ? (
                <Badge variant="outline" className="font-medium">
                  {fund.batchLabel}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('adm.financialYear')}: {fund.financialYear}
            </p>
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        <button
          type="button"
          onClick={() => onSelect(fund.id)}
          className="grid w-full grid-cols-1 gap-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-3"
        >
          <span>
            {t('adm.fundBudget')}:{' '}
            <span className="font-semibold">{formatCurrency(fund.budget)}</span>
          </span>
          <span className={cn(isOverallocated && 'text-destructive')}>
            {t('adm.budgetUsed')}:{' '}
            <span className="font-semibold">
              {formatCurrency(fund.allocatedBudget)}
            </span>
          </span>
          <span>
            {t('adm.projectsCount', { count: String(fund.allocations.length) })}
          </span>
        </button>

        {documentsWithUrl.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {documentsWithUrl.map((doc) => {
              const href = doc.attachmentFileUrl || doc.fileUrl;
              if (!href) return null;
              return (
                <a
                  key={doc.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex min-h-11 w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-primary hover:bg-muted/40 sm:w-auto sm:min-h-9"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 truncate">
                    {doc.label || doc.fileName || t('adm.sourceDetailsPdf')}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              );
            })}
          </div>
        ) : null}

        {isOverallocated ? (
          <Badge
            variant="outline"
            className="w-fit border-destructive/40 bg-destructive/10 text-destructive"
          >
            {t('adm.budgetOverallocated')}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
