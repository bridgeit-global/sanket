'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import type {
  CadreWhatsAppMessageImage,
  CadreWhatsAppMessageStatus,
} from '@/lib/db/schema';
import { cn } from '@/lib/utils';
import { WhatsAppComposeFields } from './whatsapp-compose-fields';

type QueueMessage = {
  id: string;
  message: string;
  images: CadreWhatsAppMessageImage[];
  status: CadreWhatsAppMessageStatus;
  errorMessage: string | null;
  createdAt: string;
};

function statusLabel(status: CadreWhatsAppMessageStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'success':
      return 'Sent';
    case 'failure':
      return 'Failed';
  }
}

function statusClass(status: CadreWhatsAppMessageStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
    case 'failure':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
  }
}

interface WhatsAppMessagePanelProps {
  memberId: string | null;
  whatsappPhone: string | null;
  canSend: boolean;
}

export function WhatsAppMessagePanel({
  memberId,
  whatsappPhone,
  canSend,
}: WhatsAppMessagePanelProps) {
  const { t } = useTranslations();
  const [draft, setDraft] = useState('');
  const [images, setImages] = useState<CadreWhatsAppMessageImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<QueueMessage[]>([]);

  const loadMessages = useCallback(async () => {
    if (!memberId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hierarchy/whatsapp-messages?memberId=${encodeURIComponent(memberId)}&limit=10`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load messages');
      setMessages(data.messages ?? []);
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Failed to load messages',
      });
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const sendMessage = async () => {
    if (!memberId || (!draft.trim() && images.length === 0)) return;
    setSending(true);
    try {
      const res = await fetch('/api/hierarchy/whatsapp-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          message: draft.trim(),
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to queue message');
      setDraft('');
      setImages([]);
      toast({ type: 'success', description: t('hierarchyModule.whatsappQueued') });
      await loadMessages();
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Failed to queue message',
      });
    } finally {
      setSending(false);
    }
  };

  const canQueue = Boolean(memberId && (draft.trim() || images.length > 0));

  if (!whatsappPhone) return null;

  return (
    <div className="mt-3 space-y-3 border-t border-primary/10 pt-3">
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
          messageLabel={t('hierarchyModule.whatsappMessageLabel')}
          messagePlaceholder={t('hierarchyModule.whatsappMessagePlaceholder')}
          addImageLabel={t('hierarchyModule.whatsappAddImage')}
          uploadingLabel={t('hierarchyModule.whatsappUploading')}
          removeImageLabel={t('hierarchyModule.whatsappRemoveImage')}
          queueLabel={t('hierarchyModule.whatsappQueue')}
          queueingLabel={t('hierarchyModule.whatsappQueueing')}
          canQueue={canQueue}
          onQueue={sendMessage}
        />
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {t('hierarchyModule.whatsappQueueTitle')}
        </p>
        {loading ? (
          <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('hierarchyModule.whatsappQueueEmpty')}
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-background/80 px-3 py-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    {item.message ? (
                      <p className="whitespace-pre-wrap">{item.message}</p>
                    ) : null}
                    {item.images.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {item.images.map((image) => (
                          <li key={image.url}>
                            <img
                              src={image.url}
                              alt={image.fileName}
                              className="size-12 rounded border border-border object-cover"
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      statusClass(item.status),
                    )}
                  >
                    {statusLabel(item.status)}
                  </span>
                </div>
                {item.status === 'failure' && item.errorMessage ? (
                  <p className="mt-1 text-[11px] text-destructive">{item.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
