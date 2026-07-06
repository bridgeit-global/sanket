'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/toast';
import { useTranslations } from '@/hooks/use-translations';
import type {
  CadreWhatsAppMessageImage,
  CadreWhatsAppMessageStatus,
} from '@/lib/db/schema';
import { cn } from '@/lib/utils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/hierarchy/whatsapp-messages/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Failed to upload image');
    return data.image as CadreWhatsAppMessageImage;
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded: CadreWhatsAppMessageImage[] = [];
      for (const file of files) {
        uploaded.push(await uploadImage(file));
      }
      setImages((prev) => [...prev, ...uploaded]);
    } catch (error) {
      toast({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Failed to upload image',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((image) => image.url !== url));
  };

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
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t('hierarchyModule.whatsappMessageLabel')}
          </Label>
          <Textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('hierarchyModule.whatsappMessagePlaceholder')}
            className="min-h-[72px] resize-y text-sm"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />

          {images.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {images.map((image) => (
                <li key={image.url} className="relative">
                  <img
                    src={image.url}
                    alt={image.fileName}
                    className="size-16 rounded-md border border-border object-cover"
                  />
                  <button
                    type="button"
                    className="absolute -top-1.5 -right-1.5 rounded-full border border-border bg-background p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={t('hierarchyModule.whatsappRemoveImage')}
                    onClick={() => removeImage(image.url)}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading || sending}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  {t('hierarchyModule.whatsappUploading')}
                </>
              ) : (
                <>
                  <ImagePlus className="mr-1.5 size-3.5" />
                  {t('hierarchyModule.whatsappAddImage')}
                </>
              )}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canQueue || sending || uploading}
              onClick={sendMessage}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  {t('hierarchyModule.whatsappQueueing')}
                </>
              ) : (
                t('hierarchyModule.whatsappQueue')
              )}
            </Button>
          </div>
        </div>
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
