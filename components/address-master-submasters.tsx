'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from '@/components/toast';

import { Button } from '@/components/ui/button';
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
import { BilingualAddressFields } from '@/components/bilingual-address-fields';
import {
  EMPTY_ADDRESS_PARTS,
  formatAddressMaster,
  hasRequiredAddressFields,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import { defaultLocationParts } from '@/lib/letters/indian-locations';
import { useTranslations } from '@/hooks/use-translations';

type AddressTypeRow = {
  id: string;
  code: string;
  labelEn: string;
  labelMr: string;
  isActive: boolean;
  sortOrder: number;
};

type PositionRow = {
  id: string;
  code: string | null;
  titleEn: string;
  titleMr: string;
  isActive: boolean;
  sortOrder: number;
};

type AddressBlockRow = AddressMasterAddressParts & {
  id: string;
  isActive: boolean;
  sortOrder: number;
};

export function AddressTypesManager() {
  const { t } = useTranslations();
  const tRef = useRef(t);
  tRef.current = t;
  const [rows, setRows] = useState<AddressTypeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    labelEn: '',
    labelMr: '',
    sortOrder: '0',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/address-types?includeInactive=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load types');
      setRows((json?.types ?? []) as AddressTypeRow[]);
    } catch (error) {
      console.error(error);
      toast.error(tRef.current('letterGeneration.addresses.typesTab.fetchError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reset = () => {
    setEditingId(null);
    setForm({ code: '', labelEn: '', labelMr: '', sortOrder: '0', isActive: true });
  };

  const save = async () => {
    if (!form.code.trim() || !form.labelEn.trim()) {
      toast.error(t('letterGeneration.addresses.typesTab.validationRequired'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: editingId,
        code: form.code.trim(),
        labelEn: form.labelEn.trim(),
        labelMr: form.labelMr.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      const res = await fetch('/api/address-types', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      toast.success(
        editingId
          ? t('letterGeneration.addresses.typesTab.updateSuccess')
          : t('letterGeneration.addresses.typesTab.createSuccess'),
      );
      reset();
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('letterGeneration.addresses.typesTab.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('letterGeneration.addresses.typesTab.code')}</Label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            disabled={Boolean(editingId)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('letterGeneration.addresses.columns.sortOrder')}</Label>
          <Input
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/\D/g, '') })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('letterGeneration.addresses.english')}</Label>
          <Input
            value={form.labelEn}
            onChange={(e) => setForm({ ...form, labelEn: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('letterGeneration.addresses.marathi')}</Label>
          <Input
            value={form.labelMr}
            lang="mr"
            onChange={(e) => setForm({ ...form, labelMr: e.target.value })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="type-active"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        <Label htmlFor="type-active">{t('letterGeneration.addresses.activeYes')}</Label>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {editingId
            ? t('letterGeneration.addresses.save')
            : t('letterGeneration.addresses.create')}
        </Button>
        {editingId ? (
          <Button type="button" variant="outline" onClick={reset}>
            {t('common.cancel')}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t('common.loading')}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('letterGeneration.addresses.typesTab.code')}</TableHead>
              <TableHead>{t('letterGeneration.addresses.english')}</TableHead>
              <TableHead>{t('letterGeneration.addresses.marathi')}</TableHead>
              <TableHead>{t('letterGeneration.addresses.columns.active')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.code}</TableCell>
                <TableCell>{row.labelEn}</TableCell>
                <TableCell lang="mr">{row.labelMr || '—'}</TableCell>
                <TableCell>
                  {row.isActive
                    ? t('letterGeneration.addresses.activeYes')
                    : t('letterGeneration.addresses.activeNo')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({
                        code: row.code,
                        labelEn: row.labelEn,
                        labelMr: row.labelMr,
                        sortOrder: String(row.sortOrder),
                        isActive: row.isActive,
                      });
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function AddressBlocksManager() {
  const { t } = useTranslations();
  const tRef = useRef(t);
  tRef.current = t;
  const [rows, setRows] = useState<AddressBlockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [parts, setParts] = useState<AddressMasterAddressParts>({
    ...EMPTY_ADDRESS_PARTS,
    ...defaultLocationParts(),
  });
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/address-blocks?includeInactive=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load blocks');
      setRows((json?.blocks ?? []) as AddressBlockRow[]);
    } catch (error) {
      console.error(error);
      toast.error(tRef.current('letterGeneration.addresses.blocksTab.fetchError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reset = () => {
    setEditingId(null);
    setParts({ ...EMPTY_ADDRESS_PARTS, ...defaultLocationParts() });
    setSortOrder('0');
    setIsActive(true);
  };

  const save = async () => {
    if (!hasRequiredAddressFields(parts, 'en') && !hasRequiredAddressFields(parts, 'mr')) {
      toast.error(t('letterGeneration.addresses.fieldsRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/address-blocks', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          ...parts,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      toast.success(
        editingId
          ? t('letterGeneration.addresses.blocksTab.updateSuccess')
          : t('letterGeneration.addresses.blocksTab.createSuccess'),
      );
      reset();
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('letterGeneration.addresses.blocksTab.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <BilingualAddressFields parts={parts} onPartsChange={(patch) => setParts((p) => ({ ...p, ...patch }))} />
      <div className="space-y-1.5 max-w-xs">
        <Label>{t('letterGeneration.addresses.columns.sortOrder')}</Label>
        <Input
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="block-active"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <Label htmlFor="block-active">{t('letterGeneration.addresses.activeYes')}</Label>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {editingId
            ? t('letterGeneration.addresses.save')
            : t('letterGeneration.addresses.create')}
        </Button>
        {editingId ? (
          <Button type="button" variant="outline" onClick={reset}>
            {t('common.cancel')}
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t('common.loading')}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('letterGeneration.addresses.columns.english')}</TableHead>
              <TableHead>{t('letterGeneration.addresses.columns.marathi')}</TableHead>
              <TableHead>{t('letterGeneration.addresses.columns.sortOrder')}</TableHead>
              <TableHead>{t('letterGeneration.addresses.columns.active')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-[280px] whitespace-pre-wrap text-sm">
                  {formatAddressMaster(row, 'en')}
                </TableCell>
                <TableCell className="max-w-[280px] whitespace-pre-wrap text-sm" lang="mr">
                  {formatAddressMaster(row, 'mr')}
                </TableCell>
                <TableCell>{row.sortOrder}</TableCell>
                <TableCell>
                  {row.isActive
                    ? t('letterGeneration.addresses.activeYes')
                    : t('letterGeneration.addresses.activeNo')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(row.id);
                      setParts({
                        line1En: row.line1En,
                        line1Mr: row.line1Mr,
                        line2En: row.line2En,
                        line2Mr: row.line2Mr,
                        line3En: row.line3En,
                        line3Mr: row.line3Mr,
                        cityEn: row.cityEn,
                        cityMr: row.cityMr,
                        stateEn: row.stateEn,
                        stateMr: row.stateMr,
                        pincode: row.pincode,
                      });
                      setSortOrder(String(row.sortOrder));
                      setIsActive(row.isActive);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export function PositionsManager() {
  const { t } = useTranslations();
  const tRef = useRef(t);
  tRef.current = t;
  const [rows, setRows] = useState<PositionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    titleEn: '',
    titleMr: '',
    code: '',
    sortOrder: '0',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/positions?includeInactive=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load positions');
      setRows((json?.positions ?? []) as PositionRow[]);
    } catch (error) {
      console.error(error);
      toast.error(tRef.current('letterGeneration.addresses.positionsTab.fetchError'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reset = () => {
    setEditingId(null);
    setForm({ titleEn: '', titleMr: '', code: '', sortOrder: '0', isActive: true });
  };

  const save = async () => {
    if (!form.titleEn.trim()) {
      toast.error(t('letterGeneration.addresses.positionsTab.validationRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/positions', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          titleEn: form.titleEn.trim(),
          titleMr: form.titleMr.trim(),
          code: form.code.trim() || null,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      toast.success(
        editingId
          ? t('letterGeneration.addresses.positionsTab.updateSuccess')
          : t('letterGeneration.addresses.positionsTab.createSuccess'),
      );
      reset();
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(t('letterGeneration.addresses.positionsTab.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t('letterGeneration.addresses.english')}</Label>
          <Input
            value={form.titleEn}
            onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('letterGeneration.addresses.marathi')}</Label>
          <Input
            value={form.titleMr}
            lang="mr"
            onChange={(e) => setForm({ ...form, titleMr: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('letterGeneration.addresses.columns.positionCode')}</Label>
          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('letterGeneration.addresses.columns.sortOrder')}</Label>
          <Input
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value.replace(/\D/g, '') })}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="position-active"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
        <Label htmlFor="position-active">{t('letterGeneration.addresses.activeYes')}</Label>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {editingId
            ? t('letterGeneration.addresses.save')
            : t('letterGeneration.addresses.create')}
        </Button>
        {editingId ? (
          <Button type="button" variant="outline" onClick={reset}>
            {t('common.cancel')}
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t('common.loading')}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('letterGeneration.addresses.columns.position')}</TableHead>
              <TableHead>{t('letterGeneration.addresses.columns.positionCode')}</TableHead>
              <TableHead>{t('letterGeneration.addresses.columns.active')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div>{row.titleEn}</div>
                  {row.titleMr ? (
                    <div className="text-muted-foreground text-xs" lang="mr">
                      {row.titleMr}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>{row.code || '—'}</TableCell>
                <TableCell>
                  {row.isActive
                    ? t('letterGeneration.addresses.activeYes')
                    : t('letterGeneration.addresses.activeNo')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({
                        titleEn: row.titleEn,
                        titleMr: row.titleMr,
                        code: row.code || '',
                        sortOrder: String(row.sortOrder),
                        isActive: row.isActive,
                      });
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
