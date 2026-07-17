'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  FileText,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from '@/hooks/use-translations';
import { financialYearOptions } from '@/lib/adm/financial-year';
import {
  type AdmAmountUnit,
  formatAdmAmount,
} from '@/lib/adm/amount-unit';
import { formatCurrency } from '@/lib/mla-office-utils';
import type {
  AdmFundRecordWithDetails,
  AdmFundAllocationWithProject,
  AdmDocument,
} from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AdmCroreAmountInput } from './adm-crore-amount-input';
import { AdmUnitAmountInput } from './adm-unit-amount-input';
import { AdmInwardLinkDialog } from './adm-inward-link-dialog';

export interface AdmProjectOption {
  id: string;
  name: string;
}

export type AdmWorkFormValues = {
  name: string;
  department?: string;
  taluka?: string;
  village?: string;
  workCode?: string;
  mlaRecommendationRef?: string;
  technicalSanctionRef?: string;
  technicalSanctionDate?: string | null;
  technicalSanctionAmount: number;
  governmentFixedAmount: number;
  allocatedBudget: number;
};

export type AdmAllocationUpdateValues = {
  allocatedBudget: number;
  workCode?: string | null;
  mlaRecommendationRef?: string | null;
  technicalSanctionRef?: string | null;
  technicalSanctionDate?: string | null;
  technicalSanctionAmount?: number;
  governmentFixedAmount?: number;
  taluka?: string | null;
  village?: string | null;
};

interface AdmFundRecordCardProps {
  fund: AdmFundRecordWithDetails;
  projects: AdmProjectOption[];
  onUpdateFund: (
    fundId: string,
    values: { financialYear: string; budget: number },
  ) => Promise<void>;
  onDeleteFund: (fundId: string) => void;
  onAddAllocation: (
    fundRecordId: string,
    projectId: string,
    values: AdmAllocationUpdateValues,
  ) => Promise<void>;
  onCreateProject: (
    fundRecordId: string,
    values: AdmWorkFormValues,
  ) => Promise<void>;
  onUpdateAllocation: (
    id: string,
    values: AdmAllocationUpdateValues,
  ) => Promise<void>;
  onDeleteAllocation: (allocation: AdmFundAllocationWithProject) => void;
  onLinkDocument: (
    fundRecordId: string,
    values: { registerEntryId: string; amountUnit: AdmAmountUnit },
  ) => Promise<void>;
  onUpdateDocument: (
    fundRecordId: string,
    documentId: string,
    values: { amountUnit: AdmAmountUnit },
  ) => Promise<void>;
  onDeleteDocument: (fundRecordId: string, document: AdmDocument) => void;
}

function emptyWorkForm(): AdmWorkFormValues {
  return {
    name: '',
    department: '',
    taluka: '',
    village: '',
    workCode: '',
    mlaRecommendationRef: '',
    technicalSanctionRef: '',
    technicalSanctionDate: '',
    technicalSanctionAmount: 0,
    governmentFixedAmount: 0,
    allocatedBudget: 0,
  };
}

