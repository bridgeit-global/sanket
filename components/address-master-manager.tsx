'use client';

import { useMemo, useRef, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { ADDRESS_TYPES, type AddressType } from '@/lib/letters/address-types';
import type { AddressMasterRow } from '@/components/letter-address-field';
import {
  EMPTY_ADDRESS_PARTS,
  formatAddressMaster,
  hasAddressContent,
  mergeAddressParts,
  parseFreeTextAddressForLocale,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';

type AddressFormState = {
  name: string;
  addressType: AddressType;
  isActive: boolean;
  sortOrder: string;
  freeTextAddress: string;
} & AddressMasterAddressParts;

const EMPTY_FORM: AddressFormState = {
  name: '',
  addressType: 'general',
  ...EMPTY_ADDRESS_PARTS,
  freeTextAddress: '',
  isActive: true,
  sortOrder: '0',
};

function inferLocaleFromText(text: string): 'en' | 'mr' {
  // Devanagari block detection -> treat as Marathi.
  // If the string is mixed, Marathi wins to avoid lossy transliteration.
  return /[\u0900-\u097F]/.test(text) ? 'mr' : 'en';
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
  const { t } = useTranslations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const translateTimerRef = useRef<number | null>(null);
  const translateReqIdRef = useRef(0);

  const sortedAddresses = useMemo(
    () =>
      [...addresses].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name),
      ),
    [addresses],
  );

  const openCreateDialog = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEditDialog = (address: AddressMasterRow) => {
    setEditingId(address.id);
    setForm({
      name: address.name,
      addressType: address.addressType,
      houseNumberEn: address.houseNumberEn,
      houseNumberMr: address.houseNumberMr,
      localityStreetEn: address.localityStreetEn,
      localityStreetMr: address.localityStreetMr,
      townVillageEn: address.townVillageEn,
      townVillageMr: address.townVillageMr,
      pincode: address.pincode,
      freeTextAddress: formatAddressMaster(address, 'en') || formatAddressMaster(address, 'mr'),
      isActive: address.isActive,
      sortOrder: String(address.sortOrder),
    });
    setIsDialogOpen(true);
  };

  const scheduleTranslateFreeText = (sourceText: string) => {
    const trimmed = sourceText.trim();
    if (!trimmed) return;

    translateReqIdRef.current += 1;
    const reqId = translateReqIdRef.current;

    if (translateTimerRef.current) window.clearTimeout(translateTimerRef.current);

    translateTimerRef.current = window.setTimeout(async () => {
      try {
        const inferredSourceLocale = inferLocaleFromText(sourceText);
        const targetLocale: 'en' | 'mr' = inferredSourceLocale === 'mr' ? 'en' : 'mr';

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: sourceText, targetLocale }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to translate');
        if (translateReqIdRef.current !== reqId) return;

        const translated = String(json?.translated ?? '').trim();
        if (!translated) return;

        setForm((prev) => {
          const primary = parseFreeTextAddressForLocale(sourceText, inferredSourceLocale);
          const secondary = parseFreeTextAddressForLocale(translated, targetLocale);
          const merged = mergeAddressParts(primary, secondary);
          return { ...prev, ...merged };
        });
      } catch (error) {
        console.error('Failed to auto-translate address master free text', error);
      }
    }, 450);
  };

  const updateField = (field: keyof AddressFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateFreeTextAddress = (value: string) => {
    const inferredLocale = inferLocaleFromText(value);
    const primary = parseFreeTextAddressForLocale(value, inferredLocale);
    setForm((prev) => ({
      ...prev,
      freeTextAddress: value,
      ...mergeAddressParts(prev, primary),
    }));
    scheduleTranslateFreeText(value);
  };

  const handleSave = async () => {
    const parts: AddressMasterAddressParts = {
      houseNumberEn: form.houseNumberEn.trim(),
      houseNumberMr: form.houseNumberMr.trim(),
      localityStreetEn: form.localityStreetEn.trim(),
      localityStreetMr: form.localityStreetMr.trim(),
      townVillageEn: form.townVillageEn.trim(),
      townVillageMr: form.townVillageMr.trim(),
      pincode: form.pincode.trim(),
    };

    if (!form.name.trim() || !hasAddressContent(parts)) {
      toast.error(t('letterGeneration.addresses.validationRequired'));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        addressType: form.addressType,
        ...parts,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
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
      setIsDialogOpen(false);
      await onRefresh();
    } catch (error) {
      console.error('Failed to save address', error);
      toast.error(
        editingId
          ? t('letterGeneration.addresses.updateError')
          : t('letterGeneration.addresses.createError'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/addresses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete address');
      toast.success(t('letterGeneration.addresses.deleteSuccess'));
      await onRefresh();
    } catch (error) {
      console.error('Failed to delete address', error);
      toast.error(t('letterGeneration.addresses.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {t('letterGeneration.addresses.title')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.addresses.description')}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => void onRefresh()}
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                {t('letterGeneration.savedLetters.refresh')}
              </Button>
              <Button className="w-full sm:w-auto" onClick={openCreateDialog}>
                <Plus className="mr-2 size-4" />
                {t('letterGeneration.addresses.add')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {sortedAddresses.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              {t('letterGeneration.addresses.empty')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('letterGeneration.addresses.columns.name')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.type')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.english')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.marathi')}</TableHead>
                    <TableHead>{t('letterGeneration.addresses.columns.active')}</TableHead>
                    <TableHead className="text-right">
                      {t('letterGeneration.savedLetters.columns.actions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAddresses.map((address) => (
                    <TableRow key={address.id}>
                      <TableCell className="font-medium">{address.name}</TableCell>
                      <TableCell>
                        {t(`letterGeneration.addresses.types.${address.addressType}`)}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm">
                        {formatAddressMaster(address, 'en')}
                      </TableCell>
                      <TableCell className="max-w-[220px] whitespace-pre-wrap text-sm">
                        {formatAddressMaster(address, 'mr')}
                      </TableCell>
                      <TableCell>
                        {address.isActive
                          ? t('letterGeneration.addresses.activeYes')
                          : t('letterGeneration.addresses.activeNo')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(address)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => void handleDelete(address.id)}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t('letterGeneration.addresses.editTitle')
                : t('letterGeneration.addresses.addTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('letterGeneration.addresses.formDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('letterGeneration.addresses.columns.name')}</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('letterGeneration.addresses.columns.type')}</Label>
              <Select
                value={form.addressType}
                onValueChange={(value: AddressType) =>
                  setForm({ ...form, addressType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`letterGeneration.addresses.types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('letterGeneration.addresses.formDescription')}</Label>
              <Textarea
                value={form.freeTextAddress}
                onChange={(event) => updateFreeTextAddress(event.target.value)}
                placeholder="House/Plot, Street/Area, Town/Village - Pincode"
                className="min-h-[120px]"
              />
              <div className="text-xs text-muted-foreground">
                {t('letterGeneration.addresses.columns.english')}: {formatAddressMaster(form, 'en')}
                <br />
                {t('letterGeneration.addresses.columns.marathi')}: {formatAddressMaster(form, 'mr')}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('letterGeneration.addresses.columns.sortOrder')}</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm({ ...form, sortOrder: event.target.value })}
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
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editingId
                ? t('letterGeneration.addresses.save')
                : t('letterGeneration.addresses.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
