'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
} from 'pdfjs-dist';
import { Button } from '@/components/ui/button';

type MobilePdfCanvasProps = {
  fileUrl: string;
  fileName: string;
  onOpenExternally?: () => void;
};

/**
 * Point PDF.js at a static worker file. The hashed Next asset is preferred;
 * `/pdf.worker.min.mjs` is the fallback and must stay public. A login redirect
 * is not a JavaScript module, which is what breaks the mobile preview.
 */
function resolvePdfWorkerSrc(): string {
  try {
    const url = new URL(
      '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url,
    );
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    // Use the public copy when the bundler does not emit the worker asset.
  }
  return '/pdf.worker.min.mjs';
}

/**
 * Renders a PDF to canvases. Mobile browsers (esp. iOS Safari) cannot show
 * PDFs inside iframe/object/embed; PDF.js canvas output is the reliable path.
 */
export function MobilePdfCanvas({
  fileUrl,
  fileName,
  onOpenExternally,
}: MobilePdfCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let pdfDoc: PDFDocumentProxy | null = null;

    const render = async () => {
      setStatus('loading');
      setErrorMessage(null);
      setPageCount(0);

      const host = containerRef.current;
      if (!host) return;
      host.replaceChildren();

      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = resolvePdfWorkerSrc();

        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch PDF');
        }
        const data = new Uint8Array(await response.arrayBuffer());
        if (cancelled) return;

        loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          await pdf.cleanup();
          return;
        }
        pdfDoc = pdf;
        setPageCount(pdf.numPages);

        const cssWidth = Math.max(
          host.clientWidth || window.innerWidth - 48,
          280,
        );

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const unscaled = page.getViewport({ scale: 1 });
          const scale = cssWidth / unscaled.width;
          const viewport = page.getViewport({ scale });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className =
            'mx-auto mb-3 max-w-full rounded-sm bg-white shadow-sm last:mb-0';
          canvas.setAttribute('aria-label', `${fileName} page ${pageNumber}`);

          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas unavailable');

          const transform =
            outputScale !== 1
              ? ([outputScale, 0, 0, outputScale, 0, 0] as const)
              : undefined;

          await page.render({
            canvasContext: context,
            canvas: null,
            viewport,
            transform: transform ? [...transform] : undefined,
          }).promise;
          if (cancelled) return;

          host.appendChild(canvas);
        }

        if (!cancelled) setStatus('ready');
      } catch (error) {
        console.error('Mobile PDF render error:', error);
        if (!cancelled) {
          setStatus('error');
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to render PDF',
          );
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
      void pdfDoc?.cleanup();
      void loadingTask?.destroy();
    };
  }, [fileUrl, fileName]);

  return (
    <div className="relative w-full min-h-[50dvh]">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-muted/30 p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading PDF…</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t preview this PDF
            {errorMessage ? `: ${errorMessage}` : '.'}
          </p>
          {onOpenExternally ? (
            <Button className="w-full sm:w-auto" onClick={onOpenExternally}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open PDF
            </Button>
          ) : null}
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full p-2"
        aria-busy={status === 'loading'}
        data-page-count={pageCount || undefined}
      />
    </div>
  );
}
