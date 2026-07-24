'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/components/toast';

import type { DocumentTypeMasterRow } from '@/components/document-type-master-page';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from '@/hooks/use-translations';
import { documentTypeLabel } from '@/lib/letters/reference-sequence';
import type { LetterLocale } from '@/lib/letters/templates';

type DocumentTypeFormState = {
  code: string;
  labelEn: string;
  labelMr: string;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY_FORM: DocumentTypeFormState = {
  code: '',
  labelEn: '',
  labelMr: '',
  isActive: true,
  sortOrder: '0',
};

type DocumentTypeMasterManagerProps = {
  documentTypes: DocumentTypeMasterRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

export function DocumentTypeMasterManager({
  documentTypes,
  loading,
  onRefresh,
}: DocumentTypeMasterManagerProps) {
  const { t, locale } = useTranslations();
  const letterLocale: LetterLocale = locale === 'mr' ? 'mr' : 'en';
  const [formCardOpen, setFormCardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DocumentTypeFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sortedTypes = useMemo(
    () =>
      [...documentTypes].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
      ),
    [documentTypes],
  );

  useEffect(() => {
    if (editingId) setFormCardOpen(true);
  }, [editingId]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormCardOpen(false);
  };

  const openEditForm = (item: DocumentTypeMasterRow) => {
    setEditingId(item.id);
    setForm({
      code: item.code,
      labelEn: item.labelEn,
      labelMr: item.labelMr,
      isActive: item.isActive,
      sortOrder: String(item.sortOrder),
    });
    const formElement = document.getElementById('document-type-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = form.code.trim();
    const labelEn = form.labelEn.trim();
    const labelMr = form.labelMr.trim();
    if (!code || !labelEn || !labelMr) {
      toast.error(t('letterGeneration.documentTypesMaster.validationRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        code,
        labelEn,
        labelMr,
        isActive: form.isActive,
        sortOrder: Number.isFinite(Number(form.sortOrder))
          ? Number(form.sortOrder)
          : 0,
      };
      const res = await fetch(
        editingId ? `/api/document-types/${editingId}` : '/api/document-types',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error ||
            (editingId
              ? t('letterGeneration.documentTypesMaster.updateError')
              : t('letterGeneration.documentTypesMaster.createError')),
        );
      }
      toast.success(
        editingId
          ? t('letterGeneration.documentTypesMaster.updateSuccess')
          : t('letterGeneration.documentTypesMaster.createSuccess'),
      );
      handleCancelEdit();
      await onRefresh();
    } catch (error) {
      console.error('Failed to save document type', error);
      toast.error(
        error instanceof Error
          ? error.message
          : editingId
            ? t('letterGeneration.documentTypesMaster.updateError')
            : t('letterGeneration.documentTypesMaster.createError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/document-types/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error || t('letterGeneration.documentTypesMaster.deleteError'),
        );
      }
      toast.success(t('letterGeneration.documentTypesMaster.deleteSuccess'));
      if (editingId === id) handleCancelEdit();
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete document type', error);
      toast.error(
        error instanceof Error
          ? error.message
          : t('letterGeneration.documentTypesMaster.deleteError'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setFormCardOpen((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFormCardOpen((v) => !v);
            }
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>
                {editingId
                  ? t('letterGeneration.documentTypesMaster.editTitle')
                  : t('letterGeneration.documentTypesMaster.addTitle')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.documentTypesMaster.formDescription')}
              </CardDescription>
            </div>
            {formCardOpen ? (
              <ChevronUp className="mt-1 size-5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {formCardOpen ? (
          <CardContent>
            <form
              id="document-type-form"
              onSubmit={handleSubmit}
              className="grid gap-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="doc-type-code">
                  {t('letterGeneration.documentTypesMaster.columns.code')}
                </Label>
                <Input
                  id="doc-type-code"
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-type-sort">
                  {t('letterGeneration.documentTypesMaster.columns.sortOrder')}
                </Label>
                <Input
                  id="doc-type-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-type-label-en">
                  {t('letterGeneration.documentTypesMaster.columns.labelEn')}
                </Label>
                <Input
                  id="doc-type-label-en"
                  value={form.labelEn}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, labelEn: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-type-label-mr">
                  {t('letterGeneration.documentTypesMaster.columns.labelMr')}
                </Label>
                <Input
                  id="doc-type-label-mr"
                  value={form.labelMr}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, labelMr: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="doc-type-active"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: event.target.checked,
                    }))
                  }
                />
                <Label htmlFor="doc-type-active">
                  {t('letterGeneration.documentTypesMaster.activeYes')}
                </Label>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {editingId
                    ? t('letterGeneration.documentTypesMaster.save')
                    : t('letterGeneration.documentTypesMaster.create')}
                </Button>
                {editingId || formCardOpen ? (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    {t('common.cancel')}
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('letterGeneration.documentTypesMaster.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t('common.loading')}
            </div>
          ) : sortedTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('letterGeneration.documentTypesMaster.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t('letterGeneration.documentTypesMaster.columns.code')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.documentTypesMaster.columns.label')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.documentTypesMaster.columns.nextNumber')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.documentTypesMaster.columns.active')}
                    </TableHead>
                    <TableHead>
                      {t('letterGeneration.documentTypesMaster.columns.sortOrder')}
                    </TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTypes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.code}</TableCell>
                      <TableCell>
                        {documentTypeLabel(item.code, letterLocale, [
                          {
                            code: item.code,
                            labelEn: item.labelEn,
                            labelMr: item.labelMr,
                          },
                        ])}
                      </TableCell>
                      <TableCell>{item.lastSequence + 1}</TableCell>
                      <TableCell>
                        {item.isActive
                          ? t('letterGeneration.documentTypesMaster.activeYes')
                          : t('letterGeneration.documentTypesMaster.activeNo')}
                      </TableCell>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(item)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === item.id}
                            onClick={() => void handleDelete(item.id)}
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
