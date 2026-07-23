'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Upload,
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
import { formatCurrency } from '@/lib/mla-office-utils';
import type {
  AdmFundRecordWithDetails,
  AdmFundAllocationWithProject,
  AdmDocument,
} from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AdmCroreAmountInput } from './adm-crore-amount-input';
import { ProjectHierarchyGeoPickers } from '@/components/projects/project-hierarchy-geo-pickers';
import { formatProjectHierarchyLocation } from '@/lib/projects/hierarchy-geo';
import { AdmProjectGroundPhotos } from './adm-project-ground-photos';

export interface AdmProjectOption {
  id: string;
  name: string;
}

function locationLabel(allocation: AdmFundAllocationWithProject): string {
  return formatProjectHierarchyLocation({
    wardGeoName: allocation.projectWardGeoName,
    ward: allocation.projectWard,
    boothNo: allocation.projectBoothNo,
  });
}

function physicalStatusKey(
  status: AdmFundAllocationWithProject['projectPhysicalStatus'],
): string {
  if (status === 'WC') return 'adm.physicalStatusWc';
  if (status === 'WIP') return 'adm.physicalStatusWip';
  return 'adm.physicalStatusWns';
}

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

export function AdmFundRecordCard({
  fund,
  projects,
  onUpdateFund,
  onDeleteFund,
  onAddAllocation,
  onCreateProject,
  onUpdateAllocation,
  onDeleteAllocation,
  onUploadDocument,
  onDeleteDocument,
}: AdmFundRecordCardProps) {
  const { t } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [financialYear, setFinancialYear] = useState(fund.financialYear);
  const [budget, setBudget] = useState(fund.budget);
  const [saving, setSaving] = useState(false);

  const [projectId, setProjectId] = useState('');
  const [allocatedBudget, setAllocatedBudget] = useState(0);
  const [addingAllocation, setAddingAllocation] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDepartment, setNewProjectDepartment] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState(0);
  const [newProjectWard, setNewProjectWard] = useState('');
  const [newProjectWardGeoId, setNewProjectWardGeoId] = useState<string | null>(
    null,
  );
  const [newProjectBoothNo, setNewProjectBoothNo] = useState<string | null>(
    null,
  );
  const [creatingProject, setCreatingProject] = useState(false);

  const isOverallocated = fund.allocatedBudget > fund.budget;
  const allocatedProjectIds = new Set(fund.allocations.map((a) => a.projectId));
  const availableProjects = projects.filter((p) => !allocatedProjectIds.has(p.id));
  const fyOptions = financialYearOptions(financialYear);
  const sourceDocuments = fund.documents.filter((d) => d.kind === 'source_details');

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

  const handleAddAllocation = async () => {
    if (!projectId) return;
    setAddingAllocation(true);
    try {
      await onAddAllocation(fund.id, projectId, allocatedBudget);
      setProjectId('');
      setAllocatedBudget(0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setAddingAllocation(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      await onCreateProject(fund.id, {
        name: newProjectName.trim(),
        department: newProjectDepartment.trim() || undefined,
        allocatedBudget: newProjectBudget,
        ward: newProjectWard || undefined,
        wardGeoId: newProjectWardGeoId,
        boothNo: newProjectBoothNo,
      });
      setCreateProjectOpen(false);
      setNewProjectName('');
      setNewProjectDepartment('');
      setNewProjectBudget(0);
      setNewProjectWard('');
      setNewProjectWardGeoId(null);
      setNewProjectBoothNo(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setCreatingProject(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await onUploadDocument(fund.id, file, 'general');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBudgetBlur = async (
    allocation: AdmFundAllocationWithProject,
    rawValue: string,
  ) => {
    const next = Number.parseInt(rawValue, 10) || 0;
    if (next !== allocation.allocatedBudget) {
      await onUpdateAllocation(allocation.id, next);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
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
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
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
                inputClassName="min-h-11"
                className="space-y-1"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
              <span>
                {t('adm.financialYear')}:{' '}
                <span className="font-semibold">{fund.financialYear}</span>
              </span>
              {fund.batchLabel ? (
                <span>
                  {t('adm.batchLabel')}:{' '}
                  <span className="font-semibold">{fund.batchLabel}</span>
                </span>
              ) : null}
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
              {isOverallocated && (
                <Badge
                  variant="outline"
                  className="w-fit border-destructive/40 bg-destructive/10 text-destructive"
                >
                  {t('adm.budgetOverallocated')}
                </Badge>
              )}
            </div>
          )}
          {sourceDocuments.length > 0 ? (
            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              {sourceDocuments.map((doc) => {
                const href = doc.attachmentFileUrl || doc.fileUrl;
                if (!href) return null;
                return (
                  <a
                    key={doc.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-primary hover:bg-muted/40 sm:w-auto sm:min-h-9 sm:border-0 sm:px-0 sm:py-0 sm:hover:bg-transparent sm:hover:underline"
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
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          {editing ? (
            <>
              <Button
                type="button"
                size="sm"
                className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
                disabled={saving}
                onClick={handleSaveFund}
              >
                {t('adm.save')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
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
                className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 h-3.5 w-3.5" />
                {t('adm.edit')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11 flex-1 text-destructive hover:text-destructive sm:min-h-9 sm:flex-none"
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('adm.admDocuments')}
          </p>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 w-full sm:min-h-9 sm:w-auto"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              {uploading ? t('adm.uploading') : t('adm.uploadDocument')}
            </Button>
          </div>
        </div>
        {fund.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('adm.noDocuments')}</p>
        ) : (
          <ul className="space-y-2">
            {fund.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-2 sm:items-center">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground sm:mt-0" />
                  <div className="min-w-0 flex-1">
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words text-primary hover:underline"
                      >
                        {doc.label || doc.fileName}
                      </a>
                    ) : (
                      <span className="break-words">
                        {doc.label || doc.fileName}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">{doc.kind}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-11 w-full sm:min-h-9 sm:w-auto"
                  onClick={() => onDeleteDocument(fund.id, doc)}
                >
                  <X className="mr-1 h-3.5 w-3.5 sm:mr-0" />
                  <span className="sm:hidden">{t('adm.delete')}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('adm.associatedProjects')}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 w-full sm:min-h-9 sm:w-auto"
            onClick={() => setCreateProjectOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t('adm.createProject')}
          </Button>
        </div>
        {fund.allocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('adm.noAllocations')}</p>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {fund.allocations.map((allocation) => (
                <div
                  key={allocation.id}
                  className="space-y-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-mono text-xs text-muted-foreground">
                        {allocation.workCode || '—'}
                      </p>
                      <Link
                        href={`/modules/projects/${allocation.projectId}`}
                        className="inline-flex items-start gap-1 font-medium text-primary hover:underline"
                      >
                        <span className="break-words">
                          {allocation.projectName}
                        </span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {locationLabel(allocation)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 whitespace-nowrap">
                      {t(physicalStatusKey(allocation.projectPhysicalStatus))}
                    </Badge>
                  </div>

                  <dl className="grid grid-cols-1 gap-y-2 text-sm">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">
                        {t('adm.recommendation')}
                      </dt>
                      <dd className="break-words">
                        {allocation.mlaRecommendationRef || '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label htmlFor={`alloc-budget-${allocation.id}`}>
                        {t('adm.allocatedBudget')}
                      </Label>
                      <Input
                        id={`alloc-budget-${allocation.id}`}
                        key={`${allocation.id}-${allocation.allocatedBudget}`}
                        type="number"
                        min={0}
                        className="min-h-11 w-full"
                        defaultValue={allocation.allocatedBudget}
                        onBlur={(e) =>
                          void handleBudgetBlur(allocation, e.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="min-h-11 w-full text-destructive hover:text-destructive sm:w-auto"
                      onClick={() => onDeleteAllocation(allocation)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      {t('adm.delete')}
                    </Button>
                  </div>

                  <AdmProjectGroundPhotos
                    beforePhotos={allocation.projectBeforePhotos}
                    afterPhotos={allocation.projectAfterPhotos}
                  />
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">
                      {t('adm.workCode')}
                    </TableHead>
                    <TableHead>{t('adm.projectName')}</TableHead>
                    <TableHead className="whitespace-nowrap">
                      {t('adm.location')}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {t('adm.physicalStatus')}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {t('adm.recommendation')}
                    </TableHead>
                    <TableHead className="whitespace-nowrap">
                      {t('adm.allocatedBudget')}
                    </TableHead>
                    <TableHead className="min-w-[18rem]">
                      {t('projects.groundMedia')}
                    </TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fund.allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        {allocation.workCode || '—'}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/modules/projects/${allocation.projectId}`}
                          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                        >
                          <span className="max-w-[18rem] truncate">
                            {allocation.projectName}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {locationLabel(allocation)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {t(
                            physicalStatusKey(allocation.projectPhysicalStatus),
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate text-xs text-muted-foreground">
                        {allocation.mlaRecommendationRef || '—'}
                      </TableCell>
                      <TableCell>
                        <Input
                          key={`${allocation.id}-${allocation.allocatedBudget}`}
                          type="number"
                          min={0}
                          className="min-h-9 w-32"
                          defaultValue={allocation.allocatedBudget}
                          onBlur={(e) =>
                            void handleBudgetBlur(allocation, e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <AdmProjectGroundPhotos
                          beforePhotos={allocation.projectBeforePhotos}
                          afterPhotos={allocation.projectAfterPhotos}
                          className="min-w-[16rem]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onDeleteAllocation(allocation)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <Label>{t('adm.linkProject')}</Label>
            <select
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
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
          <div className="space-y-1 sm:w-40">
            <Label>{t('adm.allocatedBudget')}</Label>
            <Input
              type="number"
              min={0}
              value={allocatedBudget || ''}
              onChange={(e) =>
                setAllocatedBudget(Number.parseInt(e.target.value, 10) || 0)
              }
              className="min-h-11"
            />
          </div>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            disabled={!projectId || addingAllocation}
            onClick={handleAddAllocation}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('adm.addAllocation')}
          </Button>
        </div>
      </div>

      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('adm.createProject')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('adm.createProjectHint', {
                fundType: fund.categoryName,
              })}
            </p>
            <div className="space-y-2">
              <Label>{t('adm.projectName')}</Label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('adm.department')}</Label>
              <Input
                value={newProjectDepartment}
                onChange={(e) => setNewProjectDepartment(e.target.value)}
                className="min-h-11"
              />
            </div>
            <ProjectHierarchyGeoPickers
              wardGeoId={newProjectWardGeoId}
              boothNo={newProjectBoothNo}
              onChange={(geo) => {
                setNewProjectWardGeoId(geo.wardGeoId);
                setNewProjectBoothNo(geo.boothNo);
                setNewProjectWard(geo.ward);
              }}
            />
            <div className="space-y-2">
              <Label>{t('adm.allocatedBudget')}</Label>
              <Input
                type="number"
                min={0}
                value={newProjectBudget || ''}
                onChange={(e) =>
                  setNewProjectBudget(Number.parseInt(e.target.value, 10) || 0)
                }
                className="min-h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateProjectOpen(false)}
            >
              {t('adm.cancel')}
            </Button>
            <Button
              type="button"
              disabled={creatingProject || !newProjectName.trim()}
              onClick={handleCreateProject}
            >
              {t('adm.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
