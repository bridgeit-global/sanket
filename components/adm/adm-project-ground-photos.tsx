'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/hooks/use-translations';
import type { AdmProjectGroundPhoto } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

interface AdmProjectGroundPhotosProps {
  beforePhotos: AdmProjectGroundPhoto[];
  afterPhotos: AdmProjectGroundPhoto[];
  className?: string;
}

function PhotoSlot({
  label,
  pendingLabel,
  photos,
  onOpen,
}: {
  label: string;
  pendingLabel: string;
  photos: AdmProjectGroundPhoto[];
  onOpen: (photo: AdmProjectGroundPhoto) => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-3 text-center">
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Badge variant="outline" className="font-normal">
          {pendingLabel}
        </Badge>
      </div>
    );
  }

  const visible = photos.slice(0, 3);
  const remaining = photos.length - visible.length;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">
        {label} ({photos.length})
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {visible.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted/40"
            onClick={() => onOpen(photo)}
            aria-label={photo.fileName}
          >
            <Image
              src={photo.fileUrl}
              alt={photo.fileName}
              fill
              className="object-cover"
              unoptimized
              sizes="96px"
            />
          </button>
        ))}
        {remaining > 0 ? (
          <div className="flex aspect-square items-center justify-center rounded-md border border-border bg-muted/40 text-xs font-medium text-muted-foreground">
            +{remaining}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdmProjectGroundPhotos({
  beforePhotos,
  afterPhotos,
  className,
}: AdmProjectGroundPhotosProps) {
  const { t } = useTranslations();
  const [lightboxPhoto, setLightboxPhoto] =
    useState<AdmProjectGroundPhoto | null>(null);

  return (
    <>
      <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2', className)}>
        <PhotoSlot
          label={t('adm.photosBefore')}
          pendingLabel={t('adm.photosPending')}
          photos={beforePhotos}
          onOpen={setLightboxPhoto}
        />
        <PhotoSlot
          label={t('adm.photosAfter')}
          pendingLabel={t('adm.photosPending')}
          photos={afterPhotos}
          onOpen={setLightboxPhoto}
        />
      </div>

      <Dialog
        open={Boolean(lightboxPhoto)}
        onOpenChange={(open) => {
          if (!open) setLightboxPhoto(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {lightboxPhoto?.fileName ?? t('projects.groundMedia')}
            </DialogTitle>
          </DialogHeader>
          {lightboxPhoto ? (
            <div className="relative mx-auto flex max-h-[75dvh] w-full items-center justify-center bg-muted/30">
              <Image
                src={lightboxPhoto.fileUrl}
                alt={lightboxPhoto.fileName}
                width={1600}
                height={1200}
                className="max-h-[75dvh] w-auto max-w-full object-contain"
                unoptimized
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
