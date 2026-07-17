'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from '@/hooks/use-translations';
import {
  ADM_AMOUNT_UNITS,
  type AdmAmountUnit,
} from '@/lib/adm/amount-unit';

type InwardEntry = {
  id: string;
  date: string;
  fromTo: string;
  subject: string;
  refNo?: string | null;
  documentType?: string;
  attachments?: Array<{ id: string; fileName: string; fileUrl: string | null }>;
};

interface AdmInwardLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'link' | 'register';
  showAmountUnit?: boolean;
  defaultAmountUnit?: AdmAmountUnit;
  onLinked: (payload: {
    registerEntryId: string;
    amountUnit: AdmAmountUnit;
  }) => Promise<void>;
}

export function AdmInwardLinkDialog({
  open,
  onOpenChange,
  mode,
  showAmountUnit = true,
  defaultAmountUnit = 'rupees',
  onLinked,
}: AdmInwardLinkDialogProps) {
  const { t } = useTranslations();
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<InwardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [amountUnit, setAmountUnit] =
    useState<AdmAmountUnit>(defaultAmountUnit);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [fromTo, setFromTo] = useState('');
  const [subject, setSubject] = useState('');
  const [refNo, setRefNo] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmountUnit(defaultAmountUnit);
    setSelectedId('');
    setSearch('');
    if (mode === 'link') {
      void loadEntries('');
    } else {
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setFromTo('');
      setSubject('');
      setRefNo('');
      setFile(null);
    }
  }, [open, mode, defaultAmountUnit]);

  const loadEntries = async (term: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'inward',
        limit: '30',
      });
      if (term.trim()) params.set('search', term.trim());
      const res = await fetch(`/api/register?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to search inward');
      }
      const data = (await res.json()) as InwardEntry[];
      setEntries(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToLoad'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await onLinked({ registerEntryId: selectedId, amountUnit });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterAndLink = async () => {
    if (!fromTo.trim() || !subject.trim()) {
      toast.error(t('adm.inwardRequiredFields'));
      return;
    }
    setSaving(true);
    try {
      const createRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'inward',
          documentType: 'SanctionOrder',
          date,
          fromTo: fromTo.trim(),
          subject: subject.trim(),
          refNo: refNo.trim() || undefined,
        }),
      });
      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create inward entry');
      }
      const entry = (await createRes.json()) as InwardEntry;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const attachRes = await fetch(
          `/api/register/${entry.id}/attachments`,
          { method: 'POST', body: formData },
        );
        if (!attachRes.ok) {
          const data = await attachRes.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to upload attachment');
        }
      }

      await onLinked({ registerEntryId: entry.id, amountUnit });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('adm.failedToSave'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'link'
              ? t('adm.linkInwardDocument')
              : t('adm.registerAndLinkDocument')}
          </DialogTitle>
        </DialogHeader>

        {mode === 'link' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void loadEntries(search);
                  }
                }}
                placeholder={t('adm.searchInwardPlaceholder')}
                className="min-h-10 pl-9"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadEntries(search)}
            >
              {loading ? t('adm.searching') : t('adm.search')}
            </Button>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {loading ? t('adm.searching') : t('adm.noInwardMatches')}
                </p>
              ) : (
                entries.map((entry) => (
                  <label
                    key={entry.id}
                    className="flex cursor-pointer gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted/40"
                  >
                    <input
                      type="radio"
                      name="inward-entry"
                      className="mt-1"
                      checked={selectedId === entry.id}
                      onChange={() => setSelectedId(entry.id)}
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{entry.subject}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {entry.date}
                        {entry.refNo ? ` · ${entry.refNo}` : ''}
                        {entry.fromTo ? ` · ${entry.fromTo}` : ''}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t('adm.inwardDate')}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.inwardFrom')}</Label>
              <Input
                value={fromTo}
                onChange={(e) => setFromTo(e.target.value)}
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.inwardSubject')}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.inwardRefNo')}</Label>
              <Input
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="min-h-10"
              />
            </div>
            <div className="space-y-1">
              <Label>{t('adm.inwardAttachment')}</Label>
              <Input
                type="file"
                className="min-h-10"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        )}

        {showAmountUnit && (
          <div className="space-y-1">
            <Label>{t('adm.amountUnit')}</Label>
            <Select
              value={amountUnit}
              onValueChange={(v) => setAmountUnit(v as AdmAmountUnit)}
            >
              <SelectTrigger className="min-h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADM_AMOUNT_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {t(`adm.amountUnit_${unit}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('adm.cancel')}
          </Button>
          <Button
            type="button"
            disabled={
              saving || (mode === 'link' ? !selectedId : !fromTo || !subject)
            }
            onClick={() =>
              void (mode === 'link'
                ? handleLinkExisting()
                : handleRegisterAndLink())
            }
          >
            {saving ? (
              t('adm.saving')
            ) : mode === 'link' ? (
              t('adm.linkDocument')
            ) : (
              <>
                <Upload className="mr-1 h-4 w-4" />
                {t('adm.registerAndLink')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
