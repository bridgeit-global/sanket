import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import {
  getLetterPaperContentWidthPx,
  type LetterPaperSize,
} from '@/lib/letters/paper-size';

type PdfPageFormat = LetterPaperSize;

/** Printable content width for A4 portrait with 15mm side margins at 96dpi. */
export const A4_PORTRAIT_CONTENT_WIDTH_PX = getLetterPaperContentWidthPx('a4');

export type ExportElementToPdfOptions = {
  element: HTMLElement;
  fileName: string;
  format?: PdfPageFormat;
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
  /**
   * Render capture at a fixed CSS width (off-screen) so PDF layout is identical
   * across mobile and desktop viewports.
   */
  captureWidthPx?: number;
  header?: {
    lines: string[];
    /** Space reserved for header content (inside margins). */
    heightMm?: number;
    /** Draw a horizontal rule below header. */
    drawRule?: boolean;
  };
  footer?: {
    /** Space reserved for footer content (inside margins). */
    heightMm?: number;
    /** If true, render \"Page X of Y\" centered. */
    showPageNumbers?: boolean;
  };
  /**
   * Canvas scale factor. Higher = sharper text but more memory.
   * If omitted, defaults to 2, clamped for extremely tall content.
   */
  scale?: number;
  /** Draw a rectangular border on each PDF page (independent of html2canvas). */
  pageBorder?: {
    /** Line width in mm. Default 0.6 */
    widthMm?: number;
    /** Inset from page edges in mm. Defaults to marginMm. */
    insetMm?: number;
  };
  /**
   * Draw a horizontal rule at the top of continuation pages (page 2+).
   * Useful for multi-page tables; off by default for prose documents like letters.
   */
  drawContinuationRule?: boolean;
  /**
   * Reserves `headerHeightMm` at the top of every page (e.g. letterhead clearance).
   * Optionally draws a full-page stationery image underneath.
   */
  pageBackground?: {
    /** Full-page background image URL. Omit to keep only header clearance. */
    imageUrl?: string;
    /** Top inset reserved for letterhead header on every page (mm). */
    headerHeightMm: number;
    /** When true (default), letterhead image is only drawn on the first page. */
    firstPageOnly?: boolean;
  };
};

async function loadImageAsDataUrl(
  url: string,
): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, img.naturalWidth);
        canvas.height = Math.max(1, img.naturalHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas rendering not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const isJpeg = /\.jpe?g(\?|$)/i.test(url) || url.startsWith('data:image/jpeg');
        const format = isJpeg ? 'JPEG' : 'PNG';
        resolve({
          dataUrl: canvas.toDataURL(isJpeg ? 'image/jpeg' : 'image/png', 0.92),
          format,
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => reject(new Error('Failed to load page background image'));
    img.src = url.startsWith('/') ? new URL(url, window.location.origin).href : url;
  });
}

function clampScale(scale: number, element: HTMLElement): number {
  const safe = Number.isFinite(scale) ? scale : 2;
  const rect = element.getBoundingClientRect();
  const approxPixels = Math.max(1, Math.floor(rect.width * rect.height));
  // Heuristic: if content is huge, reduce scale to avoid OOM in the browser.
  if (approxPixels > 6_000_000) return Math.min(1.5, safe);
  if (approxPixels > 12_000_000) return Math.min(1.25, safe);
  return Math.max(1, Math.min(3, safe));
}

function getRowBottomBreakpointsPx(root: HTMLElement, scale: number): number[] {
  const rectRoot = root.getBoundingClientRect();
  const rows = Array.from(root.querySelectorAll('tbody tr')) as HTMLElement[];
  const bottoms: number[] = [];
  for (const row of rows) {
    const r = row.getBoundingClientRect();
    const bottomCssPx = r.bottom - rectRoot.top;
    const bottom = Math.floor(bottomCssPx * scale);
    if (Number.isFinite(bottom) && bottom > 0) bottoms.push(bottom);
  }
  // Unique + sorted
  return Array.from(new Set(bottoms)).sort((a, b) => a - b);
}

