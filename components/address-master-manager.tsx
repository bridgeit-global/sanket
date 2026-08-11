'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Languages,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from '@/components/toast';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
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
import { TablePagination, usePagination } from '@/components/table-pagination';
import { useTranslations } from '@/hooks/use-translations';
import { ADDRESS_TYPES, type AddressType } from '@/lib/letters/address-types';
import type { AddressMasterRow } from '@/components/letter-address-field';
import {
  formatAddressMaster,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import { filterLocaleText } from '@/lib/letters/locale-text';
import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';

const DEFAULT_PAGE_SIZE = 10;

type AddressTypeOption = {
  id: string;
  code: string;
  labelEn: string;
  labelMr: string;
  isActive: boolean;
};

type PositionOption = {
  id: string;
  code: string | null;
  titleEn: string;
  titleMr: string;
  isActive: boolean;
};

type AddressBlockOption = AddressMasterAddressParts & {
  id: string;
  isActive: boolean;
};

type AddressFormState = {
  name: string;
  nameMr: string;
  typeId: string;
  addressType: string;
  addressId: string;
  positionId: string;
  isActive: boolean;
  sortOrder: string;
  startDate: string;
  endDate: string;
};

const DEFAULT_ADDRESS_START_DATE = '2026-01-01';

const EMPTY_FORM: AddressFormState = {
  name: '',
  nameMr: '',
  typeId: '',
  addressType: 'general',
  addressId: '',
  positionId: '',
  isActive: true,
  sortOrder: '0',
  startDate: DEFAULT_ADDRESS_START_DATE,
  endDate: '',
};

function formatAddressDateRangeLabel(
  address: Pick<AddressMasterRow, 'startDate' | 'endDate'>,
  t: (key: string, values?: Record<string, string>) => string,
): string | null {
  const start = address.startDate?.trim() || '';
  const end = address.endDate?.trim() || '';
  if (!end) return null;
  if (start) {
    return t('letterGeneration.addresses.dateRangeBetween', { start, end });
  }
  return t('letterGeneration.addresses.dateRangeUntil', { end });
}

async function translateAddressText(
  text: string,
  targetLocale: LetterLocale,
): Promise<string> {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, targetLocale }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to translate');
  return String(json?.translated ?? '').trim();
}

