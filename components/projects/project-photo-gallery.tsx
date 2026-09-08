'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

function imageFilesFromList(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((file) => file.type.startsWith('image/'));
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
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const PreviewIcon = previewOpen ? EyeOff : Eye;

  const addFiles = useCallback(
    async (files: File[]) => {
      if (uploading || files.length === 0) return;
      await onUpload(files);
      setPreviewOpen(true);
    },
    [onUpload, uploading],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (uploading) return;
      dragCountRef.current += 1;
      if (e.dataTransfer.types.includes('Files')) {
        setDragActive(true);
      }
    },
    [uploading],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = uploading ? 'none' : 'copy';
    },
    [uploading],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current = Math.max(0, dragCountRef.current - 1);
    if (dragCountRef.current === 0) {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCountRef.current = 0;
      setDragActive(false);
      if (uploading) return;
      await addFiles(imageFilesFromList(e.dataTransfer.files));
    },
    [addFiles, uploading],
  );

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
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed p-4 text-center transition-colors',
          photos.length === 0 ? 'min-h-24' : 'min-h-16',
          dragActive
            ? 'border-primary bg-primary/10'
            : 'border-border bg-muted/20 hover:border-primary/50',
        )}
      >
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
        {photos.length === 0 ? (
          <p className="text-sm font-medium text-muted-foreground">
            {emptyLabel}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">{dropLabel}</p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          await addFiles(imageFilesFromList(e.target.files));
          e.target.value = '';
        }}
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
