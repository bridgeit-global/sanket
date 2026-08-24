'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ProjectPhotoItem = {
  id: string;
  fileUrl: string;
  fileName: string;
};

interface ProjectPhotoGalleryProps {
  photos: ProjectPhotoItem[];
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpen: (photo: ProjectPhotoItem) => void;
  addLabel: string;
  emptyLabel: string;
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
  addLabel,
  emptyLabel,
  deleteAriaLabel,
  hideLabel,
  showLabel,
  title,
  titleClassName = 'text-sm font-medium',
}: ProjectPhotoGalleryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            onClick={() => setPreviewOpen((open) => !open)}
            aria-pressed={previewOpen}
            aria-label={previewOpen ? hideLabel : showLabel}
          >
            <PreviewIcon className="mr-1 h-3.5 w-3.5" />
            {previewOpen ? hideLabel : showLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {addLabel}
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              await onUpload(file);
              setPreviewOpen(true);
            }
            e.target.value = '';
          }}
        />
      </div>
      {previewOpen ? (
        photos.length === 0 ? (
          <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-4 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {emptyLabel}
            </p>
          </div>
        ) : (
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
        )
      ) : null}
    </div>
  );
}
