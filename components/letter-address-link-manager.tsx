'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  ADDRESS_TYPES,
  LETTER_ADDRESS_FIELDS,
  LETTER_TYPES,
  type AddressType,
  type LetterAddressField,
} from '@/lib/letters/letter-address-fields';
import type { LetterType } from '@/lib/letters/templates';

export type LetterAddressTypeLinkRow = {
  id: string;
  letterType: string;
  addressField: string;
  addressType: AddressType;
  sortOrder: number;
};

type Props = {
  links: LetterAddressTypeLinkRow[];
  loading?: boolean;
  onRefresh: () => Promise<void> | void;
};

export function LetterAddressLinkManager({ links, loading, onRefresh }: Props) {
  const { t } = useTranslations();
  const [saving, setSaving] = useState(false);
  const [letterType, setLetterType] = useState<LetterType>('fees');
  const [addressField, setAddressField] = useState<LetterAddressField>('school');
  const [addressType, setAddressType] = useState<AddressType>('school');

  const sortedLinks = useMemo(
    () =>
      [...links].sort((a, b) => {
        const typeCmp = a.letterType.localeCompare(b.letterType);
        if (typeCmp !== 0) return typeCmp;
        return a.sortOrder - b.sortOrder;
      }),
    [links],
  );

  const letterTypeLabel = useCallback(
    (value: string) => {
      const key = `letterGeneration.tabs.${value}`;
      const label = t(key);
      return label === key ? value : label;
    },
    [t],
  );

  const fieldLabel = useCallback(
    (value: string) => {
      const key = `letterGeneration.letterAddressLinks.fields.${value}`;
      const label = t(key);
      return label === key ? value : label;
    },
    [t],
  );

  const typeLabel = useCallback(
    (value: string) => {
      const key = `letterGeneration.addresses.types.${value}`;
      const label = t(key);
      return label === key ? value : label;
    },
    [t],
  );

  const handleCreate = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/letter-address-links', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ letterType, addressField, addressType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      toast.success(t('letterGeneration.letterAddressLinks.saveSuccess'));
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error(t('letterGeneration.letterAddressLinks.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateType = async (id: string, nextType: AddressType) => {
    setSaving(true);
    try {
      const res = await fetch('/api/letter-address-links', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, addressType: nextType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update');
      toast.success(t('letterGeneration.letterAddressLinks.saveSuccess'));
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error(t('letterGeneration.letterAddressLinks.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/letter-address-links?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete');
      toast.success(t('letterGeneration.letterAddressLinks.deleteSuccess'));
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error(t('letterGeneration.letterAddressLinks.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Keep form defaults aligned with common school letters.
    if (letterType === 'fees' || letterType.startsWith('school-')) {
      setAddressField('school');
      setAddressType('school');
    } else if (letterType.startsWith('ration-')) {
      setAddressField('rationOffice');
      setAddressType('ration_office');
    } else {
      setAddressField('office');
      setAddressType('office');
    }
  }, [letterType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('letterGeneration.letterAddressLinks.title')}</CardTitle>
        <CardDescription>
          {t('letterGeneration.letterAddressLinks.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>{t('letterGeneration.letterAddressLinks.columns.letterType')}</Label>
            <Select
              value={letterType}
              onValueChange={(value) => setLetterType(value as LetterType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LETTER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {letterTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('letterGeneration.letterAddressLinks.columns.addressField')}</Label>
            <Select
              value={addressField}
              onValueChange={(value) => setAddressField(value as LetterAddressField)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LETTER_ADDRESS_FIELDS.map((field) => (
                  <SelectItem key={field} value={field}>
                    {fieldLabel(field)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('letterGeneration.letterAddressLinks.columns.addressType')}</Label>
            <Select
              value={addressType}
              onValueChange={(value) => setAddressType(value as AddressType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDRESS_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {typeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => void handleCreate()}
              disabled={saving || loading}
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              {t('letterGeneration.letterAddressLinks.add')}
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  {t('letterGeneration.letterAddressLinks.columns.letterType')}
                </TableHead>
                <TableHead>
                  {t('letterGeneration.letterAddressLinks.columns.addressField')}
                </TableHead>
                <TableHead>
                  {t('letterGeneration.letterAddressLinks.columns.addressType')}
                </TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && sortedLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : sortedLinks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {t('letterGeneration.letterAddressLinks.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                sortedLinks.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{letterTypeLabel(row.letterType)}</TableCell>
                    <TableCell>{fieldLabel(row.addressField)}</TableCell>
                    <TableCell>
                      <Select
                        value={row.addressType}
                        onValueChange={(value) =>
                          void handleUpdateType(row.id, value as AddressType)
                        }
                        disabled={saving}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ADDRESS_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {typeLabel(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDelete(row.id)}
                        disabled={saving}
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
