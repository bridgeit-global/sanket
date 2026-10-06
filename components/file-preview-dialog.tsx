'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  FileText,
  Minus,
  Plus,
  Printer,
  RotateCcw,
} from 'lucide-react';
import { toast } from '@/components/toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobilePdfCanvas } from '@/components/mobile-pdf-canvas';
import {
  FILE_PREVIEW_ZOOM_MAX,
  FILE_PREVIEW_ZOOM_MIN,
  FILE_PREVIEW_ZOOM_STEP,
  canPreviewInline,
  clampFilePreviewZoom,
  clampFilePreviewZoomContinuous,
  downloadFileFromUrl,
  isImageFile,
  isPdfFile,
  needsCanvasPdfPreview,
  touchDistance,
} from '@/lib/file-preview';
import { cn } from '@/lib/utils';

export type FilePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string | null;
  /** Blob or remote URL currently displayed in the dialog. */
  fileUrl: string | null;
  /** Original remote URL for download / external open (defaults to fileUrl). */
  sourceUrl?: string | null;
};

export function FilePreviewDialog({
  open,
  onOpenChange,
  fileName,
  fileUrl,
  sourceUrl,
}: FilePreviewDialogProps) {
  const isMobile = useIsMobile();
  const [useCanvasPdf, setUseCanvasPdf] = useState(false);
  const [pdfModeReady, setPdfModeReady] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const zoomRootRef = useRef<HTMLDivElement>(null);
  const zoomFactorRef = useRef(1);
  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(
    null,
  );
  const [zoomFactor, setZoomFactor] = useState(1);

  useEffect(() => {
    // Decide once on the client so we never flash a dead iframe on iOS/mobile.
    setUseCanvasPdf(needsCanvasPdfPreview() || window.innerWidth < 768);
    setPdfModeReady(true);
  }, []);

  useEffect(() => {
    if (!pdfModeReady) return;
    setUseCanvasPdf(needsCanvasPdfPreview() || isMobile);
  }, [isMobile, pdfModeReady]);

  const effectiveSourceUrl = sourceUrl || fileUrl;
  const previewIsImage = !!fileName && isImageFile(fileName);
  const previewIsPdf = !!fileName && isPdfFile(fileName);
  // Mobile widths + iOS/iPadOS (iframe/object PDF embedding is unsupported).
  const useMobilePdfCanvas = previewIsPdf && useCanvasPdf;
  const canZoom =
    open && !!fileUrl && !!fileName && canPreviewInline(fileName);
  const zoomPercent = Math.round(zoomFactor * 100);

  const setZoom = useCallback((next: number, snap = false) => {
    const clamped = snap
      ? clampFilePreviewZoom(next)
      : clampFilePreviewZoomContinuous(next);
    zoomFactorRef.current = clamped;
    setZoomFactor(clamped);
  }, []);

  const adjustZoom = useCallback(
    (delta: number) => {
      setZoom(zoomFactorRef.current + delta, true);
    },
    [setZoom],
  );

  const resetZoom = useCallback(() => {
    setZoom(1, true);
  }, [setZoom]);

  useEffect(() => {
    if (!open) {
      resetZoom();
    }
  }, [open, resetZoom]);

  useEffect(() => {
    resetZoom();
  }, [fileName, fileUrl, resetZoom]);

  useLayoutEffect(() => {
    const root = zoomRootRef.current;
    if (!root || !canZoom) return;

    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      adjustZoom(event.deltaY < 0 ? FILE_PREVIEW_ZOOM_STEP : -FILE_PREVIEW_ZOOM_STEP);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        pinchRef.current = null;
        return;
      }
      const distance = touchDistance(event.touches[0], event.touches[1]);
      if (distance < 8) return;
      pinchRef.current = {
        startDistance: distance,
        startZoom: zoomFactorRef.current,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const pinch = pinchRef.current;
      if (!pinch || event.touches.length !== 2) return;
      event.preventDefault();
      const distance = touchDistance(event.touches[0], event.touches[1]);
      if (distance < 8 || pinch.startDistance < 8) return;
      setZoom(pinch.startZoom * (distance / pinch.startDistance));
    };

    const endPinch = () => {
      if (!pinchRef.current) return;
      pinchRef.current = null;
      setZoom(zoomFactorRef.current, true);
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('touchend', endPinch);
    root.addEventListener('touchcancel', endPinch);
    return () => {
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', endPinch);
      root.removeEventListener('touchcancel', endPinch);
    };
  }, [adjustZoom, canZoom, setZoom]);

  const handleDownload = async () => {
    if (!effectiveSourceUrl || !fileName) {
      toast.error('File URL not available');
      return;
    }
    try {
      await downloadFileFromUrl(effectiveSourceUrl, fileName);
    } catch (error) {
      console.error('Download error:', error);
      window.open(effectiveSourceUrl, 'attachment-preview');
    }
  };

  const handleOpenExternally = () => {
    // Prefer the typed blob URL so mobile opens the PDF viewer, not the app page.
    const url = fileUrl || effectiveSourceUrl;
    if (!url) return;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      // Popup blocked — navigate via a temporary anchor (still blob/PDF).
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };

  const handlePrint = () => {
    try {
      if (previewIsImage) {
        const printWindow = window.open('', '_blank');
        if (!printWindow || !fileUrl) return;
        printWindow.document.write(
          `<html><head><title>${fileName ?? 'Print'}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${fileUrl}" style="max-width:100%;height:auto;" /></body></html>`,
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        return;
      }
      previewIframeRef.current?.contentWindow?.focus();
      previewIframeRef.current?.contentWindow?.print();
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[100]"
        className="z-[100] flex h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 p-0 sm:w-[95vw]"
      >
        <DialogHeader className="shrink-0 gap-3 space-y-0 border-b p-4 pr-12 text-left sm:flex-row sm:items-center sm:justify-between">
          <DialogTitle className="min-w-0 truncate pr-2 text-left text-base">
            {fileName ?? 'Document'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Document preview
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-1">
            {canZoom && (
              <div className="mr-1 flex items-center gap-0.5 rounded-md border bg-background p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Zoom out"
                  title="Zoom out"
                  disabled={zoomFactor <= FILE_PREVIEW_ZOOM_MIN + 0.001}
                  onClick={() => adjustZoom(-FILE_PREVIEW_ZOOM_STEP)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span
                  className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-muted-foreground"
                  aria-live="polite"
                >
                  {zoomPercent}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Zoom in"
                  title="Zoom in"
                  disabled={zoomFactor >= FILE_PREVIEW_ZOOM_MAX - 0.001}
                  onClick={() => adjustZoom(FILE_PREVIEW_ZOOM_STEP)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Reset zoom"
                  title="Reset zoom"
                  disabled={Math.abs(zoomFactor - 1) < 0.001}
                  onClick={resetZoom}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            )}
            {canZoom && !useMobilePdfCanvas && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrint}
                title="Print"
                aria-label="Print"
              >
                <Printer className="h-4 w-4" />
              </Button>
            )}
            {fileName && effectiveSourceUrl && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDownload}
                title="Download"
                aria-label="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div
          ref={zoomRootRef}
          className={cn(
            'min-h-0 flex-1 bg-muted/30 touch-pan-x touch-pan-y',
            canZoom ? 'overflow-auto' : 'overflow-hidden',
          )}
        >
          {fileUrl && fileName && canPreviewInline(fileName) ? (
            previewIsPdf && !pdfModeReady ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
                Loading PDF…
              </div>
            ) : useMobilePdfCanvas ? (
              <div
                className="h-full w-full"
                style={{
                  transform: `scale(${zoomFactor})`,
                  transformOrigin: 'top left',
                  width: `${100 / zoomFactor}%`,
                  height: `${100 / zoomFactor}%`,
                }}
              >
                <MobilePdfCanvas
                  fileUrl={fileUrl}
                  fileName={fileName}
                  onOpenExternally={handleOpenExternally}
                />
              </div>
            ) : (
              <div
                className="relative p-2"
                style={{
                  width: `${Math.max(zoomFactor, 1) * 100}%`,
                  height: `${Math.max(zoomFactor, 1) * 100}%`,
                  minWidth: '100%',
                  minHeight: '100%',
                }}
              >
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{
                    transform: `scale(${zoomFactor})`,
                    transformOrigin: 'top left',
                    width: `${100 / zoomFactor}%`,
                    height: `${100 / zoomFactor}%`,
                  }}
                >
                  {previewIsImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- blob/remote preview URL
                    <img
                      src={fileUrl}
                      alt={fileName}
                      className="max-h-full max-w-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <iframe
                      ref={previewIframeRef}
                      src={fileUrl}
                      title={fileName}
                      className="h-full w-full border-0"
                    />
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                Preview isn&apos;t available for this file type.
              </p>
              {fileName && effectiveSourceUrl && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={handleDownload}
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
  );
}
