'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from '@/hooks/use-translations';
import type {
  AdmFundingCategory,
  AdmFundRecordWithDetails,
  AdmFundAllocationWithProject,
  AdmDocument,
} from '@/lib/db/schema';
import {
  financialYearOptions,
  getCurrentFinancialYear,
} from '@/lib/adm/financial-year';
import { AdmCroreAmountInput } from './adm-crore-amount-input';
import { AdmFundDetail, type AdmProjectOption } from './adm-fund-detail';
import { AdmFundSummaryRow } from './adm-fund-summary-row';

interface AdmFundsListProps {
  categories: AdmFundingCategory[];
  funds: AdmFundRecordWithDetails[];
  searchTerm: string;
  selectedFundId: string;
  projects: AdmProjectOption[];
  onSelectFund: (fundId: string) => void;
  onBackToList: () => void;
  onCreateFund: (values: {
    categoryId?: string;
    categoryName?: string;
    financialYear: string;
    budget: number;
  }) => Promise<void>;
  onUpdateFund: (
    fundId: string,
    values: { financialYear: string; budget: number },
  ) => Promise<void>;
  onDeleteFund: (fundId: string) => void;
  onAddAllocation: (
    fundRecordId: string,
    projectId: string,
    allocatedBudget: number,
  ) => Promise<void>;
  onCreateProject: (
    fundRecordId: string,
    values: {
      name: string;
      department?: string;
      allocatedBudget: number;
      ward?: string;
      wardGeoId?: string | null;
      boothNo?: string | null;
    },
  ) => Promise<void>;
  onUpdateAllocation: (id: string, allocatedBudget: number) => Promise<void>;
  onDeleteAllocation: (allocation: AdmFundAllocationWithProject) => void;
  onUploadDocument: (
    fundRecordId: string,
    file: File,
    kind: string,
  ) => Promise<void>;
  onDeleteDocument: (fundRecordId: string, document: AdmDocument) => void;
}

function filterFunds(
  funds: AdmFundRecordWithDetails[],
  searchTerm: string,
): AdmFundRecordWithDetails[] {
  if (!searchTerm.trim()) return funds;
  const q = searchTerm.toLowerCase();
  return funds.filter(
    (f) =>
      f.categoryName.toLowerCase().includes(q) ||
      f.categoryCode.toLowerCase().includes(q) ||
      f.financialYear.toLowerCase().includes(q) ||
      f.batchLabel.toLowerCase().includes(q) ||
      f.allocations.some(
        (a) =>
          a.projectName.toLowerCase().includes(q) ||
          (a.workCode?.toLowerCase().includes(q) ?? false) ||
          (a.projectWard?.toLowerCase().includes(q) ?? false) ||
          (a.projectWardGeoName?.toLowerCase().includes(q) ?? false) ||
          (a.projectBoothNo?.toLowerCase().includes(q) ?? false) ||
          (a.projectDepartment?.toLowerCase().includes(q) ?? false),
      ),
  );
}

export function AdmFundsList({
  categories,
  funds,
  searchTerm,
  selectedFundId,
  projects,
  onSelectFund,
  onBackToList,
  onCreateFund,
  onUpdateFund,
  onDeleteFund,
  onAddAllocation,
  onCreateProject,
  onUpdateAllocation,
  onDeleteAllocation,
  onUploadDocument,
  onDeleteDocument,
}: AdmFundsListProps) {
  const { t } = useTranslations();
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [fundTypeValue, setFundTypeValue] = useState(categories[0]?.id ?? '');
  const [financialYear, setFinancialYear] = useState(() =>
    getCurrentFinancialYear(),
  );
  const [budget, setBudget] = useState(0);
  const [saving, setSaving] = useState(false);

  const filteredFunds = filterFunds(funds, searchTerm);
  const selectedFund = funds.find((fund) => fund.id === selectedFundId);
  const hasSearch = searchTerm.trim().length > 0;
  const fyOptions = financialYearOptions(financialYear);
  const fundTypeOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  useEffect(() => {
    if (selectedFundId && !selectedFund) {
      onBackToList();
    }
  }, [selectedFundId, selectedFund, onBackToList]);

  const openCreateFund = () => {
    setFundTypeValue(categories[0]?.id ?? '');
    setFinancialYear(getCurrentFinancialYear());
    setBudget(0);
    setFundDialogOpen(true);
  };

  const resolveFundType = ():
    | { categoryId: string }
    | { categoryName: string }
    | null => {
    const trimmed = fundTypeValue.trim();
    if (!trimmed) return null;

    const byId = categories.find((c) => c.id === trimmed);
    if (byId) return { categoryId: byId.id };

    const byName = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (byName) return { categoryId: byName.id };

    return { categoryName: trimmed };
  };

  const handleCreateFund = async () => {
    const resolved = resolveFundType();
    if (!resolved) return;
    setSaving(true);
    try {
      await onCreateFund({
        ...resolved,
        financialYear,
        budget,
      });
      setFundDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {selectedFundId && selectedFund ? (
        <AdmFundDetail
          fund={selectedFund}
          projects={projects}
          onBack={onBackToList}
          onUpdateFund={onUpdateFund}
          onDeleteFund={onDeleteFund}
          onAddAllocation={onAddAllocation}
          onCreateProject={onCreateProject}
          onUpdateAllocation={onUpdateAllocation}
          onDeleteAllocation={onDeleteAllocation}
          onUploadDocument={onUploadDocument}
          onDeleteDocument={onDeleteDocument}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {funds.length === 0
                ? t('adm.noFundsHint')
                : t('adm.fundsCount', { count: String(funds.length) })}
            </p>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              onClick={openCreateFund}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('adm.newFund')}
            </Button>
          </div>

          {filteredFunds.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {hasSearch ? t('adm.noFundsMatch') : t('adm.noFunds')}
              </p>
              {!hasSearch && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  onClick={openCreateFund}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {t('adm.newFund')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredFunds.map((fund) => (
                <AdmFundSummaryRow
                  key={fund.id}
                  fund={fund}
                  onSelect={onSelectFund}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={fundDialogOpen} onOpenChange={setFundDialogOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-visible">
          <DialogHeader>
            <DialogTitle>{t('adm.newFund')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('adm.fundType')}</Label>
              <Combobox
                options={fundTypeOptions}
                value={fundTypeValue}
                onValueChange={setFundTypeValue}
                placeholder={t('adm.fundTypePlaceholder')}
                emptyMessage={t('adm.fundTypeEmpty')}
                allowCustom
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                {t('adm.fundTypeHint')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('adm.financialYear')}</Label>
              <Select value={financialYear} onValueChange={setFinancialYear}>
                <SelectTrigger className="min-h-11 w-full">
                  <SelectValue placeholder={t('adm.financialYear')} />
                </SelectTrigger>
                <SelectContent>
                  {fyOptions.map((fy) => (
                    <SelectItem key={fy} value={fy}>
                      {fy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AdmCroreAmountInput
              label={t('adm.fundBudgetCrore')}
              valueRupees={budget}
              onChangeRupees={setBudget}
              hint={
                budget > 0
                  ? undefined
                  : t('adm.fundBudgetCroreHint')
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFundDialogOpen(false)}
            >
              {t('adm.cancel')}
            </Button>
            <Button
              type="button"
              disabled={saving || !fundTypeValue.trim() || !financialYear}
              onClick={handleCreateFund}
            >
              {t('adm.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
