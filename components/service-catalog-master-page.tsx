'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/components/toast';

import { ModulePageHeader } from '@/components/module-page-header';
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
import {
  letterTypeLabel,
  type LetterTypeOption,
} from '@/lib/letters/letter-type-options';
import type { LetterLocale } from '@/lib/letters/templates';

export type ServiceCatalogRow = {
  id: string;
  name: string;
  category: string | null;
  letterType: string | null;
  sortOrder: number;
  isActive: boolean;
};

type FormState = {
  name: string;
  category: string;
  letterType: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  letterType: '',
  sortOrder: '0',
  isActive: true,
};

const NONE_LETTER_TYPE = '__none__';

export function ServiceCatalogMasterPage() {
  const { t, locale } = useTranslations();
  const letterLocale: LetterLocale = locale === 'mr' ? 'mr' : 'en';
  const searchParams = useSearchParams();
  const tRef = useRef(t);
  tRef.current = t;

  const [services, setServices] = useState<ServiceCatalogRow[]>([]);
  const [letterTypes, setLetterTypes] = useState<LetterTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [formCardOpen, setFormCardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [servicesRes, typesRes] = await Promise.all([
        fetch('/api/service-catalog?includeInactive=true'),
        fetch('/api/letter-types'),
      ]);
      const servicesJson = await servicesRes.json();
      const typesJson = await typesRes.json();
      if (!servicesRes.ok) {
        throw new Error(
          servicesJson?.error ||
            tRef.current('letterGeneration.serviceCatalogMaster.fetchError'),
        );
      }
      if (!typesRes.ok) {
        throw new Error(
          typesJson?.error ||
            tRef.current('letterGeneration.letterTypes.fetchError'),
        );
      }
      setServices((servicesJson?.services ?? []) as ServiceCatalogRow[]);
      setLetterTypes((typesJson?.letterTypes ?? []) as LetterTypeOption[]);
    } catch (error) {
      console.error('Failed to fetch service catalog', error);
      toast.error(
        tRef.current('letterGeneration.serviceCatalogMaster.fetchError'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (editingId) setFormCardOpen(true);
  }, [editingId]);

  const typeLabel = useCallback(
    (code: string | null | undefined) => {
      if (!code) {
        return t('letterGeneration.serviceCatalogMaster.noLetterType');
      }
      const option = letterTypes.find((opt) => opt.code === code);
      if (option) return letterTypeLabel(option, letterLocale, code);
      return code;
    },
    [letterTypes, letterLocale, t],
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const rows = [...services].sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name) ||
        (a.category ?? '').localeCompare(b.category ?? ''),
    );
    if (!q) return rows;
    return rows.filter((row) => {
      const letterLbl = typeLabel(row.letterType).toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        (row.category ?? '').toLowerCase().includes(q) ||
        (row.letterType ?? '').toLowerCase().includes(q) ||
        letterLbl.includes(q)
      );
    });
  }, [services, searchTerm, typeLabel]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormCardOpen(false);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormCardOpen(true);
  };

  const openEditForm = (item: ServiceCatalogRow) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category ?? '',
      letterType: item.letterType ?? '',
      sortOrder: String(item.sortOrder),
      isActive: item.isActive,
    });
    document
      .getElementById('service-catalog-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error(
        t('letterGeneration.serviceCatalogMaster.validationRequired'),
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name,
        category: form.category.trim() || null,
        letterType: form.letterType.trim() || null,
        sortOrder: Number.isFinite(Number(form.sortOrder))
          ? Number(form.sortOrder)
          : 0,
        isActive: form.isActive,
      };
      const res = await fetch(
        editingId ? `/api/service-catalog/${editingId}` : '/api/service-catalog',
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
              ? t('letterGeneration.serviceCatalogMaster.updateError')
              : t('letterGeneration.serviceCatalogMaster.createError')),
        );
      }
      toast.success(
        editingId
          ? t('letterGeneration.serviceCatalogMaster.updateSuccess')
          : t('letterGeneration.serviceCatalogMaster.createSuccess'),
      );
      handleCancelEdit();
      await refresh();
    } catch (error) {
      console.error('Failed to save service catalog entry', error);
      toast.error(
        error instanceof Error
          ? error.message
          : editingId
            ? t('letterGeneration.serviceCatalogMaster.updateError')
            : t('letterGeneration.serviceCatalogMaster.createError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/service-catalog/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json?.error ||
            t('letterGeneration.serviceCatalogMaster.deleteError'),
        );
      }
      toast.success(t('letterGeneration.serviceCatalogMaster.deleteSuccess'));
      if (editingId === id) handleCancelEdit();
      await refresh();
    } catch (error) {
      console.error('Failed to delete service catalog entry', error);
      toast.error(
        error instanceof Error
          ? error.message
          : t('letterGeneration.serviceCatalogMaster.deleteError'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const beneficiaryServiceId = searchParams.get('beneficiaryServiceId');
  const backHref = beneficiaryServiceId
    ? `/modules/letter-generation?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
    : '/modules/operator';

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('letterGeneration.serviceCatalogMaster.title')}
        description={t('letterGeneration.serviceCatalogMaster.description')}
        actions={
          <Button variant="outline" asChild>
            <Link href={backHref}>
              <ArrowLeft className="mr-2 size-4" />
              {t(
                'letterGeneration.serviceCatalogMaster.backToLetterGeneration',
              )}
            </Link>
          </Button>
        }
      />

      <Card id="service-catalog-form">
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
            <div className="space-y-1.5">
              <CardTitle className="text-base">
                {editingId
                  ? t('letterGeneration.serviceCatalogMaster.editTitle')
                  : t('letterGeneration.serviceCatalogMaster.addTitle')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.serviceCatalogMaster.formDescription')}
              </CardDescription>
            </div>
            {formCardOpen ? (
              <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {formCardOpen ? (
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sc-name">
                  {t('letterGeneration.serviceCatalogMaster.columns.name')}
                </Label>
                <Input
                  id="sc-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder={t(
                    'letterGeneration.serviceCatalogMaster.namePlaceholder',
                  )}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-category">
                  {t('letterGeneration.serviceCatalogMaster.columns.category')}
                </Label>
                <Input
                  id="sc-category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  placeholder={t(
                    'letterGeneration.serviceCatalogMaster.categoryPlaceholder',
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t(
                    'letterGeneration.serviceCatalogMaster.columns.letterType',
                  )}
                </Label>
                <Select
                  value={form.letterType || NONE_LETTER_TYPE}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      letterType: value === NONE_LETTER_TYPE ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        'letterGeneration.serviceCatalogMaster.letterTypePlaceholder',
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_LETTER_TYPE}>
                      {t('letterGeneration.serviceCatalogMaster.noLetterType')}
                    </SelectItem>
                    {letterTypes
                      .filter((opt) => opt.isActive)
                      .map((opt) => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {letterTypeLabel(opt, letterLocale)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sc-sort">
                  {t('letterGeneration.serviceCatalogMaster.columns.sortOrder')}
                </Label>
                <Input
                  id="sc-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="sc-active"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
                <Label htmlFor="sc-active">
                  {t('letterGeneration.serviceCatalogMaster.activeYes')}
                </Label>
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {editingId
                    ? t('letterGeneration.serviceCatalogMaster.save')
                    : t('letterGeneration.serviceCatalogMaster.create')}
                </Button>
                {editingId || formCardOpen ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    {t('common.cancel')}
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-base">
              {t('letterGeneration.serviceCatalogMaster.listTitle')}
            </CardTitle>
            <CardDescription>
              {t('letterGeneration.serviceCatalogMaster.listDescription')}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t(
                'letterGeneration.serviceCatalogMaster.searchPlaceholder',
              )}
              className="w-full sm:w-56"
            />
            <Button type="button" variant="outline" onClick={openCreateForm}>
              {t('letterGeneration.serviceCatalogMaster.addTitle')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && services.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t('common.loading')}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {t('letterGeneration.serviceCatalogMaster.empty')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {t(
                        'letterGeneration.serviceCatalogMaster.columns.name',
                      )}
                    </TableHead>
                    <TableHead>
                      {t(
                        'letterGeneration.serviceCatalogMaster.columns.category',
                      )}
                    </TableHead>
                    <TableHead>
                      {t(
                        'letterGeneration.serviceCatalogMaster.columns.letterType',
                      )}
                    </TableHead>
                    <TableHead>
                      {t(
                        'letterGeneration.serviceCatalogMaster.columns.active',
                      )}
                    </TableHead>
                    <TableHead>
                      {t(
                        'letterGeneration.serviceCatalogMaster.columns.sortOrder',
                      )}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('common.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.category || '—'}
                      </TableCell>
                      <TableCell>{typeLabel(item.letterType)}</TableCell>
                      <TableCell>
                        {item.isActive
                          ? t(
                              'letterGeneration.serviceCatalogMaster.activeYes',
                            )
                          : t(
                              'letterGeneration.serviceCatalogMaster.activeNo',
                            )}
                      </TableCell>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditForm(item)}
                            aria-label={t('common.edit')}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === item.id}
                            onClick={() => void handleDelete(item.id)}
                            aria-label={t('common.delete')}
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
