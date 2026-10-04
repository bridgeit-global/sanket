'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Upload,
  File,
  FileText,
  Image,
  Trash2,
  Download,
  Printer,
  Eye,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/components/toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface Attachment {
  id: string;
  fileName: string;
  fileSizeKb: number;
  fileUrl: string | null;
  createdAt: string;
}

interface RegisterAttachmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: string;
  entrySubject: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  canDeleteAttachments?: boolean;
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const;

function getFileExt(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function isImageFile(fileName: string) {
  return (IMAGE_EXTS as readonly string[]).includes(getFileExt(fileName));
}

function isPdfFile(fileName: string) {
  return getFileExt(fileName) === 'pdf';
}

function canPreviewInline(fileName: string) {
  const ext = getFileExt(fileName);
  return [...IMAGE_EXTS, 'pdf', 'txt'].includes(ext);
}

/** Ensure the blob has a MIME type mobile browsers need to open the file. */
function withMimeType(blob: Blob, fileName: string): Blob {
  if (blob.type && blob.type !== 'application/octet-stream') {
    return blob;
  }
  const ext = getFileExt(fileName);
  const mimeByExt: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
  };
  const mime = mimeByExt[ext];
  return mime ? new Blob([blob], { type: mime }) : blob;
}

export function RegisterAttachmentDialog({
  open,
  onOpenChange,
  entryId,
  entrySubject,
  attachments,
  onAttachmentsChange,
  canDeleteAttachments = true,
}: RegisterAttachmentDialogProps) {
  const isMobile = useIsMobile();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inline preview state - previewing in-app avoids opening browser tabs.
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Revoke the object URL when the preview closes or the component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        await uploadFiles(Array.from(files));
      }
    },
    [entryId],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFiles(Array.from(files));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/register/${entryId}/attachments`, {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          successCount++;
        } else {
          const data = await response.json();
          toast.error(`Failed to upload ${file.name}: ${data.error}`);
          errorCount++;
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(
        `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`,
      );
      onAttachmentsChange();
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setDeleting(attachmentId);
    try {
      const response = await fetch(
        `/api/register/${entryId}/attachments?attachmentId=${attachmentId}`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        toast.success('Attachment deleted');
        onAttachmentsChange();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete attachment');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete attachment');
    } finally {
      setDeleting(null);
    }
  };

  const closePreview = (isOpen: boolean) => {
    if (!isOpen) {
      setPreviewAttachment(null);
      setPreviewUrl(null);
    }
  };

  // Preview inline on desktop. On mobile, PDFs cannot render inside iframes
  // (iOS Safari / many Android browsers show a blank frame), so open the
  // native viewer in a new tab instead.
  const handleView = async (attachment: Attachment) => {
    if (!attachment.fileUrl) {
      toast.error('File URL not available');
      return;
    }

    // Prefer the original URL on mobile so the device PDF viewer can load it
    // synchronously from the tap (avoids blank iframes + popup blockers).
    if (isPdfFile(attachment.fileName) && isMobile) {
      const opened = window.open(attachment.fileUrl, '_blank');
      if (opened) return;

      // Popup blocked — fall through to an in-app open/download sheet.
    }

    setOpening(attachment.id);
    try {
      const response = await fetch(attachment.fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = withMimeType(await response.blob(), attachment.fileName);
      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
      setPreviewAttachment(attachment);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to open document');
    } finally {
      setOpening(null);
    }
  };

  const handleOpenPreviewExternally = () => {
    const url = previewAttachment?.fileUrl || previewUrl;
    if (!url) return;
    window.open(url, '_blank');
  };

  const handleDownload = async (attachment: Attachment) => {
    if (!attachment.fileUrl) {
      toast.error('File URL not available');
      return;
    }
    try {
      // Fetch as a blob so the download happens in-place instead of opening a
      // new tab (the `download` attribute is ignored for cross-origin URLs).
      const response = await fetch(attachment.fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: reuse the shared preview tab rather than spawning a new one.
      window.open(attachment.fileUrl, 'attachment-preview');
    }
  };

  // Print via a hidden iframe so nothing opens in a new browser tab.
  const handlePrint = async (attachment: Attachment) => {
    if (!attachment.fileUrl) {
      toast.error('File URL not available');
      return;
    }
    setOpening(attachment.id);
    try {
      const response = await fetch(attachment.fileUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = objectUrl;
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (printError) {
          console.error('Print error:', printError);
        }
        // Clean up after the print dialog has had time to open.
        window.setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(objectUrl);
        }, 60000);
      };
      document.body.appendChild(iframe);
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print document');
    } finally {
      setOpening(null);
    }
  };

  const handlePreviewPrint = () => {
    try {
      previewIframeRef.current?.contentWindow?.focus();
      previewIframeRef.current?.contentWindow?.print();
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (isImageFile(fileName)) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (isPdfFile(fileName)) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const previewIsImage =
    !!previewAttachment && isImageFile(previewAttachment.fileName);
  const previewIsPdf =
    !!previewAttachment && isPdfFile(previewAttachment.fileName);
  // Mobile PDF iframe is unsupported — show open/download actions instead.
  const showMobilePdfFallback = previewIsPdf && isMobile;

  const formatFileSize = (sizeKb: number) => {
    if (sizeKb < 1024) {
      return `${sizeKb} KB`;
    }
    return `${(sizeKb / 1024).toFixed(1)} MB`;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Documents</DialogTitle>
          <DialogDescription className="truncate">
            {entrySubject}
          </DialogDescription>
        </DialogHeader>

        {/* Upload Zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center gap-2 text-center">
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drop files here or click to upload
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Images, Word, Excel, Text (max 10MB)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Attachments List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {attachments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents attached yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                {attachments.length} document{attachments.length !== 1 ? 's' : ''} attached
              </p>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {getFileIcon(attachment.fileName)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.fileSizeKb)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleView(attachment)}
                      disabled={opening === attachment.id}
                      title="View"
                    >
                      {opening === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(attachment)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePrint(attachment)}
                      disabled={opening === attachment.id}
                      title="Print"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {canDeleteAttachments && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(attachment.id)}
                        disabled={deleting === attachment.id}
                        title="Delete"
                      >
                        {deleting === attachment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Inline document preview - keeps everything in-app (no browser tabs) */}
    <Dialog
      open={!!previewAttachment}
      onOpenChange={closePreview}
    >
      <DialogContent className="flex h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 p-0 sm:w-[95vw]">
        <DialogHeader className="shrink-0 border-b p-4 pr-14">
          <DialogTitle className="truncate text-base">
            {previewAttachment?.fileName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Document preview
          </DialogDescription>
          <div className="absolute right-12 top-3.5 flex items-center gap-1">
            {previewAttachment &&
              canPreviewInline(previewAttachment.fileName) &&
              !showMobilePdfFallback && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePreviewPrint}
                  title="Print"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              )}
            {previewAttachment && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(previewAttachment)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 bg-muted/30">
          {previewUrl &&
          previewAttachment &&
          canPreviewInline(previewAttachment.fileName) ? (
            showMobilePdfFallback ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  PDF preview opens in your device&apos;s viewer on mobile.
                </p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={handleOpenPreviewExternally}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => handleDownload(previewAttachment)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            ) : previewIsImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob object URL preview
              <img
                src={previewUrl}
                alt={previewAttachment.fileName}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <iframe
                ref={previewIframeRef}
                src={previewUrl}
                title={previewAttachment.fileName}
                className="h-full w-full border-0"
              />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Preview isn&apos;t available for this file type.
              </p>
              {previewAttachment && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleDownload(previewAttachment)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download to view
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

