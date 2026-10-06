'use client';

import * as React from 'react';
import { Upload, Loader2, X, FileText, Image, File as GenericFileIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/toast';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function isFileTypeAccepted(file: File, accept?: string | string[]): boolean {
  if (!accept) return true;
  const tokens = (Array.isArray(accept) ? accept : accept.split(','))
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) return true;

  const fileName = file.name.toLowerCase();
  const mimeType = (file.type || '').toLowerCase();

  for (const token of tokens) {
    if (token.startsWith('.')) {
      if (fileName.endsWith(token)) return true;
    } else if (token.endsWith('/*')) {
      const typePrefix = token.slice(0, -1); // e.g. "image/"
      if (mimeType.startsWith(typePrefix)) return true;
    } else if (mimeType && mimeType === token) {
      return true;
    }
  }

  return false;
}

export interface FileValidationOptions {
  /** Accepted extensions or MIME types (e.g., ".pdf,.jpg" or ["image/*", ".pdf"]) */
  accept?: string | string[];
  /** Maximum allowed size in bytes (e.g. 10 * 1024 * 1024 for 10MB) */
  maxSizeBytes?: number;
  /** Custom validation function returning error message or null */
  customValidate?: (file: File) => string | null;
}

export interface FileUploadZoneProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'onError' | 'title'> {
  /** Callback fired when valid files are selected or dropped */
  onFilesSelected?: (files: File[]) => void;
  /** Async upload callback. If provided, component automatically manages loading state during execution */
  onUpload?: (files: File[]) => Promise<void>;
  /** Callback fired when a file fails validation or upload fails */
  onError?: (errorMessage: string, file?: File) => void;
  /** Allow multiple files selection */
  multiple?: boolean;
  /** Validation rules (accept pattern, max size) */
  validation?: FileValidationOptions;
  /** Disabled state */
  disabled?: boolean;
  /** Controlled value of selected files */
  value?: File[];
  /** Callback for updating selected files list */
  onValueChange?: (files: File[]) => void;
  /** Icon component (defaults to Lucide Upload) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Primary title text (e.g. "Drop files here or click to upload") */
  title?: React.ReactNode;
  /** Secondary description text (e.g. "PDF, Images, Word, Excel, Text (max 10MB)") */
  description?: React.ReactNode;
  /** Additional helper hint below description */
  hint?: React.ReactNode;
  /** Explicit loading/uploading state */
  isUploading?: boolean;
  /** Upload progress percentage (0 to 100) */
  uploadProgress?: number;
  /** Render the selected file list below the upload zone */
  showFileList?: boolean;
  /** Compact style mode */
  compact?: boolean;
}

