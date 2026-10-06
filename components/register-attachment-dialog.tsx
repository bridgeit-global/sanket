'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  File,
  FileText,
  Image,
  Trash2,
  Download,
  Printer,
  Loader2,
} from 'lucide-react';
import { toast } from '@/components/toast';
import { FilePreviewButton } from '@/components/file-preview-button';
import {
  downloadFileFromUrl,
  isImageFile,
  isPdfFile,
} from '@/lib/file-preview';

import { FileUploadZone } from '@/components/ui/file-upload-zone';

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

export function RegisterAttachmentDialog({
  open,
  onOpenChange,
  entryId,
  entrySubject,
  attachments,
  onAttachmentsChange,
  canDeleteAttachments = true,
}: RegisterAttachmentDialogProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    let successCount = 0;

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
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
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

  const handleDownload = async (attachment: Attachment) => {
    if (!attachment.fileUrl) {
      toast.error('File URL not available');
      return;
    }
    try {
      await downloadFileFromUrl(attachment.fileUrl, attachment.fileName);
    } catch (error) {
      console.error('Download error:', error);
      window.open(attachment.fileUrl, 'attachment-preview');
    }
  };

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

  const getFileIcon = (fileName: string) => {
    if (isImageFile(fileName)) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (isPdfFile(fileName)) {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (sizeKb: number) => {
    if (sizeKb < 1024) {
      return `${sizeKb} KB`;
    }
    return `${(sizeKb / 1024).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Documents</DialogTitle>
          <DialogDescription className="truncate">
            {entrySubject}
          </DialogDescription>
        </DialogHeader>

        <FileUploadZone
          multiple
          isUploading={uploading}
          onUpload={uploadFiles}
          validation={{
            accept: '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt',
            maxSizeBytes: 10 * 1024 * 1024,
          }}
          title="Drop files here or click to upload"
          description="PDF, Images, Word, Excel, Text (max 10MB)"
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          {attachments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents attached yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-2">
                {attachments.length} document
                {attachments.length !== 1 ? 's' : ''} attached
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
                    <FilePreviewButton
                      fileUrl={attachment.fileUrl}
                      fileName={attachment.fileName}
                    />
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
  );
}
