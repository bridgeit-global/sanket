'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Link2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/components/toast';
import { FilePreviewButton } from '@/components/file-preview-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
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
import { ConfirmDialog } from '@/components/confirm-dialog';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { useTranslations } from '@/hooks/use-translations';
import {
  ADM_FUND_REQUEST_LETTER_STATUSES,
  fundRequestLetterStatusRequiresFund,
  isAdmFundRequestLetterStatus,
  type AdmFundRequestLetterStatus,
} from '@/lib/adm/fund-request-letter';
import { formatDisplayDateIST, getTodayDateStringIST } from '@/lib/ist-date';
import type { AdmFundRequestLetter } from '@/lib/db/schema';

const NO_FUND = '__none__';

export type AdmFundLinkOption = {
  id: string;
  label: string;
};

interface AdmFundRequestLettersProps {
  funds: AdmFundLinkOption[];
  titleFilter: string;
  statusFilter: string;
  fromDate: string;
  toDate: string;
  onFiltersChange: (updates: {
    title?: string;
    status?: string;
    from?: string;
    to?: string;
  }) => void;
  onOpenFund: (fundId: string) => void;
}

function statusBadgeVariant(
  status: AdmFundRequestLetterStatus,
): 'outline' | 'secondary' | 'default' | 'destructive' {
  if (status === 'sanctioned') return 'default';
  if (status === 'linked') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'outline';
}

