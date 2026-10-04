'use client';

import { useEffect, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilePreviewDialog } from '@/components/file-preview-dialog';
import { toast } from '@/components/toast';
import { withMimeType } from '@/lib/file-preview';
import { cn } from '@/lib/utils';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';

export type FilePreviewOpenPayload = {
  previewUrl: string;
  sourceUrl: string;
  fileName: string;
};

export type FilePreviewButtonProps = {
  fileUrl: string | null | undefined;
  fileName: string;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  disabled?: boolean;
  /**
   * When set, parent owns the preview dialog (avoids nested-dialog issues).
   * Caller must revoke `previewUrl` when the preview closes.
   */
  onPreviewOpen?: (payload: FilePreviewOpenPayload) => void;
};

export function FilePreviewButton({
  fileUrl,
  fileName,
  className,
  variant = 'ghost',
  size = 'icon',
  disabled,
  onPreviewOpen,
}: FilePreviewButtonProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }
  };

  const handleClick = async () => {
    if (!fileUrl) {
      toast.error('File URL not available');
      return;
    }

    // Always fetch a typed blob and preview in-app. Opening the remote URL in a
    // new tab on mobile often lands on a blank/same app page (auth, attachment
    // disposition, or SPA routing) instead of the PDF viewer.
    setLoading(true);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = withMimeType(await response.blob(), fileName);
      const objectUrl = URL.createObjectURL(blob);
      if (onPreviewOpen) {
        onPreviewOpen({
          previewUrl: objectUrl,
          sourceUrl: fileUrl,
          fileName,
        });
      } else {
        setPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return objectUrl;
        });
        setOpen(true);
      }
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to open document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn(size === 'icon' && 'h-8 w-8', className)}
        onClick={handleClick}
        disabled={disabled || loading || !fileUrl}
        title="Preview"
        aria-label={`Preview ${fileName}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
      {!onPreviewOpen ? (
        <FilePreviewDialog
          open={open}
          onOpenChange={handleOpenChange}
          fileName={fileName}
          fileUrl={previewUrl}
          sourceUrl={fileUrl}
        />
      ) : null}
    </>
  );
}