export const FileUploadZone = React.forwardRef<HTMLInputElement, FileUploadZoneProps>(
  (
    {
      className,
      onFilesSelected,
      onUpload,
      onError,
      multiple = false,
      validation = {},
      disabled = false,
      value = [],
      onValueChange,
      icon: Icon = Upload,
      title = 'Drop files here or click to upload',
      description,
      hint,
      isUploading: propIsUploading,
      uploadProgress,
      showFileList = false,
      compact = false,
      ...props
    },
    ref,
  ) => {
    const internalInputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => internalInputRef.current!);

    const [isDragActive, setIsDragActive] = React.useState(false);
    const [internalUploading, setInternalUploading] = React.useState(false);
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const dragCounter = React.useRef(0);

    const isUploading = propIsUploading ?? internalUploading;

    const acceptAttribute = React.useMemo(() => {
      if (!validation.accept) return undefined;
      return Array.isArray(validation.accept)
        ? validation.accept.join(',')
        : validation.accept;
    }, [validation.accept]);

    const validateFile = (file: File): string | null => {
      if (validation.maxSizeBytes && file.size > validation.maxSizeBytes) {
        const sizeLimitFormatted = formatBytes(validation.maxSizeBytes);
        return `This file is too large. The maximum size is ${sizeLimitFormatted}.`;
      }
      if (validation.accept && !isFileTypeAccepted(file, validation.accept)) {
        return "This file type isn't supported.";
      }
      if (validation.customValidate) {
        return validation.customValidate(file);
      }
      return null;
    };

    const processFiles = async (fileList: FileList | File[]) => {
      if (disabled || isUploading) return;
      setValidationError(null);
      const incoming = Array.from(fileList);
      if (incoming.length === 0) return;

      const validFiles: File[] = [];
      let firstError: string | null = null;

      for (const file of incoming) {
        const err = validateFile(file);
        if (err) {
          if (!firstError) firstError = `${file.name}: ${err}`;
          onError?.(err, file);
        } else {
          validFiles.push(file);
        }
      }

      if (firstError) {
        setValidationError(firstError);
        toast.error(firstError);
      }

      if (validFiles.length > 0) {
        const filesToProcess = multiple ? validFiles : [validFiles[0]];
        const nextFiles = multiple ? [...value, ...filesToProcess] : filesToProcess;
        onValueChange?.(nextFiles);
        onFilesSelected?.(filesToProcess);

        if (onUpload) {
          setInternalUploading(true);
          try {
            await onUpload(filesToProcess);
          } catch (uploadErr) {
            const msg =
              uploadErr instanceof Error
                ? uploadErr.message
                : 'Upload failed. Please try again.';
            onError?.(msg);
            toast.error(msg);
          } finally {
            setInternalUploading(false);
          }
        }
      }
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
        setIsDragActive(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
        setIsDragActive(false);
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      dragCounter.current = 0;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void processFiles(e.dataTransfer.files);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void processFiles(e.target.files);
        e.target.value = '';
      }
    };

    const removeFile = (index: number) => {
      const next = value.filter((_, i) => i !== index);
      onValueChange?.(next);
    };

    const getFileIcon = (fileName: string) => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext || '')) {
        return <Image className="h-4 w-4 text-blue-400 shrink-0" />;
      }
      if (ext === 'pdf') {
        return <FileText className="h-4 w-4 text-rose-400 shrink-0" />;
      }
      return <GenericFileIcon className="h-4 w-4 text-muted-foreground shrink-0" />;
    };

    return (
      <div className="w-full space-y-3">
        <div
          tabIndex={disabled || isUploading ? -1 : 0}
          role="button"
          aria-disabled={disabled || isUploading}
          aria-label={typeof title === 'string' ? title : 'Upload file zone'}
          onKeyDown={(e) => {
            if (
              (e.key === 'Enter' || e.key === ' ') &&
              !disabled &&
              !isUploading
            ) {
              e.preventDefault();
              internalInputRef.current?.click();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isUploading) {
              internalInputRef.current?.click();
            }
          }}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            compact ? 'p-4 min-h-[110px]' : 'p-6 sm:p-8 min-h-[150px]',
            isDragActive
              ? 'border-primary bg-primary/10 scale-[0.99]'
              : 'border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/30',
            disabled || isUploading
              ? 'opacity-60 cursor-not-allowed pointer-events-none'
              : 'cursor-pointer',
            className,
          )}
          {...props}
        >
          <input
            ref={internalInputRef}
            type="file"
            multiple={multiple}
            accept={acceptAttribute}
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled || isUploading}
            tabIndex={-1}
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Uploading...</p>
              {typeof uploadProgress === 'number' && (
                <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
              <div className="rounded-full bg-muted/50 p-2.5 text-muted-foreground">
                <Icon className={cn('text-muted-foreground/80', compact ? 'h-6 w-6' : 'h-8 w-8')} />
              </div>
              <p className="text-sm font-semibold text-foreground tracking-tight">{title}</p>
              {description && (
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>
              )}
              {hint && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{hint}</p>}
            </div>
          )}
        </div>

        {validationError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Selected Files List (when controlled) */}
        {showFileList && value.length > 0 && (
          <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {value.map((file, idx) => (
              <li
                key={`${file.name}-${file.size}-${idx}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card/60 p-2 text-xs transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {getFileIcon(file.name)}
                  <span className="truncate font-medium text-foreground">{file.name}</span>
                  <span className="shrink-0 text-muted-foreground/70">
                    ({formatBytes(file.size)})
                  </span>
                </div>
                {!disabled && !isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);

FileUploadZone.displayName = 'FileUploadZone';
