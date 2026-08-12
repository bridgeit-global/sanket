'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from '@/components/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { formatDisplayDateIST, getTodayDateStringIST } from '@/lib/ist-date';
import type { AdmDemandLetter } from '@/lib/db/schema';

interface AdmDemandLettersProps {
  titleFilter: string;
  fromDate: string;
  toDate: string;
  onFiltersChange: (updates: {
    title?: string;
    from?: string;
    to?: string;
  }) => void;
}

export function AdmDemandLetters({
  titleFilter,
  fromDate,
  toDate,
  onFiltersChange,
}: AdmDemandLettersProps) {
  const { t } = useTranslations();
  const [letters, setLetters] = useState<AdmDemandLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(getTodayDateStringIST());
  const [formFile, setFormFile] = useState<File | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadLetters = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (titleFilter.trim()) params.set('title', titleFilter.trim());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      const qs = params.toString();
      const response = await fetch(
        qs ? `/api/adm/demand-letters?${qs}` : '/api/adm/demand-letters',
        { signal },
      );
      if (!response.ok) {
        throw new Error('Failed to load demand letters');
      }
      const data = (await response.json()) as AdmDemandLetter[];
      setLetters(data);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Error loading demand letters:', error);
      toast.error(t('adm.demandLetters.failedToLoad'));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
    // `t` is recreated every render by useTranslations — do not list it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleFilter, fromDate, toDate]);

  useEffect(() => {
    const controller = new AbortController();
    loadLetters(controller.signal);
    return () => controller.abort();
  }, [loadLetters]);

  useEffect(() => {
    setPage(1);
  }, [titleFilter, fromDate, toDate]);

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

  const resetForm = () => {
    setFormTitle('');
    setFormDate(getTodayDateStringIST());
    setFormFile(null);
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast.error(t('adm.demandLetters.titleRequired'));
      return;
    }
    if (!formDate) {
      toast.error(t('adm.demandLetters.dateRequired'));
      return;
    }
    if (!formFile) {
      toast.error(t('adm.demandLetters.fileRequired'));
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('file', formFile);
      formData.append('title', formTitle.trim());
      formData.append('letterDate', formDate);

      const response = await fetch('/api/adm/demand-letters', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload');
      }

      toast.success(t('adm.demandLetters.uploadedSuccess'));
      setCreateOpen(false);
      resetForm();
      await loadLetters();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('adm.demandLetters.failedToUpload'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const response = await fetch(`/api/adm/demand-letters/${deleteId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success(t('adm.demandLetters.deletedSuccess'));
      setDeleteId(null);
      await loadLetters();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('adm.demandLetters.failedToDelete'),
      );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="dl-title-filter">
              {t('adm.demandLetters.filterTitle')}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="dl-title-filter"
                value={titleFilter}
                onChange={(e) => onFiltersChange({ title: e.target.value })}
                placeholder={t('adm.demandLetters.filterTitlePlaceholder')}
                className="min-h-11 pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dl-from">{t('adm.demandLetters.fromDate')}</Label>
            <Input
              id="dl-from"
              type="date"
              value={fromDate}
              onChange={(e) => onFiltersChange({ from: e.target.value })}
              className="min-h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dl-to">{t('adm.demandLetters.toDate')}</Label>
            <Input
              id="dl-to"
              type="date"
              value={toDate}
              onChange={(e) => onFiltersChange({ to: e.target.value })}
              className="min-h-11"
            />
          </div>
        </div>
        <Button
          type="button"
          className="min-h-11 shrink-0"
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('adm.demandLetters.add')}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adm.demandLetters.date')}</TableHead>
              <TableHead>{t('adm.demandLetters.title')}</TableHead>
              <TableHead>{t('adm.demandLetters.document')}</TableHead>
              <TableHead className="w-[80px] text-right">
                {t('adm.demandLetters.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t('adm.demandLetters.loading')}
                </TableCell>
              </TableRow>
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  {titleFilter || fromDate || toDate
                    ? t('adm.demandLetters.noMatch')
                    : t('adm.demandLetters.empty')}
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((letter) => (
                <TableRow key={letter.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDisplayDateIST(letter.letterDate)}
                  </TableCell>
                  <TableCell className="font-medium">{letter.title}</TableCell>
                  <TableCell>
                    {letter.fileUrl ? (
                      <a
                        href={letter.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate max-w-[220px]">
                          {letter.fileName || t('adm.demandLetters.viewDocument')}
                        </span>
                      </a>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(letter.id)}
                      title={t('adm.demandLetters.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adm.demandLetters.add')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dl-date">{t('adm.demandLetters.date')}</Label>
              <Input
                id="dl-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dl-title">{t('adm.demandLetters.title')}</Label>
              <Input
                id="dl-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t('adm.demandLetters.titlePlaceholder')}
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dl-file">{t('adm.demandLetters.document')}</Label>
              <Input
                id="dl-file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.txt"
                onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                className="min-h-11"
              />
              <p className="text-xs text-muted-foreground">
                {t('adm.demandLetters.fileHint')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={saving}
            >
              {t('adm.cancel')}
            </Button>
            <Button type="button" onClick={handleCreate} disabled={saving}>
              {saving ? t('adm.uploading') : t('adm.demandLetters.upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t('adm.demandLetters.delete')}
        description={t('adm.demandLetters.deleteDescription')}
        confirmText={t('adm.delete')}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
