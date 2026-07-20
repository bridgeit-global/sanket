'use client';

import { ChevronRight, FileText } from 'lucide-react';
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
  const sourceDocuments = fund.documents.filter((d) => d.kind === 'source_details');

  return (
    <button
      type="button"
      onClick={() => onSelect(fund.id)}
      className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t('adm.viewFund')}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
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
              {sourceDocuments.length > 0 ? (
                <Badge variant="outline" className="font-medium">
                  <FileText className="mr-1 h-3 w-3" />
                  {sourceDocuments.length}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('adm.financialYear')}: {fund.financialYear}
            </p>
          </div>
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <span>
            {t('adm.fundBudget')}:{' '}
            <span className="font-semibold">{formatCurrency(fund.budget)}</span>
          </span>
          <span className={cn(isOverallocated && 'text-destructive')}>
            {t('adm.budgetUsed')}:{' '}
            <span className="font-semibold">{formatCurrency(fund.allocatedBudget)}</span>
          </span>
          <span>
            {t('adm.projectsCount', { count: String(fund.allocations.length) })}
          </span>
        </div>

        {isOverallocated ? (
          <Badge
            variant="outline"
            className="w-fit border-destructive/40 bg-destructive/10 text-destructive"
          >
            {t('adm.budgetOverallocated')}
          </Badge>
        ) : null}
      </div>
    </button>
  );
}