function pickSliceHeightPx(args: {
  renderedPx: number;
  maxSliceHeightPx: number;
  totalHeightPx: number;
  breakpointsPx: number[];
}): number {
  const { renderedPx, maxSliceHeightPx, totalHeightPx, breakpointsPx } = args;
  const remaining = totalHeightPx - renderedPx;
  if (remaining <= 0) return 0;
  const defaultHeight = Math.min(maxSliceHeightPx, remaining);
  // If this is the last page, just take the rest.
  if (defaultHeight >= remaining) return remaining;

  // Avoid tiny slices: don't break if we'd render less than ~120px.
  const minUsefulSlicePx = 120;
  const minBreakY = renderedPx + minUsefulSlicePx;
  const targetEnd = renderedPx + defaultHeight;

  // Choose the last breakpoint within (minBreakY, targetEnd].
  // Breakpoints are row-bottom positions relative to element top.
  let best: number | null = null;
  for (const bp of breakpointsPx) {
    if (bp <= minBreakY) continue;
    if (bp > targetEnd) break;
    best = bp;
  }
  if (best == null) return defaultHeight;
  const adjusted = best - renderedPx;
  // Safety: never return 0/negative
  return Math.max(minUsefulSlicePx, Math.min(adjusted, remaining));
}

async function waitForFontsReady(): Promise<void> {
  // Safari/webfonts: html2canvas can snapshot before fonts are ready, causing fallback fonts
  // (which can look condensed/squeezed). Waiting improves consistency.
  const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
  try {
    await fonts?.ready;
  } catch {
    // Non-fatal
  }
}

const PDF_FONT_FAMILY =
  '"Noto Sans Devanagari","Nirmala UI","Mangal",system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

function prepareCaptureElement(
  source: HTMLElement,
  captureWidthPx?: number,
  options?: { transparentBackground?: boolean; paddingPx?: number },
): { element: HTMLElement; cleanup: () => void } {
  if (!captureWidthPx) {
    return { element: source, cleanup: () => {} };
  }

  const transparent = Boolean(options?.transparentBackground);
  const paddingPx = options?.paddingPx ?? 24;
  const host = document.createElement('div');
  host.setAttribute('data-pdf-capture', 'true');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.width = `${captureWidthPx}px`;
  host.style.background = transparent ? 'transparent' : '#ffffff';
  host.style.color = '#000000';
  host.style.boxSizing = 'border-box';
  host.style.fontFamily = PDF_FONT_FAMILY;

  const clone = source.cloneNode(true) as HTMLElement;
  clone.className = '';
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.boxSizing = 'border-box';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  clone.style.background = transparent ? 'transparent' : '#ffffff';
  clone.style.backgroundImage = 'none';
  clone.style.color = '#000000';
  clone.style.padding = `${paddingPx}px`;
  clone.style.fontSize = '15px';
  clone.style.lineHeight = '1.75';
  clone.style.fontFamily = PDF_FONT_FAMILY;

  const pre = clone.querySelector('pre');
  if (pre instanceof HTMLElement) {
    pre.style.margin = '0';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.fontSize = '15px';
    pre.style.lineHeight = '1.75';
    pre.style.fontFamily = PDF_FONT_FAMILY;
    pre.style.color = '#000000';
  }

  host.appendChild(clone);
  document.body.appendChild(host);

  return {
    element: host,
    cleanup: () => host.remove(),
  };
}

