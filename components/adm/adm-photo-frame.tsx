'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

interface AdmPhotoFrameProps {
  label: string;
  photoUrl: string | null;
  photoName: string | null;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

export function AdmPhotoFrame({
  label,
  photoUrl,
  photoName,
  uploading,
  onUpload,
  onRemove,
}: AdmPhotoFrameProps) {
  const { t } = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      await onUpload(file);
    },
    [onUpload],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) await handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div
        className={cn(
          'relative flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed p-3 transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
          photoUrl && 'border-solid',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : photoUrl ? (
          <div className="flex w-full flex-col items-center gap-2">
            <div className="relative h-20 w-full overflow-hidden rounded-md">
              <Image
                src={photoUrl}
                alt={photoName ?? label}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            {photoName && (
              <p className="max-w-full truncate text-xs text-muted-foreground">{photoName}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('adm.photosReplace')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-9"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="flex min-h-20 w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">{t('adm.photosUpload')}</span>
            <Upload className="h-4 w-4" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await handleFile(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
