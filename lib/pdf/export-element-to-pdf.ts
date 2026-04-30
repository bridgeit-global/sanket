import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

type PdfPageFormat = 'a4';

export type ExportElementToPdfOptions = {
  element: HTMLElement;
  fileName: string;
  format?: PdfPageFormat;
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
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
};

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
  } = options;

  const marginMm = Math.max(0, Math.min(25, rawMarginMm));
  const scale = clampScale(rawScale, element);

  const root = document.documentElement;
  const body = document.body;
  root.classList.add('pdf-export');
  body.classList.add('pdf-export');

  try {
    const hasHeader = Boolean(header?.lines?.length);
    const hasFooter = Boolean(footer?.showPageNumbers);
    const headerHeightMm = hasHeader ? Math.max(0, Math.min(50, header?.heightMm ?? 18)) : 0;
    const footerHeightMm = hasFooter ? Math.max(0, Math.min(30, footer?.heightMm ?? 12)) : 0;

    // Build a header image via DOM -> canvas so Marathi renders correctly
    // (jsPDF built-in fonts often don't include Devanagari glyphs).
    let headerImageData: string | null = null;
    if (header?.lines?.length && headerHeightMm > 0) {
      const headerHost = document.createElement('div');
      headerHost.style.position = 'fixed';
      headerHost.style.left = '-10000px';
      headerHost.style.top = '0';
      headerHost.style.width = `${Math.ceil(element.scrollWidth)}px`;
      headerHost.style.background = '#ffffff';
      headerHost.style.color = '#000000';
      headerHost.style.padding = '12px 24px 0 24px';

      const headerInner = document.createElement('div');
      headerInner.style.display = 'flex';
      headerInner.style.flexDirection = 'column';
      headerInner.style.alignItems = 'center';
      headerInner.style.gap = '4px';

      for (const line of header.lines.slice(0, 3)) {
        const p = document.createElement('div');
        p.textContent = line;
        p.style.fontWeight = '700';
        p.style.fontSize = '18px';
        p.style.lineHeight = '1.15';
        p.style.textAlign = 'center';
        headerInner.appendChild(p);
      }

      headerHost.appendChild(headerInner);

      if (header.drawRule !== false) {
        const rule = document.createElement('div');
        rule.style.marginTop = '10px';
        rule.style.height = '2px';
        rule.style.width = '100%';
        rule.style.background = '#000';
        headerHost.appendChild(rule);
      }

      document.body.appendChild(headerHost);
      try {
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
      } finally {
        headerHost.remove();
      }
    }

    // Render DOM -> canvas
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale,
      useCORS: true,
      logging: false,
      // Ensure we capture the full element, not just the viewport.
      windowWidth: Math.ceil(element.scrollWidth),
      windowHeight: Math.ceil(element.scrollHeight),
      scrollX: 0,
      scrollY: -window.scrollY,
    });

    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress: true,
    });

    const pageWidthMm = doc.internal.pageSize.getWidth();
    const pageHeightMm = doc.internal.pageSize.getHeight();
    const contentWidthMm = Math.max(1, pageWidthMm - marginMm * 2);
    const contentHeightMm = Math.max(1, pageHeightMm - marginMm * 2 - headerHeightMm - footerHeightMm);

    // Convert pixels -> mm at the chosen width.
    const pxPerMm = canvas.width / contentWidthMm;
    const pageHeightPx = Math.floor(contentHeightMm * pxPerMm);

    // Compute breakpoints so we don't cut table rows across pages.
    // This relies on the DOM layout (before html2canvas) and works well for table-based PDFs.
    const domToCanvasScale =
      element.scrollWidth > 0 ? canvas.width / element.scrollWidth : scale;
    const rowBreakpointsPx = getRowBottomBreakpointsPx(element, domToCanvasScale);

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

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
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

      const imgData = pageCanvas.toDataURL('image/png');
      const sliceHeightMm = sliceHeightPx / pxPerMm;

      if (pageIndex > 0) {
        doc.addPage();
      }
      const contentY = marginMm + headerHeightMm;
      doc.addImage(imgData, 'PNG', marginMm, contentY, contentWidthMm, sliceHeightMm, undefined, 'FAST');

      // Header (drawn above captured content)
      if (headerImageData && headerHeightMm > 0) {
        doc.addImage(
          headerImageData,
          'PNG',
          marginMm,
          marginMm,
          contentWidthMm,
          headerHeightMm,
          undefined,
          'FAST',
        );
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
    root.classList.remove('pdf-export');
    body.classList.remove('pdf-export');
  }
}

