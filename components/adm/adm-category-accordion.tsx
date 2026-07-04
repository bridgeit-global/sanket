'use client';

import { Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslations } from '@/hooks/use-translations';
import { formatCurrency } from '@/lib/mla-office-utils';
import type { AdmFundingCategoryWithWorks, AdmWorkWithProject } from '@/lib/db/schema';
import { getAdmCategoryElementId } from '@/lib/adm/url-params';
import { AdmWorkCard } from './adm-work-card';
import { cn } from '@/lib/utils';

interface AdmCategoryAccordionProps {
  categories: AdmFundingCategoryWithWorks[];
  expandedCategory: string;
  searchTerm: string;
  onExpandedChange: (categoryId: string) => void;
  onAddWork: (category: AdmFundingCategoryWithWorks) => void;
  onEditWork: (work: AdmWorkWithProject) => void;
  onDeleteWork: (work: AdmWorkWithProject) => void;
  onUpdateWork: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onPhotoUpload: (workId: string, type: 'before' | 'after', file: File) => Promise<void>;
  onPhotoRemove: (workId: string, type: 'before' | 'after') => Promise<void>;
}

function filterWorks(
  works: AdmWorkWithProject[],
  searchTerm: string,
): AdmWorkWithProject[] {
  if (!searchTerm.trim()) return works;
  const q = searchTerm.toLowerCase();
  return works.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      (w.projectName?.toLowerCase().includes(q) ?? false),
  );
}

export function AdmCategoryAccordion({
  categories,
  expandedCategory,
  searchTerm,
  onExpandedChange,
  onAddWork,
  onEditWork,
  onDeleteWork,
  onUpdateWork,
  onPhotoUpload,
  onPhotoRemove,
}: AdmCategoryAccordionProps) {
  const { t } = useTranslations();

  return (
    <Accordion
      type="single"
      defaultValue={expandedCategory || undefined}
      onValueChange={onExpandedChange}
      key={expandedCategory}
    >
      {categories.map((category) => {
        const filteredWorks = filterWorks(category.works, searchTerm);
        const isOverallocated = category.allocatedBudget > category.masterBudget;
        const hasSearch = searchTerm.trim().length > 0;
        const showCategory =
          !hasSearch || filteredWorks.length > 0;

        if (!showCategory) return null;

        return (
          <AccordionItem
            key={category.id}
            id={getAdmCategoryElementId(category.id)}
            className="scroll-mt-4"
            value={category.id}
          >
            <AccordionTrigger
              value={category.id}
              className="px-4 hover:no-underline"
            >
              <div className="flex flex-1 flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between sm:pr-4">
                <div>
                  <span className="font-semibold uppercase">{category.name}</span>
                  <p className="text-xs font-normal text-muted-foreground">
                    {category.code} · {t('adm.clickToExpand')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t('adm.categoryBudget')}:{' '}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(category.masterBudget)}
                    </span>
                  </span>
                  {isOverallocated && (
                    <Badge
                      variant="outline"
                      className="border-destructive/40 bg-destructive/10 text-destructive"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {t('adm.budgetOverallocated')}
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent value={category.id} className="px-4 pb-4">
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    {t('adm.budgetAllocated')}:{' '}
                    <span className="font-medium">{formatCurrency(category.masterBudget)}</span>
                  </span>
                  <span className={cn(isOverallocated && 'text-destructive')}>
                    {t('adm.budgetUsed')}:{' '}
                    <span className="font-medium">{formatCurrency(category.allocatedBudget)}</span>
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-10"
                  onClick={() => onAddWork(category)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t('adm.addWork')}
                </Button>
              </div>

              {filteredWorks.length === 0 ? (
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    {hasSearch ? t('adm.noWorksMatch') : t('adm.noWorks')}
                  </p>
                  {!hasSearch && (
                    <p className="text-xs text-muted-foreground/80">{t('adm.noWorksHint')}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredWorks.map((work) => (
                    <AdmWorkCard
                      key={work.id}
                      work={work}
                      onUpdate={onUpdateWork}
                      onEdit={onEditWork}
                      onDelete={onDeleteWork}
                      onPhotoUpload={onPhotoUpload}
                      onPhotoRemove={onPhotoRemove}
                    />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
