'use client';

import { useRef } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CadreWhatsAppMessageImage } from '@/lib/db/schema';

interface WhatsAppComposeFieldsProps {
  draft: string;
  onDraftChange: (value: string) => void;
  images: CadreWhatsAppMessageImage[];
  onImagesChange: (images: CadreWhatsAppMessageImage[]) => void;
  uploading: boolean;
  sending: boolean;
  onUploadingChange: (uploading: boolean) => void;
  onUploadError: (message: string) => void;
  messageLabel: string;
  messagePlaceholder: string;
  addImageLabel: string;
  uploadingLabel: string;
  removeImageLabel: string;
  queueLabel: string;
  queueingLabel: string;
  canQueue: boolean;
  onQueue: () => void;
}

export function WhatsAppComposeFields({
  draft,
  onDraftChange,
  images,
  onImagesChange,
  uploading,
  sending,
  onUploadingChange,
  onUploadError,
  messageLabel,
  messagePlaceholder,
  addImageLabel,
  uploadingLabel,
  removeImageLabel,
  queueLabel,
  queueingLabel,
  canQueue,
  onQueue,
}: WhatsAppComposeFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    onUploadingChange(true);
    try {
      const uploaded: CadreWhatsAppMessageImage[] = [];
      for (const file of files) {
        uploaded.push(await uploadImage(file));
      }
      onImagesChange([...images, ...uploaded]);
    } catch (error) {
      onUploadError(
        error instanceof Error ? error.message : 'Failed to upload image',
      );
    } finally {
      onUploadingChange(false);
    }
  };

  const removeImage = (url: string) => {
    onImagesChange(images.filter((image) => image.url !== url));
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{messageLabel}</Label>
      <Textarea
        rows={3}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        placeholder={messagePlaceholder}
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
                aria-label={removeImageLabel}
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
              {uploadingLabel}
            </>
          ) : (
            <>
              <ImagePlus className="mr-1.5 size-3.5" />
              {addImageLabel}
            </>
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canQueue || sending || uploading}
          onClick={onQueue}
        >
          {sending ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              {queueingLabel}
            </>
          ) : (
            queueLabel
          )}
        </Button>
      </div>
    </div>
  );
}