export function AdmFundRecordCard({
  fund,
  projects,
  onUpdateFund,
  onDeleteFund,
  onAddAllocation,
  onCreateProject,
  onUpdateAllocation,
  onDeleteAllocation,
  onLinkDocument,
  onUpdateDocument,
  onDeleteDocument,
}: AdmFundRecordCardProps) {
  const { t } = useTranslations();
  const [editing, setEditing] = useState(false);
  const [financialYear, setFinancialYear] = useState(fund.financialYear);
  const [budget, setBudget] = useState(fund.budget);
  const [saving, setSaving] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [linkForm, setLinkForm] = useState(emptyWorkForm());
  const [addingAllocation, setAddingAllocation] = useState(false);

  const [workDialogOpen, setWorkDialogOpen] = useState(false);
  const [workForm, setWorkForm] = useState(emptyWorkForm());
  const [editingAllocation, setEditingAllocation] =
    useState<AdmFundAllocationWithProject | null>(null);
  const [savingWork, setSavingWork] = useState(false);

  const [inwardMode, setInwardMode] = useState<'link' | 'register' | null>(
    null,
  );

  const amountUnit: AdmAmountUnit = useMemo(() => {
    const sanction = fund.documents.find(
      (d) => d.kind === 'sanction_order' || d.registerEntryId,
    );
    return sanction?.amountUnit ?? 'rupees';
  }, [fund.documents]);

  const isOverallocated = fund.allocatedBudget > fund.budget;
  const allocatedProjectIds = new Set(fund.allocations.map((a) => a.projectId));
  const availableProjects = projects.filter((p) => !allocatedProjectIds.has(p.id));
  const fyOptions = financialYearOptions(financialYear);

  const totals = useMemo(() => {
    return fund.allocations.reduce(
      (acc, a) => ({
        tech: acc.tech + (a.technicalSanctionAmount || 0),
        govt: acc.govt + (a.governmentFixedAmount || 0),
        admin: acc.admin + (a.allocatedBudget || 0),
      }),
      { tech: 0, govt: 0, admin: 0 },
    );
  }, [fund.allocations]);

  const handleSaveFund = async () => {
    setSaving(true);
    try {
      await onUpdateFund(fund.id, { financialYear, budget });
      setEditing(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setSaving(false);
    }
  };

  const openCreateWork = () => {
    setEditingAllocation(null);
    setWorkForm(emptyWorkForm());
    setWorkDialogOpen(true);
  };

  const openEditWork = (allocation: AdmFundAllocationWithProject) => {
    setEditingAllocation(allocation);
    setWorkForm({
      name: allocation.projectName,
      department: allocation.projectDepartment ?? '',
      taluka: allocation.projectTaluka ?? '',
      village: allocation.projectVillage ?? '',
      workCode: allocation.workCode ?? '',
      mlaRecommendationRef: allocation.mlaRecommendationRef ?? '',
      technicalSanctionRef: allocation.technicalSanctionRef ?? '',
      technicalSanctionDate: allocation.technicalSanctionDate ?? '',
      technicalSanctionAmount: allocation.technicalSanctionAmount,
      governmentFixedAmount: allocation.governmentFixedAmount,
      allocatedBudget: allocation.allocatedBudget,
    });
    setWorkDialogOpen(true);
  };

  const handleSaveWork = async () => {
    setSavingWork(true);
    try {
      if (editingAllocation) {
        await onUpdateAllocation(editingAllocation.id, {
          allocatedBudget: workForm.allocatedBudget,
          workCode: workForm.workCode || null,
          mlaRecommendationRef: workForm.mlaRecommendationRef || null,
          technicalSanctionRef: workForm.technicalSanctionRef || null,
          technicalSanctionDate: workForm.technicalSanctionDate || null,
          technicalSanctionAmount: workForm.technicalSanctionAmount,
          governmentFixedAmount: workForm.governmentFixedAmount,
          taluka: workForm.taluka || null,
          village: workForm.village || null,
        });
      } else {
        if (!workForm.name.trim()) return;
        await onCreateProject(fund.id, workForm);
      }
      setWorkDialogOpen(false);
      setEditingAllocation(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setSavingWork(false);
    }
  };

  const handleAddAllocation = async () => {
    if (!projectId) return;
    setAddingAllocation(true);
    try {
      await onAddAllocation(fund.id, projectId, {
        allocatedBudget: linkForm.allocatedBudget,
        workCode: linkForm.workCode || null,
        mlaRecommendationRef: linkForm.mlaRecommendationRef || null,
        technicalSanctionRef: linkForm.technicalSanctionRef || null,
        technicalSanctionDate: linkForm.technicalSanctionDate || null,
        technicalSanctionAmount: linkForm.technicalSanctionAmount,
        governmentFixedAmount: linkForm.governmentFixedAmount,
        taluka: linkForm.taluka || null,
        village: linkForm.village || null,
      });
      setProjectId('');
      setLinkForm(emptyWorkForm());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setAddingAllocation(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{fund.categoryName}</h3>
            <Badge variant="secondary">{fund.financialYear}</Badge>
          </div>
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t('adm.financialYear')}</Label>
                <Select value={financialYear} onValueChange={setFinancialYear}>
                  <SelectTrigger className="min-h-10 w-full">
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
                inputClassName="min-h-10"
                className="space-y-1"
              />
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                {t('adm.financialYear')}:{' '}
                <span className="font-semibold">{fund.financialYear}</span>
              </span>
              <span>
                {t('adm.fundBudget')}:{' '}
                <span className="font-semibold">
                  {formatCurrency(fund.budget)}
                </span>
              </span>
              <span className={cn(isOverallocated && 'text-destructive')}>
                {t('adm.budgetUsed')}:{' '}
                <span className="font-semibold">
                  {formatCurrency(fund.allocatedBudget)}
                </span>
              </span>
              <span className="text-muted-foreground">
                {t('adm.amountUnit')}: {t(`adm.amountUnit_${amountUnit}`)}
              </span>
              {isOverallocated && (
                <Badge
                  variant="outline"
                  className="border-destructive/40 bg-destructive/10 text-destructive"
                >
                  {t('adm.budgetOverallocated')}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                type="button"
                size="sm"
                className="min-h-9"
                disabled={saving}
                onClick={handleSaveFund}
              >
                {t('adm.save')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-9"
                onClick={() => {
                  setFinancialYear(fund.financialYear);
                  setBudget(fund.budget);
                  setEditing(false);
                }}
              >
                {t('adm.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-9"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                {t('adm.edit')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-9 text-destructive hover:text-destructive"
                onClick={() => onDeleteFund(fund.id)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {t('adm.delete')}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('adm.worksTable')}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-9"
            onClick={openCreateWork}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t('adm.createWork')}
          </Button>
        </div>
        {fund.allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('adm.noAllocations')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">{t('adm.srNo')}</TableHead>
                  <TableHead>{t('adm.workCode')}</TableHead>
                  <TableHead>{t('adm.taluka')}</TableHead>
                  <TableHead>{t('adm.village')}</TableHead>
                  <TableHead className="min-w-[180px]">
                    {t('adm.workName')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('adm.techAmount')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('adm.govtFixedAmount')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('adm.adminAmount')}
                  </TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fund.allocations.map((allocation, index) => (
                  <TableRow key={allocation.id}>
                    <TableCell>{allocation.sortOrder || index + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {allocation.workCode || '—'}
                    </TableCell>
                    <TableCell>{allocation.projectTaluka || '—'}</TableCell>
                    <TableCell>{allocation.projectVillage || '—'}</TableCell>
                    <TableCell>
                      <Link
                        href={`/modules/projects/${allocation.projectId}`}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {allocation.projectName}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatAdmAmount(
                        allocation.technicalSanctionAmount,
                        amountUnit,
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatAdmAmount(
                        allocation.governmentFixedAmount,
                        amountUnit,
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {formatAdmAmount(allocation.allocatedBudget, amountUnit)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditWork(allocation)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDeleteAllocation(allocation)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} className="font-semibold">
                    {t('adm.totals')}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    {formatAdmAmount(totals.tech, amountUnit)}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    {formatAdmAmount(totals.govt, amountUnit)}
                  </TableCell>
                  <TableCell className="text-right font-semibold whitespace-nowrap">
                    {formatAdmAmount(totals.admin, amountUnit)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label>{t('adm.linkProject')}</Label>
            <select
              className="flex min-h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">{t('adm.selectProject')}</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <AdmUnitAmountInput
            label={t('adm.adminAmount')}
            valueRupees={linkForm.allocatedBudget}
            onChangeRupees={(v) =>
              setLinkForm((prev) => ({ ...prev, allocatedBudget: v }))
            }
            unit={amountUnit}
            className="sm:w-40"
          />
          <Button
            type="button"
            className="min-h-10"
            disabled={!projectId || addingAllocation}
            onClick={handleAddAllocation}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('adm.addAllocation')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('adm.admDocuments')}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-9"
              onClick={() => setInwardMode('link')}
            >
              <Link2 className="mr-1 h-3.5 w-3.5" />
              {t('adm.linkInward')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-9"
              onClick={() => setInwardMode('register')}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t('adm.registerAndLink')}
            </Button>
          </div>
        </div>
        {fund.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('adm.noDocuments')}</p>
        ) : (
          <ul className="space-y-2">
            {fund.documents.map((doc) => {
              const fileUrl = doc.attachmentFileUrl || doc.fileUrl;
              const title =
                doc.registerSubject ||
                doc.label ||
                doc.attachmentFileName ||
                doc.fileName ||
                t('adm.sanctionOrder');
              return (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          {title}
                        </a>
                      ) : (
                        <span className="font-medium">{title}</span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {[
                          doc.registerRefNo,
                          doc.registerDate,
                          doc.registerFromTo,
                          t(`adm.amountUnit_${doc.amountUnit}`),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={doc.amountUnit}
                      onValueChange={(v) =>
                        void onUpdateDocument(fund.id, doc.id, {
                          amountUnit: v as AdmAmountUnit,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rupees">
                          {t('adm.amountUnit_rupees')}
                        </SelectItem>
                        <SelectItem value="thousands">
                          {t('adm.amountUnit_thousands')}
                        </SelectItem>
                        <SelectItem value="lakhs">
                          {t('adm.amountUnit_lakhs')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteDocument(fund.id, doc)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={workDialogOpen} onOpenChange={setWorkDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAllocation ? t('adm.editWork') : t('adm.createWork')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {!editingAllocation && (
              <div className="space-y-1 sm:col-span-2">
                <Label>{t('adm.workName')}</Label>
                <Input
                  value={workForm.name}
                  onChange={(e) =>
                    setWorkForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="min-h-10"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>{t('adm.workCode')}</Label>
              <Input
                value={workForm.workCode}
                onChange={(e) =>
                  setWorkForm((prev) => ({ ...prev, workCode: e.target.value }))
                }
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.department')}</Label>
              <Input
                value={workForm.department}
                onChange={(e) =>
                  setWorkForm((prev) => ({
                    ...prev,
                    department: e.target.value,
                  }))
                }
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.taluka')}</Label>
              <Input
                value={workForm.taluka}
                onChange={(e) =>
                  setWorkForm((prev) => ({ ...prev, taluka: e.target.value }))
                }
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.village')}</Label>
              <Input
                value={workForm.village}
                onChange={(e) =>
                  setWorkForm((prev) => ({ ...prev, village: e.target.value }))
                }
                className="min-h-10"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>{t('adm.mlaRecommendationRef')}</Label>
              <Input
                value={workForm.mlaRecommendationRef}
                onChange={(e) =>
                  setWorkForm((prev) => ({
                    ...prev,
                    mlaRecommendationRef: e.target.value,
                  }))
                }
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.technicalSanctionRef')}</Label>
              <Input
                value={workForm.technicalSanctionRef}
                onChange={(e) =>
                  setWorkForm((prev) => ({
                    ...prev,
                    technicalSanctionRef: e.target.value,
                  }))
                }
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.technicalSanctionDate')}</Label>
              <Input
                type="date"
                value={workForm.technicalSanctionDate || ''}
                onChange={(e) =>
                  setWorkForm((prev) => ({
                    ...prev,
                    technicalSanctionDate: e.target.value,
                  }))
                }
                className="min-h-10"
              />
            </div>
            <AdmUnitAmountInput
              label={t('adm.techAmount')}
              valueRupees={workForm.technicalSanctionAmount}
              onChangeRupees={(v) =>
                setWorkForm((prev) => ({
                  ...prev,
                  technicalSanctionAmount: v,
                }))
              }
              unit={amountUnit}
            />
            <AdmUnitAmountInput
              label={t('adm.govtFixedAmount')}
              valueRupees={workForm.governmentFixedAmount}
              onChangeRupees={(v) =>
                setWorkForm((prev) => ({
                  ...prev,
                  governmentFixedAmount: v,
                }))
              }
              unit={amountUnit}
            />
            <AdmUnitAmountInput
              label={t('adm.adminAmount')}
              valueRupees={workForm.allocatedBudget}
              onChangeRupees={(v) =>
                setWorkForm((prev) => ({ ...prev, allocatedBudget: v }))
              }
              unit={amountUnit}
              className="sm:col-span-2"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWorkDialogOpen(false)}
            >
              {t('adm.cancel')}
            </Button>
            <Button
              type="button"
              disabled={
                savingWork ||
                (!editingAllocation && !workForm.name.trim())
              }
              onClick={() => void handleSaveWork()}
            >
              {t('adm.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdmInwardLinkDialog
        open={inwardMode !== null}
        onOpenChange={(open) => {
          if (!open) setInwardMode(null);
        }}
        mode={inwardMode ?? 'link'}
        defaultAmountUnit={amountUnit}
        onLinked={async ({ registerEntryId, amountUnit: unit }) => {
          await onLinkDocument(fund.id, {
            registerEntryId,
            amountUnit: unit,
          });
        }}
      />
    </div>
  );
}