type AddressMasterManagerProps = {
  addresses: AddressMasterRow[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

export function AddressMasterManager({
  addresses,
  loading,
  onRefresh,
}: AddressMasterManagerProps) {
  const { t, locale } = useTranslations();
  const tRef = useRef(t);
  tRef.current = t;
  const [formCardOpen, setFormCardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const translatingCountRef = useRef(0);
  const formRef = useRef(form);
  formRef.current = form;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  );
  const [listPage, setListPage] = useState(1);
  const [listLimit, setListLimit] = useState(DEFAULT_PAGE_SIZE);

  const [types, setTypes] = useState<AddressTypeOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [blocks, setBlocks] = useState<AddressBlockOption[]>([]);
  const [mastersLoading, setMastersLoading] = useState(false);

  const refreshMasters = useCallback(async () => {
    setMastersLoading(true);
    try {
      const [typesRes, positionsRes, blocksRes] = await Promise.all([
        fetch('/api/address-types'),
        fetch('/api/positions'),
        fetch('/api/address-blocks'),
      ]);
      const [typesJson, positionsJson, blocksJson] = await Promise.all([
        typesRes.json(),
        positionsRes.json(),
        blocksRes.json(),
      ]);
      if (!typesRes.ok) throw new Error(typesJson?.error || 'Failed to load types');
      if (!positionsRes.ok) {
        throw new Error(positionsJson?.error || 'Failed to load positions');
      }
      if (!blocksRes.ok) throw new Error(blocksJson?.error || 'Failed to load blocks');
      setTypes((typesJson?.types ?? []) as AddressTypeOption[]);
      setPositions((positionsJson?.positions ?? []) as PositionOption[]);
      setBlocks((blocksJson?.blocks ?? []) as AddressBlockOption[]);
    } catch (error) {
      console.error(error);
      toast.error(tRef.current('letterGeneration.addresses.fetchError'));
    } finally {
      setMastersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMasters();
  }, [refreshMasters]);

  const sortedAddresses = useMemo(
    () =>
      [...addresses].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [addresses],
  );

  const filteredAddresses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sortedAddresses.filter((address) => {
      if (typeFilter !== 'all' && address.addressType !== typeFilter) {
        return false;
      }
      if (statusFilter === 'active' && !address.isActive) return false;
      if (statusFilter === 'inactive' && address.isActive) return false;
      if (!query) return true;

      const haystack = [
        address.name,
        address.nameMr,
        address.holderNameEn,
        address.holderNameMr,
        address.positionTitleEn,
        address.positionTitleMr,
        address.positionCode,
        address.addressType,
        formatAddressMaster(address, 'en'),
        formatAddressMaster(address, 'mr'),
        address.cityEn,
        address.cityMr,
        address.stateEn,
        address.stateMr,
        address.pincode,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [sortedAddresses, searchTerm, typeFilter, statusFilter]);

  const {
    paginatedItems: paginatedAddresses,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredAddresses, listLimit, {
    page: listPage,
    pageSize: listLimit,
    onPageChange: setListPage,
    onPageSizeChange: (size) => {
      setListLimit(size);
      setListPage(1);
    },
  });

  const hasActiveFilters =
    searchTerm.trim() !== '' || typeFilter !== 'all' || statusFilter !== 'all';

  const typeOptions = useMemo(
    () =>
      types
        .filter((row) => row.isActive || row.id === form.typeId)
        .map((row) => ({
          value: row.id,
          label:
            locale === 'mr'
              ? row.labelMr.trim() || row.labelEn || row.code
              : row.labelEn || row.code,
        })),
    [types, form.typeId, locale],
  );

  const positionOptions = useMemo(
    () =>
      positions
        .filter((row) => row.isActive || row.id === form.positionId)
        .map((row) => {
          const title =
            locale === 'mr'
              ? row.titleMr.trim() || row.titleEn
              : row.titleEn || row.titleMr;
          const label = row.code ? `${title} (${row.code})` : title;
          return { value: row.id, label: label || row.id };
        }),
    [positions, form.positionId, locale],
  );

  const blockOptions = useMemo(
    () =>
      blocks
        .filter((row) => row.isActive || row.id === form.addressId)
        .map((row) => ({
          value: row.id,
          label: formatAddressMaster(row, locale) || row.id,
        })),
    [blocks, form.addressId, locale],
  );

  const selectedBlock = useMemo(
    () => blocks.find((row) => row.id === form.addressId) ?? null,
    [blocks, form.addressId],
  );

  useEffect(() => {
    if (editingId) setFormCardOpen(true);
  }, [editingId]);

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormCardOpen(false);
  };

  const openEditForm = (address: AddressMasterRow) => {
    setEditingId(address.id);
    const matchedType =
      types.find((row) => row.id === address.typeId) ||
      types.find((row) => row.code === address.addressType);
    setForm({
      name: address.holderNameEn || address.name,
      nameMr: address.holderNameMr || address.nameMr,
      typeId: address.typeId || matchedType?.id || '',
      addressType: address.addressType || matchedType?.code || 'general',
      addressId: address.addressId || '',
      positionId: address.positionId || '',
      isActive: address.isActive,
      sortOrder: String(address.sortOrder),
      startDate: address.startDate || '',
      endDate: address.endDate || '',
    });

    const formElement = document.getElementById('address-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const translateInto = async (
    text: string,
    target: LetterLocale,
  ): Promise<string> => {
    const source = text.trim();
    if (!source) return '';
    const translated = filterLocaleText(
      await translateAddressText(source, target),
      target,
    );
    return target === 'mr' ? toLocaleDigits(translated, 'mr') : translated;
  };

  const fillCounterpartOnBlur = async (
    sourceKey: 'name' | 'nameMr',
    value: string,
  ) => {
    const source = value.trim();
    if (!source) return;
    const targetKey = sourceKey === 'name' ? 'nameMr' : 'name';
    const targetLocale: LetterLocale = sourceKey === 'name' ? 'mr' : 'en';
    if (formRef.current[targetKey].trim()) return;

    translatingCountRef.current += 1;
    setIsTranslating(true);
    try {
      const translated = await translateInto(source, targetLocale);
      if (!translated) return;
      setForm((prev) => {
        if (prev[targetKey].trim()) return prev;
        return { ...prev, [targetKey]: translated };
      });
    } catch (error) {
      console.error('Failed to auto-translate holder name on blur', error);
      toast.error(t('letterGeneration.addresses.translateError'));
    } finally {
      translatingCountRef.current -= 1;
      if (translatingCountRef.current === 0) setIsTranslating(false);
    }
  };

  const handleAutoTranslate = async () => {
    setIsTranslating(true);
    try {
      const nameEn = form.name.trim();
      const nameMr = form.nameMr.trim();
      if (nameEn && !nameMr) {
        setForm((prev) => ({ ...prev, nameMr: '' }));
        const translated = await translateInto(nameEn, 'mr');
        setForm((prev) => ({ ...prev, nameMr: translated }));
      } else if (nameMr && !nameEn) {
        const translated = await translateInto(nameMr, 'en');
        setForm((prev) => ({ ...prev, name: translated }));
      } else {
        toast.info(t('letterGeneration.addresses.nothingToTranslate'));
      }
    } catch (error) {
      console.error('Failed to auto-translate holder name', error);
      toast.error(t('letterGeneration.addresses.translateError'));
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    const nameEnInput = filterLocaleText(form.name.trim(), 'en');
    const nameMrInput = filterLocaleText(form.nameMr.trim(), 'mr');

    if (!nameEnInput && !nameMrInput) {
      toast.error(t('letterGeneration.addresses.validationRequired'));
      return;
    }
    if (!form.typeId || !form.addressId || !form.positionId) {
      toast.error(t('letterGeneration.addresses.validationRequired'));
      return;
    }
    if (
      form.startDate &&
      form.endDate &&
      form.startDate > form.endDate
    ) {
      toast.error(t('letterGeneration.addresses.dateRangeInvalid'));
      return;
    }

    setIsSaving(true);
    try {
      let nameEn = nameEnInput;
      let nameMr = nameMrInput;
      try {
        if (nameEn && !nameMr) nameMr = await translateInto(nameEn, 'mr');
        else if (nameMr && !nameEn) nameEn = await translateInto(nameMr, 'en');
      } catch (error) {
        console.error('Failed to translate holder name on save', error);
      }
      if (!nameEn) nameEn = nameMr;
      if (!nameMr) nameMr = nameEn;

      const selectedType = types.find((row) => row.id === form.typeId);
      const payload = {
        name: nameEn || nameMr,
        nameMr,
        addressType: selectedType?.code || form.addressType || 'general',
        typeId: form.typeId,
        addressId: form.addressId,
        positionId: form.positionId,
        isActive: form.isActive,
        sortOrder: Number(toWesternDigits(form.sortOrder)) || 0,
        startDate: form.startDate || DEFAULT_ADDRESS_START_DATE,
        endDate: form.endDate || null,
      };

      const res = editingId
        ? await fetch(`/api/addresses/${encodeURIComponent(editingId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save address');

      toast.success(
        editingId
          ? t('letterGeneration.addresses.updateSuccess')
          : t('letterGeneration.addresses.createSuccess'),
      );
      handleCancelEdit();
      await onRefresh();
    } catch (error) {
      console.error('Failed to save address', error);
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message.includes('required')
          ? t('letterGeneration.addresses.validationRequired')
          : editingId
            ? t('letterGeneration.addresses.updateError')
            : t('letterGeneration.addresses.createError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = (id: string) => {
    setAddressToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;
    const id = addressToDelete;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/addresses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete address');
      toast.success(t('letterGeneration.addresses.deleteSuccess'));
      if (editingId === id) {
        handleCancelEdit();
      }
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete address', error);
      toast.error(t('letterGeneration.addresses.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const filterTypeOptions = types.length > 0 ? types : ADDRESS_TYPES.map((code) => ({
    id: code,
    code,
    labelEn: code,
    labelMr: code,
    isActive: true,
  }));

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Card id="address-form">
        <CardHeader
          className="cursor-pointer select-none rounded-t-lg p-4 transition-colors hover:bg-muted/50 sm:p-6"
          onClick={() => {
            setFormCardOpen((open) => {
              const next = !open;
              if (next && !editingId) {
                setForm(EMPTY_FORM);
                void refreshMasters();
              }
              return next;
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFormCardOpen((open) => {
                const next = !open;
                if (next && !editingId) {
                  setForm(EMPTY_FORM);
                  void refreshMasters();
                }
                return next;
              });
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={formCardOpen}
          aria-controls="address-form-content"
          id="address-form-header"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base sm:text-lg">
                {editingId
                  ? t('letterGeneration.addresses.editTitle')
                  : t('letterGeneration.addresses.addTitle')}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t('letterGeneration.addresses.formDescription')}
              </CardDescription>
            </div>
            {formCardOpen ? (
              <ChevronUp className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </div>
        </CardHeader>

        {formCardOpen ? (
          <CardContent
            id="address-form-content"
            aria-labelledby="address-form-header"
            className="space-y-4 p-4 sm:p-6"
          >
            <div className="flex justify-stretch sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => void handleAutoTranslate()}
                disabled={isSaving || isTranslating}
              >
                {isTranslating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Languages className="mr-2 size-4" />
                )}
                {t('letterGeneration.addresses.autoTranslate')}
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>
                {t('letterGeneration.addresses.columns.holder')} *
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={form.name}
                  lang="en"
                  autoComplete="off"
                  required
                  aria-required
                  aria-label={`${t('letterGeneration.addresses.columns.holder')} (${t('letterGeneration.addresses.english')})`}
                  placeholder={t('letterGeneration.addresses.english')}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: filterLocaleText(event.target.value, 'en'),
                    })
                  }
                  onBlur={(event) =>
                    void fillCounterpartOnBlur('name', event.target.value)
                  }
                />
                <Input
                  value={form.nameMr}
                  lang="mr"
                  autoComplete="off"
                  aria-label={`${t('letterGeneration.addresses.columns.holder')} (${t('letterGeneration.addresses.marathi')})`}
                  placeholder={t('letterGeneration.addresses.marathi')}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      nameMr: filterLocaleText(event.target.value, 'mr'),
                    })
                  }
                  onBlur={(event) =>
                    void fillCounterpartOnBlur('nameMr', event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('letterGeneration.addresses.columns.type')} *</Label>
              <Combobox
                options={typeOptions}
                value={form.typeId}
                onValueChange={(value) => {
                  const selected = types.find((row) => row.id === value);
                  setForm({
                    ...form,
                    typeId: value,
                    addressType: selected?.code || form.addressType,
                  });
                }}
                placeholder={t('letterGeneration.addresses.selectType')}
                emptyMessage={t('letterGeneration.addresses.manageTypesHint')}
                disabled={mastersLoading}
                aria-required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('letterGeneration.addresses.columns.position')} *</Label>
              <Combobox
                options={positionOptions}
                value={form.positionId}
                onValueChange={(value) => setForm({ ...form, positionId: value })}
                placeholder={t('letterGeneration.addresses.selectPosition')}
                emptyMessage={t('letterGeneration.addresses.managePositionsHint')}
                disabled={mastersLoading}
                aria-required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('letterGeneration.addresses.tabs.addresses')} *</Label>
              <Combobox
                options={blockOptions}
                value={form.addressId}
                onValueChange={(value) => setForm({ ...form, addressId: value })}
                placeholder={t('letterGeneration.addresses.selectAddress')}
                emptyMessage={t('letterGeneration.addresses.manageAddressesHint')}
                disabled={mastersLoading}
                aria-required
              />
              {selectedBlock ? (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  <div>{formatAddressMaster(selectedBlock, 'en')}</div>
                  {formatAddressMaster(selectedBlock, 'mr') ? (
                    <div className="text-muted-foreground text-xs" lang="mr">
                      {formatAddressMaster(selectedBlock, 'mr')}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('letterGeneration.addresses.columns.sortOrder')}</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={toLocaleDigits(form.sortOrder, locale)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      sortOrder: toWesternDigits(event.target.value).replace(/\D/g, ''),
                    })
                  }
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Checkbox
                  id="address-active"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                />
                <Label htmlFor="address-active">
                  {t('letterGeneration.addresses.columns.active')}
                </Label>
              </div>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <p className="text-muted-foreground text-xs">
                {t('letterGeneration.addresses.dateRangeHint')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="address-start-date">
                    {t('letterGeneration.addresses.columns.startDate')}
                  </Label>
                  <Input
                    id="address-start-date"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm({ ...form, startDate: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="address-end-date">
                    {t('letterGeneration.addresses.columns.endDate')}
                  </Label>
                  <Input
                    id="address-end-date"
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm({ ...form, endDate: event.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={handleCancelEdit}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => void handleSave()}
                disabled={isSaving || isTranslating || mastersLoading}
              >
                {isSaving || isTranslating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {editingId
                  ? t('letterGeneration.addresses.save')
                  : t('letterGeneration.addresses.create')}
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              {t('letterGeneration.addresses.title')}
            </CardTitle>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void onRefresh()}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {t('letterGeneration.savedLetters.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6">
          {sortedAddresses.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              {t('letterGeneration.addresses.empty')}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setListPage(1);
                    }}
                    placeholder={t('letterGeneration.addresses.searchPlaceholder')}
                    className="pl-9"
                    aria-label={t('common.search')}
                  />
                </div>
                <Select
                  value={typeFilter}
                  onValueChange={(value: string) => {
                    setTypeFilter(value);
                    setListPage(1);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('letterGeneration.addresses.filterAllTypes')}
                    </SelectItem>
                    {filterTypeOptions.map((type) => (
                      <SelectItem key={type.code} value={type.code}>
                        {ADDRESS_TYPES.includes(type.code as AddressType)
                          ? t(`letterGeneration.addresses.types.${type.code}`)
                          : type.labelEn || type.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={statusFilter}
                  onValueChange={(value: 'all' | 'active' | 'inactive') => {
                    setStatusFilter(value);
                    setListPage(1);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('letterGeneration.addresses.filterAllStatuses')}
                    </SelectItem>
                    <SelectItem value="active">
                      {t('letterGeneration.addresses.activeYes')}
                    </SelectItem>
                    <SelectItem value="inactive">
                      {t('letterGeneration.addresses.activeNo')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredAddresses.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">
                  {hasActiveFilters
                    ? t('letterGeneration.addresses.noFilterResults')
                    : t('letterGeneration.addresses.empty')}
                </div>
              ) : (
                <>
                  {/* Mobile card list */}
                  <div className="space-y-3 md:hidden">
                    {paginatedAddresses.map((address) => {
                      const typeLabel = ADDRESS_TYPES.includes(
                        address.addressType as AddressType,
                      )
                        ? t(`letterGeneration.addresses.types.${address.addressType}`)
                        : address.typeLabelEn || address.addressType;
                      const rangeLabel = formatAddressDateRangeLabel(address, t);
                      return (
                        <div
                          key={address.id}
                          className="space-y-3 rounded-lg border p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium break-words">{address.name}</p>
                              {address.nameMr.trim() ? (
                                <p
                                  className="text-muted-foreground text-xs break-words"
                                  lang="mr"
                                >
                                  {address.nameMr}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => openEditForm(address)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => requestDelete(address.id)}
                                disabled={deletingId === address.id}
                              >
                                {deletingId === address.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="size-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <dl className="grid gap-2 text-sm">
                            <div>
                              <dt className="text-muted-foreground text-xs">
                                {t('letterGeneration.addresses.columns.type')}
                              </dt>
                              <dd>{typeLabel}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground text-xs">
                                {t('letterGeneration.addresses.columns.position')}
                              </dt>
                              <dd className="break-words">
                                {address.positionTitleEn ||
                                  address.positionTitleMr ||
                                  '—'}
                                {address.positionCode ? (
                                  <span className="text-muted-foreground text-xs">
                                    {' '}
                                    ({address.positionCode})
                                  </span>
                                ) : null}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground text-xs">
                                {t('letterGeneration.addresses.columns.english')}
                              </dt>
                              <dd className="whitespace-pre-wrap break-words">
                                {formatAddressMaster(address, 'en')}
                              </dd>
                            </div>
                            {formatAddressMaster(address, 'mr') ? (
                              <div>
                                <dt className="text-muted-foreground text-xs">
                                  {t('letterGeneration.addresses.columns.marathi')}
                                </dt>
                                <dd
                                  className="whitespace-pre-wrap break-words"
                                  lang="mr"
                                >
                                  {formatAddressMaster(address, 'mr')}
                                </dd>
                              </div>
                            ) : null}
                            <div>
                              <dt className="text-muted-foreground text-xs">
                                {t('letterGeneration.addresses.columns.active')}
                              </dt>
                              <dd>
                                {address.isActive
                                  ? t('letterGeneration.addresses.activeYes')
                                  : t('letterGeneration.addresses.activeNo')}
                                {rangeLabel ? (
                                  <span className="text-muted-foreground text-xs">
                                    {' '}
                                    · {rangeLabel}
                                  </span>
                                ) : null}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t('letterGeneration.addresses.columns.holder')}
                          </TableHead>
                          <TableHead>
                            {t('letterGeneration.addresses.columns.type')}
                          </TableHead>
                          <TableHead>
                            {t('letterGeneration.addresses.columns.position')}
                          </TableHead>
                          <TableHead>
                            {t('letterGeneration.addresses.columns.english')}
                          </TableHead>
                          <TableHead>
                            {t('letterGeneration.addresses.columns.marathi')}
                          </TableHead>
                          <TableHead>
                            {t('letterGeneration.addresses.columns.active')}
                          </TableHead>
                          <TableHead className="text-right">
                            {t('letterGeneration.savedLetters.columns.actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAddresses.map((address) => (
                          <TableRow key={address.id}>
                            <TableCell className="font-medium">
                              <div>{address.name}</div>
                              {address.nameMr.trim() ? (
                                <div
                                  className="text-muted-foreground text-xs"
                                  lang="mr"
                                >
                                  {address.nameMr}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {ADDRESS_TYPES.includes(
                                address.addressType as AddressType,
                              )
                                ? t(
                                    `letterGeneration.addresses.types.${address.addressType}`,
                                  )
                                : address.typeLabelEn || address.addressType}
                            </TableCell>
                            <TableCell className="max-w-[180px] whitespace-pre-wrap text-sm">
                              {address.positionTitleEn ||
                                address.positionTitleMr ||
                                '—'}
                              {address.positionCode ? (
                                <div className="text-muted-foreground text-xs">
                                  {address.positionCode}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm">
                              {formatAddressMaster(address, 'en')}
                            </TableCell>
                            <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm">
                              {formatAddressMaster(address, 'mr')}
                            </TableCell>
                            <TableCell>
                              <div>
                                {address.isActive
                                  ? t('letterGeneration.addresses.activeYes')
                                  : t('letterGeneration.addresses.activeNo')}
                              </div>
                              {(() => {
                                const rangeLabel = formatAddressDateRangeLabel(
                                  address,
                                  t,
                                );
                                return rangeLabel ? (
                                  <div className="text-muted-foreground text-xs">
                                    {rangeLabel}
                                  </div>
                                ) : null;
                              })()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEditForm(address)}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => requestDelete(address.id)}
                                  disabled={deletingId === address.id}
                                >
                                  {deletingId === address.id ? (
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
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={handlePageChange}
                    onPageSizeChange={handlePageSizeChange}
                  />
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setAddressToDelete(null);
        }}
        title={t('letterGeneration.addresses.deleteConfirmTitle')}
        description={t('letterGeneration.addresses.deleteConfirmDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