export function AdmFundRequestLetters({
  funds,
  titleFilter,
  statusFilter,
  fromDate,
  toDate,
  onFiltersChange,
  onOpenFund,
}: AdmFundRequestLettersProps) {
  const { t } = useTranslations();
  const [letters, setLetters] = useState<AdmFundRequestLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdmFundRequestLetter | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(getTodayDateStringIST());
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formStatus, setFormStatus] =
    useState<AdmFundRequestLetterStatus>('pending');
  const [formFundId, setFormFundId] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const activeStatusFilter = isAdmFundRequestLetterStatus(statusFilter)
    ? statusFilter
    : '';

  const fundLabelById = useMemo(() => {
    return new Map(funds.map((fund) => [fund.id, fund.label]));
  }, [funds]);

  const loadLetters = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (titleFilter.trim()) params.set('title', titleFilter.trim());
      if (isAdmFundRequestLetterStatus(statusFilter)) {
        params.set('status', statusFilter);
      }
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const qs = params.toString();
      const response = await fetch(
        qs
          ? `/api/adm/fund-request-letters?${qs}`
          : '/api/adm/fund-request-letters',
        { signal },
      );
      if (!response.ok) {
        throw new Error('Failed to load request letters');
      }
      const data = (await response.json()) as AdmFundRequestLetter[];
      setLetters(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error loading fund request letters:', error);
      toast.error(t('adm.fundRequestLetters.failedToLoad'));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
    // `t` is recreated every render by useTranslations — do not list it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleFilter, statusFilter, fromDate, toDate]);

  useEffect(() => {
    const controller = new AbortController();
    loadLetters(controller.signal);
    return () => controller.abort();
  }, [loadLetters]);

  useEffect(() => {
    setPage(1);
  }, [titleFilter, statusFilter, fromDate, toDate]);

  const paginationOptions = useMemo(
    () => ({
      page,
      pageSize,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
    }),
    [page, pageSize],
  );

  const {
    paginatedItems,
    currentPage,
    totalPages,
    pageSize: currentPageSize,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(letters, 10, paginationOptions);

  const resetCreateForm = () => {
    setFormTitle('');
    setFormDate(getTodayDateStringIST());
    setFormFile(null);
    setFormStatus('pending');
    setFormFundId('');
  };

  const applyFundChange = (value: string) => {
    const fundId = value === NO_FUND ? '' : value;
    setFormFundId(fundId);
    if (fundId && formStatus === 'pending') {
      setFormStatus('linked');
    }
    if (!fundId && fundRequestLetterStatusRequiresFund(formStatus)) {
      setFormStatus('pending');
    }
  };

  const fundLabelFor = (letter: AdmFundRequestLetter) => {
    if (!letter.fundRecordId) return null;
    return (
      letter.fundLabel ||
      fundLabelById.get(letter.fundRecordId) ||
      t('adm.fundRequestLetters.linkedFund')
    );
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast.error(t('adm.fundRequestLetters.titleRequired'));
      return;
    }
    if (!formDate) {
      toast.error(t('adm.fundRequestLetters.dateRequired'));
      return;
    }
    if (!formFile) {
      toast.error(t('adm.fundRequestLetters.fileRequired'));
      return;
    }
    if (fundRequestLetterStatusRequiresFund(formStatus) && !formFundId) {
      toast.error(t('adm.fundRequestLetters.fundRequired'));
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('file', formFile);
      formData.append('title', formTitle.trim());
      formData.append('letterDate', formDate);
      formData.append('status', formStatus);
      if (formFundId) formData.append('fundRecordId', formFundId);

      const response = await fetch('/api/adm/fund-request-letters', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload');
      }

      toast.success(t('adm.fundRequestLetters.uploadedSuccess'));
      setCreateOpen(false);
      resetCreateForm();
      await loadLetters();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('adm.fundRequestLetters.failedToUpload'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLink = async () => {
    if (!editing) return;
    if (fundRequestLetterStatusRequiresFund(formStatus) && !formFundId) {
      toast.error(t('adm.fundRequestLetters.fundRequired'));
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/adm/fund-request-letters/${editing.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: formStatus,
            fundRecordId: formFundId || null,
          }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update');
      }
      toast.success(t('adm.fundRequestLetters.updatedSuccess'));
      setEditing(null);
      await loadLetters();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('adm.fundRequestLetters.failedToUpdate'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(
        `/api/adm/fund-request-letters/${deleteId}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success(t('adm.fundRequestLetters.deletedSuccess'));
      setDeleteId(null);
      await loadLetters();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('adm.fundRequestLetters.failedToDelete'),
      );
    }
  };

  const openEdit = (letter: AdmFundRequestLetter) => {
    setFormStatus(letter.status);
    setFormFundId(letter.fundRecordId ?? '');
    setEditing(letter);
  };

  const filtersActive = Boolean(
    titleFilter || activeStatusFilter || fromDate || toDate,
  );

  const renderStatusSelect = () => (
    <Select
      value={formStatus}
      onValueChange={(value) =>
        setFormStatus(value as AdmFundRequestLetterStatus)
      }
    >
      <SelectTrigger className="min-h-11 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ADM_FUND_REQUEST_LETTER_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {t(`adm.fundRequestLetters.status.${status}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderFundSelect = () => (
    <Select value={formFundId || NO_FUND} onValueChange={applyFundChange}>
      <SelectTrigger className="min-h-11 w-full">
        <SelectValue placeholder={t('adm.fundRequestLetters.fundPlaceholder')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_FUND}>
          {t('adm.fundRequestLetters.noFund')}
        </SelectItem>
        {funds.map((fund) => (
          <SelectItem key={fund.id} value={fund.id}>
            {fund.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderPdfLink = (letter: AdmFundRequestLetter) => {
    const fileName = letter.fileName || t('adm.fundRequestLetters.viewPdf');
    return (
      <div className="inline-flex min-h-10 max-w-full items-center gap-1.5 text-sm">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="max-w-[180px] truncate">{fileName}</span>
        <FilePreviewButton
          fileUrl={`/api/adm/fund-request-letters/${letter.id}/pdf`}
          fileName={fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`}
        />
      </div>
    );
  };

  const renderFundLink = (letter: AdmFundRequestLetter) => {
    const label = fundLabelFor(letter);
    if (!letter.fundRecordId || !label) {
      return (
        <span className="text-muted-foreground">
          {t('adm.fundRequestLetters.notLinked')}
        </span>
      );
    }
    return (
      <button
        type="button"
        className="min-h-10 max-w-[240px] truncate text-left text-sm text-blue-600 hover:underline"
        onClick={() => onOpenFund(letter.fundRecordId as string)}
      >
        {label}
      </button>
    );
  };

  const renderActions = (letter: AdmFundRequestLetter) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-10"
        onClick={() => openEdit(letter)}
        title={t('adm.fundRequestLetters.linkAction')}
      >
        <Link2 className="h-4 w-4" />
        <span className="sr-only">{t('adm.fundRequestLetters.linkAction')}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-10"
        onClick={() => setDeleteId(letter.id)}
        title={t('adm.fundRequestLetters.delete')}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">{t('adm.fundRequestLetters.delete')}</span>
      </Button>
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="rl-title-filter">
              {t('adm.fundRequestLetters.filterTitle')}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="rl-title-filter"
                value={titleFilter}
                onChange={(e) => onFiltersChange({ title: e.target.value })}
                placeholder={t('adm.fundRequestLetters.filterTitlePlaceholder')}
                className="min-h-11 w-full pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rl-status">{t('adm.fundRequestLetters.statusLabel')}</Label>
            <Select
              value={activeStatusFilter || 'all'}
              onValueChange={(value) =>
                onFiltersChange({ status: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger id="rl-status" className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('adm.fundRequestLetters.statusAll')}
                </SelectItem>
                {ADM_FUND_REQUEST_LETTER_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`adm.fundRequestLetters.status.${status}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rl-from">{t('adm.fundRequestLetters.fromDate')}</Label>
            <DmyDateInput
              id="rl-from"
              value={fromDate}
              onChange={(e) => onFiltersChange({ from: e.target.value })}
              className="min-h-11 w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rl-to">{t('adm.fundRequestLetters.toDate')}</Label>
            <DmyDateInput
              id="rl-to"
              value={toDate}
              onChange={(e) => onFiltersChange({ to: e.target.value })}
              className="min-h-11 w-full"
            />
          </div>
        </div>
        <Button
          type="button"
          className="min-h-11 w-full shrink-0 sm:w-auto"
          onClick={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('adm.fundRequestLetters.add')}
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t('adm.fundRequestLetters.loading')}
        </p>
      ) : paginatedItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {filtersActive
            ? t('adm.fundRequestLetters.noMatch')
            : t('adm.fundRequestLetters.empty')}
        </p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {paginatedItems.map((letter) => (
              <article
                key={letter.id}
                className="min-w-0 space-y-2 rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{letter.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDisplayDateIST(letter.letterDate)}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(letter.status)}>
                    {t(`adm.fundRequestLetters.status.${letter.status}`)}
                  </Badge>
                </div>
                <div className="text-sm">{renderFundLink(letter)}</div>
                <div className="flex items-center justify-between gap-2">
                  {renderPdfLink(letter)}
                  {renderActions(letter)}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden min-w-0 overflow-x-auto rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adm.fundRequestLetters.date')}</TableHead>
                  <TableHead>{t('adm.fundRequestLetters.title')}</TableHead>
                  <TableHead>{t('adm.fundRequestLetters.statusLabel')}</TableHead>
                  <TableHead>{t('adm.fundRequestLetters.fund')}</TableHead>
                  <TableHead>{t('adm.fundRequestLetters.document')}</TableHead>
                  <TableHead className="w-[100px] text-right">
                    {t('adm.fundRequestLetters.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((letter) => (
                  <TableRow key={letter.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDisplayDateIST(letter.letterDate)}
                    </TableCell>
                    <TableCell className="max-w-[240px] font-medium">
                      <span className="break-words">{letter.title}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(letter.status)}>
                        {t(`adm.fundRequestLetters.status.${letter.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderFundLink(letter)}</TableCell>
                    <TableCell>{renderPdfLink(letter)}</TableCell>
                    <TableCell className="text-right">
                      {renderActions(letter)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {letters.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={currentPageSize}
          totalItems={letters.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('adm.fundRequestLetters.add')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rl-date">{t('adm.fundRequestLetters.date')}</Label>
              <DmyDateInput
                id="rl-date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="min-h-11 w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rl-title">{t('adm.fundRequestLetters.title')}</Label>
              <Input
                id="rl-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t('adm.fundRequestLetters.titlePlaceholder')}
                className="min-h-11 w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rl-file">{t('adm.fundRequestLetters.document')}</Label>
              <FileUploadZone
                multiple={false}
                value={formFile ? [formFile] : []}
                onFilesSelected={(files) => setFormFile(files[0] ?? null)}
                onValueChange={(files) => setFormFile(files[0] ?? null)}
                disabled={saving}
                showFileList
                validation={{
                  accept: 'application/pdf,.pdf',
                  maxSizeBytes: 25 * 1024 * 1024,
                }}
                title={t('adm.fundRequestLetters.document')}
                description={t('adm.fundRequestLetters.fileHint')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('adm.fundRequestLetters.statusLabel')}</Label>
              {renderStatusSelect()}
            </div>
            <div className="space-y-1.5">
              <Label>{t('adm.fundRequestLetters.fund')}</Label>
              {renderFundSelect()}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              {t('adm.cancel')}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              onClick={handleCreate}
              disabled={saving}
            >
              {saving ? t('adm.uploading') : t('adm.fundRequestLetters.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('adm.fundRequestLetters.linkTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <p className="break-words text-sm text-muted-foreground">
              {editing?.title}
            </p>
            <div className="space-y-1.5">
              <Label>{t('adm.fundRequestLetters.statusLabel')}</Label>
              {renderStatusSelect()}
            </div>
            <div className="space-y-1.5">
              <Label>{t('adm.fundRequestLetters.fund')}</Label>
              {renderFundSelect()}
              <p className="text-xs text-muted-foreground">
                {t('adm.fundRequestLetters.fundHint')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              {t('adm.cancel')}
            </Button>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              onClick={handleSaveLink}
              disabled={saving}
            >
              {saving ? t('adm.uploading') : t('adm.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('adm.fundRequestLetters.delete')}
        description={t('adm.fundRequestLetters.deleteDescription')}
        confirmText={t('adm.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
