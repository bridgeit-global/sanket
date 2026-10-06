'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileUploadZone } from '@/components/ui/file-upload-zone';

export type ProjectPhotoItem = {
  id: string;
  fileUrl: string;
  fileName: string;
};

interface ProjectPhotoGalleryProps {
  photos: ProjectPhotoItem[];
  uploading: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpen: (photo: ProjectPhotoItem) => void;
  emptyLabel: string;
  dropLabel: string;
  deleteAriaLabel: string;
  hideLabel: string;
  showLabel: string;
  title?: string;
  titleClassName?: string;
}

export function ProjectPhotoGallery({
  photos,
  uploading,
  onUpload,
  onDelete,
  onOpen,
  emptyLabel,
  dropLabel,
  deleteAriaLabel,
  hideLabel,
  showLabel,
  title,
  titleClassName = 'text-sm font-medium',
}: ProjectPhotoGalleryProps) {
  const [previewOpen, setPreviewOpen] = useState(true);
  const PreviewIcon = previewOpen ? EyeOff : Eye;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {title ? (
          <p className={titleClassName}>
            {title}
            {!previewOpen && photos.length > 0 ? ` (${photos.length})` : ''}
          </p>
        ) : null}
        {photos.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 w-full sm:min-h-9 sm:w-auto"
            onClick={() => setPreviewOpen((open) => !open)}
            aria-pressed={previewOpen}
            aria-label={previewOpen ? hideLabel : showLabel}
          >
            <PreviewIcon className="mr-1 h-3.5 w-3.5" />
            {previewOpen ? hideLabel : showLabel}
          </Button>
        ) : null}
      </div>
      <FileUploadZone
        multiple
        disabled={uploading}
        onUpload={async (files) => {
          await onUpload(files);
          setPreviewOpen(true);
        }}
        validation={{
          accept: 'image/jpeg,image/png,image/gif,image/webp',
          maxSizeBytes: 10 * 1024 * 1024,
        }}
        icon={ImageIcon}
        title={photos.length === 0 ? emptyLabel : 'Add more photos'}
        description={dropLabel}
        hint="JPEG, PNG, GIF, or WEBP images (maximum 10 MB each)"
      />
      {previewOpen && photos.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="overflow-hidden rounded-md border border-border"
            >
              <button
                type="button"
                className="relative block aspect-[4/3] w-full bg-muted/40"
                onClick={() => onOpen(photo)}
                aria-label={photo.fileName}
              >
                <Image
                  src={photo.fileUrl}
                  alt={photo.fileName}
                  fill
                  className="object-contain"
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </button>
              <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5">
                <p className="min-w-0 truncate text-xs text-muted-foreground">
                  {photo.fileName}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-9 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => onDelete(photo.id)}
                  aria-label={deleteAriaLabel}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
