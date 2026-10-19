'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
  downloadFileFromUrl,
  isImageFile,
  isPdfFile,
  needsCanvasPdfPreview,
} from '@/lib/file-preview';
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformComponent,
  type ReactZoomPanPinchContextState,
} from 'react-zoom-pan-pinch';

export type FilePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string | null;
  /** Blob or remote URL currently displayed in the dialog. */
  fileUrl: string | null;
  /** Original remote URL for download / external open (defaults to fileUrl). */
  sourceUrl?: string | null;
};

function selectPreviewScale(context: ReactZoomPanPinchContextState) {
  return context.state.scale;
}

function ImageZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const scale = useTransformComponent(selectPreviewScale);
  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="mr-1 flex items-center gap-0.5 rounded-md border bg-background p-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Zoom out"
        title="Zoom out"
        disabled={scale <= FILE_PREVIEW_ZOOM_MIN + 0.001}
        onClick={() => {
          void zoomOut(FILE_PREVIEW_ZOOM_STEP);
        }}
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
        disabled={scale >= FILE_PREVIEW_ZOOM_MAX - 0.001}
        onClick={() => {
          void zoomIn(FILE_PREVIEW_ZOOM_STEP);
        }}
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
        disabled={Math.abs(scale - 1) < 0.001}
        onClick={() => {
          void resetTransform();
        }}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}

function MobilePdfStage({
  fileUrl,
  fileName,
  open,
  onError,
  onOpenExternally,
}: {
  fileUrl: string;
  fileName: string;
  open: boolean;
  onError: () => void;
  onOpenExternally: () => void;
}) {
  return (
    <TransformWrapper
      key={`${open ? 'open' : 'closed'}:${fileUrl}`}
      initialScale={1}
      minScale={0.8}
      maxScale={4}
      centerOnInit={false}
      limitToBounds
      autoAlignment={{ sizeX: 0, sizeY: 0 }}
      pinch={{ disabled: false, step: 5 }}
      doubleClick={{ disabled: false, mode: 'toggle' }}
      wheel={{ disabled: false }}
      panning={{ disabled: false }}
    >
      <TransformComponent
        wrapperClass="!h-full !w-full touch-none"
        wrapperStyle={{ touchAction: 'none', overscrollBehavior: 'none' }}
        wrapperProps={{
          onTouchMove: (event) => {
            event.stopPropagation();
          },
        }}
        contentClass="flex !w-full flex-col items-center justify-start"
        contentStyle={{ touchAction: 'none', willChange: 'transform' }}
      >
        <div className="w-full touch-none" style={{ touchAction: 'none' }}>
          <MobilePdfCanvas
            fileUrl={fileUrl}
            fileName={fileName}
            onOpenExternally={onOpenExternally}
            onError={onError}
          />
        </div>
      </TransformComponent>
    </TransformWrapper>
  );
}

function PdfInlineFallback({ fileUrl }: { fileUrl: string }) {
  return (
    <div className="p-4 text-center text-sm text-gray-400">
      Unable to render PDF inline.{' '}
      <a
        href={fileUrl}
        target="_blank"
        rel="noreferrer"
        className="text-pink-500 underline"
      >
        Download File
      </a>
    </div>
  );
}

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
  const [pdfInlineFailed, setPdfInlineFailed] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Decide once on the client so we never flash a dead iframe on iOS/mobile.
    setUseCanvasPdf(needsCanvasPdfPreview() || window.innerWidth < 768);
    setPdfModeReady(true);
  }, []);

  useEffect(() => {
    if (!pdfModeReady) return;
    setUseCanvasPdf(needsCanvasPdfPreview() || isMobile);
  }, [isMobile, pdfModeReady]);

  useEffect(() => {
    setPdfInlineFailed(false);
  }, [fileName, fileUrl]);

  const effectiveSourceUrl = sourceUrl || fileUrl;
  const previewIsImage = !!fileName && isImageFile(fileName);
  const previewIsPdf = !!fileName && isPdfFile(fileName);
  // Mobile widths + iOS/iPadOS (iframe/object PDF embedding is unsupported).
  const useMobilePdfCanvas = previewIsPdf && useCanvasPdf;
  const canPreview =
    open && !!fileUrl && !!fileName && canPreviewInline(fileName);
  const showImageZoom = canPreview && previewIsImage && !!fileUrl;

  const handlePdfCanvasError = useCallback(() => {
    setPdfInlineFailed(true);
  }, []);

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

  const header = (zoomControls?: ReactNode) => (
    <DialogHeader className="shrink-0 gap-3 space-y-0 border-b p-4 pr-12 text-left sm:flex-row sm:items-center sm:justify-between">
      <DialogTitle className="min-w-0 break-all whitespace-normal pr-2 text-left text-base">
        {fileName ?? 'Document'}
      </DialogTitle>
      <DialogDescription className="sr-only">
        Document preview
      </DialogDescription>
      <div className="flex flex-wrap items-center gap-1">
        {zoomControls}
        {!previewIsPdf && canPreview && !useMobilePdfCanvas && (
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
        {!previewIsPdf && fileName && effectiveSourceUrl && (
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
  );

  const imageStage =
    fileUrl && fileName ? (
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <TransformComponent
          wrapperClass="!h-full !w-full"
          contentClass="flex !h-full !w-full items-center justify-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- blob/remote preview URL */}
          <img
            src={fileUrl}
            alt={fileName}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        </TransformComponent>
      </div>
    ) : null;

  const previewBody = (
    <div className="min-h-0 flex-1 bg-muted/30">
      {fileUrl && fileName && canPreviewInline(fileName) ? (
        previewIsPdf && !pdfModeReady ? (
          <div className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
            Loading PDF…
          </div>
        ) : useMobilePdfCanvas ? (
          pdfInlineFailed ? (
            <div className="flex h-full w-full items-center justify-center overflow-hidden">
              <PdfInlineFallback fileUrl={fileUrl} />
            </div>
          ) : (
            <div className="h-full w-full touch-none overflow-hidden overscroll-none">
              <MobilePdfStage
                fileUrl={fileUrl}
                fileName={fileName}
                open={open}
                onOpenExternally={handleOpenExternally}
                onError={handlePdfCanvasError}
              />
            </div>
          )
        ) : (
          <div className="h-full w-full overflow-hidden">
            <iframe
              ref={previewIframeRef}
              src={fileUrl}
              title={fileName}
              className="h-full w-full border-0"
            />
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
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[100]"
        className="z-[100] flex h-[90dvh] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overscroll-none p-0 sm:w-[95vw]"
      >
        {showImageZoom && fileUrl ? (
          <TransformWrapper
            initialScale={1}
            minScale={FILE_PREVIEW_ZOOM_MIN}
            maxScale={FILE_PREVIEW_ZOOM_MAX}
            centerOnInit
            pinch={{ disabled: false }}
            doubleClick={{ disabled: false }}
            wheel={{ disabled: false }}
          >
            <div className="flex min-h-0 flex-1 flex-col">
              {header(<ImageZoomControls />)}
              <div className="min-h-0 flex-1 bg-muted/30">{imageStage}</div>
            </div>
          </TransformWrapper>
        ) : (
          <>
            {header()}
            {previewBody}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
