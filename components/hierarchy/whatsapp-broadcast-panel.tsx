'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useTranslations } from '@/hooks/use-translations';
import type { CadreWhatsAppMessageImage } from '@/lib/db/schema';
import type { CadreConfig } from '@/lib/hierarchy/types';
import {
  buildBroadcastTargetOptions,
  type BroadcastTarget,
  type BroadcastTargetOption,
} from '@/lib/hierarchy/broadcast-target';
import { cn } from '@/lib/utils';
import { WhatsAppComposeFields } from './whatsapp-compose-fields';

type BroadcastHistoryItem = {
  id: string;
  message: string;
  targetLabel: string;
  recipientCount: number;
  skippedNoWhatsapp: number;
  createdAt: string;
  pendingCount: number;
  successCount: number;
  failureCount: number;
};

interface WhatsAppBroadcastPanelProps {
  config: CadreConfig;
  constituencyId: string;
  constituencyLabel?: string;
  verticalId?: string;
  wardGeoId?: string;
  boothNo?: string;
  positionId?: string;
  boothNumbers?: string[];
  canSend: boolean;
}

function buildPreviewQuery(target: BroadcastTarget): string {
  const params = new URLSearchParams();
  if (target.constituencyId) params.set('constituencyId', target.constituencyId);
  if (target.verticalId) params.set('verticalId', target.verticalId);
  if (target.wardGeoId) params.set('wardGeoId', target.wardGeoId);
  if (target.boothNo) params.set('boothNo', target.boothNo);
  if (target.positionId) params.set('positionId', target.positionId);
  return params.toString();
}

function formatBroadcastStatus(item: BroadcastHistoryItem): string {
  const sent = item.successCount;
  const total = item.recipientCount;
  if (item.pendingCount > 0) {
    return `${sent}/${total} sent · ${item.pendingCount} pending`;
  }
  if (item.failureCount > 0) {
    return `${sent}/${total} sent · ${item.failureCount} failed`;
  }
  return `${sent}/${total} sent`;
}

