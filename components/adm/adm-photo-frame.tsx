'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUploadZone } from '@/components/ui/file-upload-zone';
import { useTranslations } from '@/hooks/use-translations';

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
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {photoUrl ? (
        <div className="relative flex min-h-28 flex-col items-center justify-center rounded-lg border border-border p-3">
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
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <FileUploadZone
              compact
              multiple={false}
              isUploading={uploading}
              onUpload={async (files) => {
                const file = files[0];
                if (file) await onUpload(file);
              }}
              validation={{
                accept: 'image/jpeg,image/png,image/gif,image/webp',
              }}
              title={t('adm.photosReplace')}
              description={photoName ?? undefined}
            />
          </div>
        </div>
      ) : (
        <FileUploadZone
          multiple={false}
          isUploading={uploading}
          onUpload={async (files) => {
            const file = files[0];
            if (file) await onUpload(file);
          }}
          validation={{
            accept: 'image/jpeg,image/png,image/gif,image/webp',
          }}
          title={t('adm.photosUpload')}
          description="JPEG, PNG, GIF, or WEBP images"
        />
      )}
    </div>
  );
}
