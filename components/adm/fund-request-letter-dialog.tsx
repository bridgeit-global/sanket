'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from '@/components/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations } from '@/hooks/use-translations';
import {
  ADM_FUND_REQUEST_LETTER_STATUSES,
  fundRequestLetterStatusRequiresFund,
  type AdmFundRequestLetterStatus,
} from '@/lib/adm/fund-request-letter';
import type { AdmFundRequestLetter } from '@/lib/db/schema';
import { formatDisplayDateIST, getTodayDateStringIST } from '@/lib/ist-date';

const NO_FUND = '__none__';

interface FundRequestLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaryServiceId: string;
  defaultTitle: string;
}

export function FundRequestLetterDialog({
  open,
  onOpenChange,
  beneficiaryServiceId,
  defaultTitle,
}: FundRequestLetterDialogProps) {
  const { t } = useTranslations();
  const [letters, setLetters] = useState<AdmFundRequestLetter[]>([]);
  const [funds, setFunds] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [letterDate, setLetterDate] = useState(getTodayDateStringIST());
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<AdmFundRequestLetterStatus>('pending');
  const [fundId, setFundId] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!beneficiaryServiceId) return;
    try {
      setLoading(true);
      const [lettersRes, fundsRes] = await Promise.all([
        fetch(
          `/api/adm/fund-request-letters?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`,
          { signal },
        ),
        fetch('/api/adm/fund-request-letters/options', { signal }),
      ]);
      if (!lettersRes.ok) throw new Error('Failed to load request letters');
      const letterRows = (await lettersRes.json()) as AdmFundRequestLetter[];
      setLetters(letterRows);
      if (fundsRes.ok) {
        const fundRows = (await fundsRes.json()) as Array<{
          id: string;
          label: string;
        }>;
        setFunds(fundRows);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error(t('adm.fundRequestLetters.failedToLoad'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beneficiaryServiceId]);

  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setLetterDate(getTodayDateStringIST());
    setFile(null);
    setStatus('pending');
    setFundId('');
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [open, defaultTitle, load]);

  const applyFundChange = (value: string) => {
    const nextFundId = value === NO_FUND ? '' : value;
    setFundId(nextFundId);
    if (nextFundId && status === 'pending') setStatus('linked');
    if (!nextFundId && fundRequestLetterStatusRequiresFund(status)) {
      setStatus('pending');
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error(t('adm.fundRequestLetters.titleRequired'));
      return;
    }
    if (!letterDate) {
      toast.error(t('adm.fundRequestLetters.dateRequired'));
      return;
    }
    if (!file) {
      toast.error(t('adm.fundRequestLetters.fileRequired'));
      return;
    }
    if (fundRequestLetterStatusRequiresFund(status) && !fundId) {
      toast.error(t('adm.fundRequestLetters.fundRequired'));
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('letterDate', letterDate);
      formData.append('status', status);
      formData.append('beneficiaryServiceId', beneficiaryServiceId);
      if (fundId) formData.append('fundRecordId', fundId);

      const response = await fetch('/api/adm/fund-request-letters', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload');
      }
      toast.success(t('adm.fundRequestLetters.uploadedSuccess'));
      setFile(null);
      setStatus('pending');
      setFundId('');
      await load();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('taskManagement.dialog.requestLettersPending')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                {t('adm.fundRequestLetters.loading')}
              </p>
            ) : letters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('taskManagement.dialog.noRequestLetters')}
              </p>
            ) : (
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {letters.map((letter) => (
                  <li
                    key={letter.id}
                    className="flex min-w-0 flex-col gap-1 rounded-md border p-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-medium">
                        {letter.title}
                      </p>
                      <Badge variant="outline">
                        {t(`adm.fundRequestLetters.status.${letter.status}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDisplayDateIST(letter.letterDate)}
                      {letter.fundLabel ? ` · ${letter.fundLabel}` : ''}
                    </p>
                    <a
                      href={`/api/adm/fund-request-letters/${letter.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 text-blue-600 hover:underline"
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {letter.fileName || t('adm.fundRequestLetters.viewPdf')}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="frl-date">{t('adm.fundRequestLetters.date')}</Label>
            <DmyDateInput
              id="frl-date"
              value={letterDate}
              onChange={(event) => setLetterDate(event.target.value)}
              className="min-h-11 w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frl-title">{t('adm.fundRequestLetters.title')}</Label>
            <Input
              id="frl-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-11 w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frl-file">{t('adm.fundRequestLetters.document')}</Label>
            <Input
              id="frl-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="min-h-11 w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('adm.fundRequestLetters.fileHint')}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t('adm.fundRequestLetters.statusLabel')}</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as AdmFundRequestLetterStatus)
              }
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADM_FUND_REQUEST_LETTER_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`adm.fundRequestLetters.status.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t('adm.fundRequestLetters.fund')}</Label>
            <Select value={fundId || NO_FUND} onValueChange={applyFundChange}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
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
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t('adm.cancel')}
          </Button>
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            onClick={() => void handleUpload()}
            disabled={saving}
          >
            {saving ? t('adm.uploading') : t('adm.fundRequestLetters.upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