export function WhatsAppBroadcastPanel({
  config,
  constituencyId,
  constituencyLabel = 'AC 172',
  verticalId,
  wardGeoId,
  boothNo,
  positionId,
  boothNumbers,
  canSend,
}: WhatsAppBroadcastPanelProps) {
  const { t } = useTranslations();
  const [draft, setDraft] = useState('');
  const [images, setImages] = useState<CadreWhatsAppMessageImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [skippedNoWhatsapp, setSkippedNoWhatsapp] = useState(0);
  const [previewLabel, setPreviewLabel] = useState('');
  const [broadcasts, setBroadcasts] = useState<BroadcastHistoryItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const targetOptions = useMemo(
    () =>
      buildBroadcastTargetOptions({
        config,
        constituencyId,
        constituencyLabel,
        verticalId,
        wardGeoId,
        boothNo,
        positionId,
        boothNumbers,
      }),
    [
      config,
      constituencyId,
      constituencyLabel,
      verticalId,
      wardGeoId,
      boothNo,
      positionId,
      boothNumbers,
    ],
  );

  const [selectedOptionId, setSelectedOptionId] = useState('');

  useEffect(() => {
    if (targetOptions.length === 0) {
      setSelectedOptionId('');
      return;
    }
    setSelectedOptionId((current) =>
      targetOptions.some((option) => option.id === current)
        ? current
        : targetOptions[0].id,
    );
  }, [targetOptions]);

  const selectedOption: BroadcastTargetOption | null =
    targetOptions.find((option) => option.id === selectedOptionId) ??
    targetOptions[0] ??
    null;

  const loadPreview = useCallback(async () => {
    if (!selectedOption) {
      setRecipientCount(null);
      setSkippedNoWhatsapp(0);
      setPreviewLabel('');
      return;
    }

    setLoadingPreview(true);
    try {
      const query = buildPreviewQuery(selectedOption.target);
      const res = await fetch(`/api/hierarchy/whatsapp-broadcasts/preview?${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load preview');
      setRecipientCount(data.recipientCount ?? 0);
      setSkippedNoWhatsapp(data.skippedNoWhatsapp ?? 0);
      setPreviewLabel(data.targetLabel ?? selectedOption.label);
    } catch (error) {
      setRecipientCount(null);
      setSkippedNoWhatsapp(0);
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Failed to load preview',
      });
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedOption]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/hierarchy/whatsapp-broadcasts?limit=10');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load broadcasts');
      setBroadcasts(data.broadcasts ?? []);
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Failed to load broadcasts',
      });
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const canQueue = Boolean(
    selectedOption &&
      (draft.trim() || images.length > 0) &&
      recipientCount !== null &&
      recipientCount > 0,
  );

  const sendBroadcast = async () => {
    if (!selectedOption || !canQueue) return;
    setSending(true);
    try {
      const res = await fetch('/api/hierarchy/whatsapp-broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: selectedOption.target,
          targetLabel: previewLabel || selectedOption.label,
          message: draft.trim(),
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to queue broadcast');
      setDraft('');
      setImages([]);
      toast({
        type: 'success',
        description: t('hierarchyModule.whatsappBroadcastQueued', {
          count: data.broadcast?.recipientCount ?? recipientCount ?? 0,
        }),
      });
      await Promise.all([loadPreview(), loadHistory()]);
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Failed to queue broadcast',
      });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  const handleQueueClick = () => {
    if (!canQueue) return;
    setConfirmOpen(true);
  };

  if (targetOptions.length === 0) return null;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 dark:border-primary/50 dark:bg-primary/10">
      <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {t('hierarchyModule.whatsappBroadcastTitle')}
      </p>

      <div className="mt-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t('hierarchyModule.whatsappBroadcastTargetLabel')}
          </Label>
          <Select
            value={selectedOptionId}
            onValueChange={setSelectedOptionId}
            disabled={!canSend || sending}
          >
            <SelectTrigger className="h-10 rounded-lg bg-background text-sm">
              <SelectValue placeholder={t('hierarchyModule.whatsappBroadcastTargetPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs text-muted-foreground">
          {loadingPreview ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              {t('hierarchyModule.whatsappBroadcastPreviewLoading')}
            </span>
          ) : recipientCount === null ? (
            t('hierarchyModule.whatsappBroadcastPreviewUnavailable')
          ) : (
            <span>
              {t('hierarchyModule.whatsappBroadcastPreview', {
                count: recipientCount,
                skipped: skippedNoWhatsapp,
              })}
            </span>
          )}
        </div>

        {canSend ? (
          <WhatsAppComposeFields
            draft={draft}
            onDraftChange={setDraft}
            images={images}
            onImagesChange={setImages}
            uploading={uploading}
            sending={sending}
            onUploadingChange={setUploading}
            onUploadError={(description) => toast({ type: 'error', description })}
            messageLabel={t('hierarchyModule.whatsappBroadcastMessageLabel')}
            messagePlaceholder={t('hierarchyModule.whatsappMessagePlaceholder')}
            addImageLabel={t('hierarchyModule.whatsappAddImage')}
            uploadingLabel={t('hierarchyModule.whatsappUploading')}
            removeImageLabel={t('hierarchyModule.whatsappRemoveImage')}
            queueLabel={t('hierarchyModule.whatsappBroadcastQueue')}
            queueingLabel={t('hierarchyModule.whatsappBroadcastQueueing')}
            canQueue={canQueue}
            onQueue={handleQueueClick}
          />
        ) : null}
      </div>

      <div className="mt-4 space-y-2 border-t border-primary/10 pt-3">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {t('hierarchyModule.whatsappBroadcastHistoryTitle')}
        </p>
        {loadingHistory ? (
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : broadcasts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('hierarchyModule.whatsappBroadcastHistoryEmpty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {broadcasts.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-background/80 px-3 py-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium">{item.targetLabel}</p>
                    {item.message ? (
                      <p className="line-clamp-2 whitespace-pre-wrap text-muted-foreground">
                        {item.message}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      item.pendingCount > 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                        : item.failureCount > 0
                          ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
                    )}
                  >
                    {formatBroadcastStatus(item)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('hierarchyModule.whatsappBroadcastConfirmTitle')}
        description={t('hierarchyModule.whatsappBroadcastConfirmDescription', {
          label: previewLabel || selectedOption?.label || '',
          count: recipientCount ?? 0,
        })}
        confirmText={t('hierarchyModule.whatsappBroadcastConfirmAction')}
        cancelText={t('common.cancel')}
        onConfirm={() => void sendBroadcast()}
      />
    </div>
  );
}