export async function exportElementToPdf(options: ExportElementToPdfOptions): Promise<void> {
  const {
    element,
    fileName,
    format = 'a4',
    orientation = 'portrait',
    marginMm: rawMarginMm = 10,
    header,
    footer,
    scale: rawScale = 2,
    captureWidthPx,
    drawContinuationRule = false,
    pageBackground,
  } = options;

  const marginMm = Math.max(0, Math.min(25, rawMarginMm));
  const pageBackgroundHeaderMm = pageBackground
    ? Math.max(0, Math.min(120, pageBackground.headerHeightMm))
    : 0;
  const letterheadFirstPageOnly = pageBackground?.firstPageOnly !== false;
  const { element: captureElement, cleanup: cleanupCapture } = prepareCaptureElement(
    element,
    captureWidthPx,
    {
      transparentBackground: Boolean(pageBackground?.imageUrl),
      paddingPx: pageBackground ? 0 : undefined,
    },
  );
  const scale = clampScale(rawScale, captureElement);

  const root = document.documentElement;
  const body = document.body;
  root.classList.add('pdf-export');
  body.classList.add('pdf-export');

  try {
    await waitForFontsReady();

    const hasHeader = Boolean(header?.lines?.length);
    const hasFooter = Boolean(footer?.showPageNumbers);
    const headerHeightMmRequested = hasHeader ? Math.max(0, Math.min(50, header?.heightMm ?? 18)) : 0;
    const footerHeightMm = hasFooter ? Math.max(0, Math.min(30, footer?.heightMm ?? 12)) : 0;

    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });

    const pageWidthMm = doc.internal.pageSize.getWidth();
    const pageHeightMm = doc.internal.pageSize.getHeight();
    const contentWidthMm = Math.max(1, pageWidthMm - marginMm * 2);

    let pageBackgroundImage: { dataUrl: string; format: 'PNG' | 'JPEG' } | null = null;
    if (pageBackground?.imageUrl) {
      pageBackgroundImage = await loadImageAsDataUrl(pageBackground.imageUrl);
    }

    // Build a header image via DOM -> canvas so Marathi renders correctly
    // (jsPDF built-in fonts often don't include Devanagari glyphs).
    let headerImageData: string | null = null;
    let headerHeightMm = headerHeightMmRequested;
    let headerImageHeightMm = headerHeightMmRequested;
    if (header?.lines?.length && headerHeightMmRequested > 0) {
      const headerHost = document.createElement('div');
      headerHost.style.position = 'fixed';
      headerHost.style.left = '-10000px';
      headerHost.style.top = '0';
      headerHost.style.width = `${Math.ceil(captureElement.scrollWidth)}px`;
      headerHost.style.background = '#ffffff';
      headerHost.style.color = '#000000';
      // Extra bottom padding prevents html2canvas from clipping Devanagari glyph descenders
      // (observed in Safari where header date line can get cut).
      headerHost.style.padding = '12px 24px 10px 24px';
      headerHost.style.fontFamily =
        '"Noto Sans Devanagari","Nirmala UI","Mangal",system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

      const headerInner = document.createElement('div');
      headerInner.style.display = 'flex';
      headerInner.style.flexDirection = 'column';
      headerInner.style.alignItems = 'center';
      headerInner.style.gap = '4px';

      for (const line of header.lines.slice(0, 3)) {
        const p = document.createElement('div');
        p.textContent = line;
        p.style.fontWeight = '600';
        p.style.fontSize = '18px';
        p.style.lineHeight = '1.25';
        p.style.textAlign = 'center';
        p.style.fontFamily = 'inherit';
        headerInner.appendChild(p);
      }

      headerHost.appendChild(headerInner);

      document.body.appendChild(headerHost);
      try {
        await waitForFontsReady();
        const headerCanvas = await html2canvas(headerHost, {
          backgroundColor: '#ffffff',
          scale,
          useCORS: true,
          logging: false,
          windowWidth: Math.ceil(headerHost.scrollWidth),
          windowHeight: Math.ceil(headerHost.scrollHeight),
          scrollX: 0,
          scrollY: -window.scrollY,
        });
        headerImageData = headerCanvas.toDataURL('image/png');
        // Natural image height at our PDF draw width (avoid squeezing by stretching).
        headerImageHeightMm =
          (headerCanvas.height / Math.max(1, headerCanvas.width)) * contentWidthMm;
        // Reserve enough space (can be > image height) without stretching the image.
        headerHeightMm = Math.max(headerHeightMmRequested, Math.min(50, headerImageHeightMm));
      } finally {
        headerHost.remove();
      }
    }

    const topInsetMm =
      pageBackgroundHeaderMm > 0 ? pageBackgroundHeaderMm : marginMm;
    const contentHeightMm = Math.max(
      1,
      pageHeightMm - topInsetMm - marginMm - headerHeightMm - footerHeightMm,
    );

    // Render DOM -> canvas
    await waitForFontsReady();
    const canvas = await html2canvas(captureElement, {
      backgroundColor: pageBackgroundImage ? null : '#ffffff',
      scale,
      useCORS: true,
      logging: false,
      // Ensure we capture the full element, not just the viewport.
      windowWidth: Math.ceil(captureElement.scrollWidth),
      windowHeight: Math.ceil(captureElement.scrollHeight),
      scrollX: 0,
      scrollY: 0,
    });

    // Convert pixels -> mm at the chosen width.
    const pxPerMm = canvas.width / contentWidthMm;
    const pageHeightPx = Math.floor(contentHeightMm * pxPerMm);

    // Compute breakpoints so we don't cut table rows across pages.
    // This relies on the DOM layout (before html2canvas) and works well for table-based PDFs.
    const domToCanvasScale =
      captureElement.scrollWidth > 0
        ? canvas.width / captureElement.scrollWidth
        : scale;
    const rowBreakpointsPx = getRowBottomBreakpointsPx(captureElement, domToCanvasScale);

    let renderedPx = 0;
    let pageIndex = 0;
    // We'll estimate total pages more accurately once we apply breakpoints.
    let totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

    while (renderedPx < canvas.height) {
      const sliceHeightPx = pickSliceHeightPx({
        renderedPx,
        maxSliceHeightPx: pageHeightPx,
        totalHeightPx: canvas.height,
        breakpointsPx: rowBreakpointsPx,
      });
      if (sliceHeightPx <= 0) break;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas rendering not supported');
      }

      if (pageBackgroundImage) {
        ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      }

      ctx.drawImage(
        canvas,
        0,
        renderedPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx,
      );

      // When slicing a long table across multiple pages, the next slice starts mid-table.
      // Overlay a top rule for subsequent pages so the table doesn't look borderless at the top.
      // Must be drawn AFTER drawImage so it remains visible.
      if (drawContinuationRule && pageIndex > 0) {
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // For a 3px stroke, align to an integer for crispness.
        ctx.moveTo(0, 3);
        ctx.lineTo(pageCanvas.width, 3);
        ctx.stroke();
      }

      const imgData = pageCanvas.toDataURL('image/png');
      const sliceHeightMm = sliceHeightPx / pxPerMm;

      if (pageIndex > 0) {
        doc.addPage();
      }

      const drawLetterhead =
        Boolean(pageBackgroundImage) &&
        (pageIndex === 0 || !letterheadFirstPageOnly);
      if (pageBackgroundImage && drawLetterhead) {
        doc.addImage(
          pageBackgroundImage.dataUrl,
          pageBackgroundImage.format,
          0,
          0,
          pageWidthMm,
          pageHeightMm,
          undefined,
          'FAST',
        );
      }

      const contentY = topInsetMm + headerHeightMm;
      doc.addImage(
        imgData,
        'PNG',
        marginMm,
        contentY,
        contentWidthMm,
        sliceHeightMm,
        undefined,
        'FAST',
      );

      // Header (drawn above captured content)
      if (headerImageData && headerHeightMm > 0) {
        doc.addImage(
          headerImageData,
          'PNG',
          marginMm,
          topInsetMm,
          contentWidthMm,
          headerImageHeightMm,
          undefined,
          'FAST',
        );
      }

      // Header underline: draw as a real PDF line (never clipped/squeezed).
      if (headerHeightMm > 0 && header?.drawRule !== false) {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.6);
        const y = topInsetMm + headerHeightMm + 0.8;
        doc.line(marginMm, y, marginMm + contentWidthMm, y);
      }

      // Footer (page numbers)
      if (footer?.showPageNumbers) {
        // If our earlier estimate was low, bump it as we go.
        totalPages = Math.max(totalPages, pageIndex + 1);
        const footerText = `Page ${pageIndex + 1} of ${totalPages}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const footerY = pageHeightMm - marginMm - 4;
        doc.text(footerText, pageWidthMm / 2, footerY, { align: 'center' });
      }

      renderedPx += sliceHeightPx;
      pageIndex += 1;
    }

    doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
  } finally {
    cleanupCapture();
    root.classList.remove('pdf-export');
    body.classList.remove('pdf-export');
  }
}

