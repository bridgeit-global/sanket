'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import {
  getLetterheadContentPaddingMm,
  resolveLetterheadUrl,
  stripLetterheadFromHtml,
} from '@/lib/letters/letterhead';
import {
  getLetterPageContentHeightCssPx,
  getLetterPaperContentWidthPx,
  getLetterPaperHeightPx,
  getLetterPaperWidthPx,
  LETTER_PAPER_MARGIN_MM,
  type LetterPaperSize,
} from '@/lib/letters/paper-size';
import type { LetterLocale } from '@/lib/letters/templates';
import {
  computePageStartOffsetsPx,
  getAvoidSplitRangesPx,
  getContentBreakpointsPx,
  getLineRangesPx,
} from '@/lib/pdf/page-breaks';

const LETTER_PREVIEW_CONTENT_CLASSES =
  // Templates use block margins / <br> for structure — do not use pre-wrap or
  // pretty-printed HTML indentation becomes huge blank lines in PDF/print.
  '[&_.letter-content]:whitespace-normal [&_.letter-content]:font-[inherit] [&_.letter-content]:text-[length:inherit] [&_.letter-content]:leading-[inherit] [&_.letter-content]:text-black';

const LETTER_FONT_STACK: Record<LetterLocale, string> = {
  en: `system-ui, -apple-system, sans-serif`,
  mr: `"Noto Sans Devanagari", "Nirmala UI", system-ui, -apple-system, sans-serif`,
};

/**
 * Shared typography for preview / print / PDF so all three stay WYSIWYG.
 * Font size scales with paper size: A4 (big) → B5 (medium) → A5 (small).
 */
const LETTER_PRINT_FONT_SIZE_PX: Record<LetterPaperSize, number> = {
  a4: 16,
  b5: 15,
  a5: 14,
};

function getLetterPrintFontSizePx(paperSize: LetterPaperSize): number {
  return LETTER_PRINT_FONT_SIZE_PX[paperSize];
}

const LETTER_PRINT_LINE_HEIGHT = 1.75;

const LETTER_PREVIEW_PAGE_GAP_PX = 16;

/** Max dialog width so modal preview can use the full paper width at 96dpi. */
export function getLetterPreviewDialogMaxWidthClass(
  paperSize: LetterPaperSize,
): string {
  switch (paperSize) {
    case 'a4':
      return 'max-w-[min(100%,940px)]';
    case 'b5':
      return 'max-w-[min(100%,820px)]';
    case 'a5':
      return 'max-w-[min(100%,700px)]';
    default:
      return 'max-w-3xl';
  }
}

/**
 * Visual scale for on-screen preview only — canonical page dimensions stay at
 * 96dpi so pagination matches PDF/print; transform scale adjusts visibility.
 */
function computeLetterPreviewDisplayScale(
  containerWidthPx: number,
  paperSize: LetterPaperSize,
  variant: 'inline' | 'modal',
): number {
  const paperWidthPx = getLetterPaperWidthPx(paperSize);
  const availableWidthPx = Math.max(0, containerWidthPx - 8);
  if (availableWidthPx <= 0 || paperWidthPx <= 0) return 1;

  const fitScale = availableWidthPx / paperWidthPx;
  const maxScale =
    variant === 'modal'
      ? paperSize === 'a5'
        ? 1.2
        : paperSize === 'b5'
          ? 1.1
          : 1
      : 1;
  const minScale = variant === 'modal' ? 0.7 : 0.55;

  return Math.min(maxScale, Math.max(minScale, fitScale));
}

function getLetterBodyPaddingCss(
  paperSize: LetterPaperSize,
  hasLetterhead: boolean,
): string {
  if (hasLetterhead) {
    const marginMm = LETTER_PAPER_MARGIN_MM[paperSize];
    const headerPaddingMm = getLetterheadContentPaddingMm(paperSize);
    return `${headerPaddingMm}mm ${marginMm}mm ${marginMm}mm ${marginMm}mm`;
  }
  const paddingPx = paperSize === 'a4' ? 24 : 18;
  return `${paddingPx}px`;
}

export function createLetterExportElement(
  html: string,
  options?: {
    paperSize?: LetterPaperSize;
    letterLocale?: LetterLocale;
  },
): HTMLElement {
  const host = document.createElement('div');
  const contentHtml = stripLetterheadFromHtml(html);
  const paperSize = options?.paperSize ?? 'a4';
  const fontFamily = LETTER_FONT_STACK[options?.letterLocale ?? 'mr'];
  const fallbackFontSizePx = getLetterPrintFontSizePx(paperSize);

  host.innerHTML = contentHtml;
  const letterContent = host.querySelector('.letter-content');
  if (!(letterContent instanceof HTMLElement)) {
    host.style.position = 'relative';
    host.style.background = 'transparent';
    host.style.color = '#000';
    host.style.boxSizing = 'border-box';
    host.style.width = `${getLetterPaperContentWidthPx(paperSize)}px`;
    host.style.fontFamily = fontFamily;
    host.style.fontSize = `${fallbackFontSizePx}px`;
    host.style.lineHeight = String(LETTER_PRINT_LINE_HEIGHT);
    return host;
  }

  // Capture `.letter-content` directly (same node shape as LetterPreview) so
  // PDF typography and pagination match the inline/modal preview.
  letterContent.style.position = 'relative';
  letterContent.style.background = 'transparent';
  letterContent.style.color = '#000';
  letterContent.style.boxSizing = 'border-box';
  letterContent.style.width = `${getLetterPaperContentWidthPx(paperSize)}px`;
  letterContent.style.margin = '0';
  letterContent.style.whiteSpace = 'normal';
  letterContent.style.fontFamily = fontFamily;
  // Preserve template font-size / line-height (fees uses 13px / 1.55 on A5).
  if (!letterContent.style.fontSize) {
    letterContent.style.fontSize = `${fallbackFontSizePx}px`;
  }
  if (!letterContent.style.lineHeight) {
    letterContent.style.lineHeight = String(LETTER_PRINT_LINE_HEIGHT);
  }

  return letterContent;
}

export function LetterPreview({
  html,
  paperSize = 'a4',
  letterheadUrl,
  letterLocale,
  variant = 'inline',
}: {
  html: string;
  paperSize?: LetterPaperSize;
  letterheadUrl?: string | null;
  letterLocale: LetterLocale;
  variant?: 'inline' | 'modal';
}) {
  const resolvedLetterhead = resolveLetterheadUrl(paperSize, letterheadUrl);
  const contentHtml = stripLetterheadFromHtml(html);
  const hasLetterhead = Boolean(resolvedLetterhead);
  const bodyPadding = getLetterBodyPaddingCss(paperSize, hasLetterhead);

  const rootRef = useRef<HTMLDivElement>(null);
  const pageFrameRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [displayScale, setDisplayScale] = useState(1);
  // Y offsets where each preview page begins — aligned to text-line bottoms
  // so glyphs are never clipped mid-line (same logic as PDF export).
  const [pageStartOffsetsPx, setPageStartOffsetsPx] = useState<number[]>([0]);

  useLayoutEffect(() => {
    const recomputePages = () => {
      const clip = clipRef.current;
      const content = contentRef.current;
      if (!clip || !content) return;

      // Measure the live clip at canonical page width so inline preview and
      // modal preview paginate identically (responsive shrink was reflowing text).
      let available = clip.clientHeight;
      if (available <= 0) {
        available = getLetterPageContentHeightCssPx(
          paperSize,
          hasLetterhead,
          getLetterheadContentPaddingMm(paperSize),
        );
      }
      if (available <= 0) return;

      const total = content.scrollHeight;
      const breakpointsPx = getContentBreakpointsPx(content, 1);
      const avoidRangesPx = getAvoidSplitRangesPx(content, 1);
      const lineRangesPx = getLineRangesPx(content, 1);
      const starts = computePageStartOffsetsPx({
        totalHeightPx: total,
        pageHeightPx: available,
        breakpointsPx,
        avoidRangesPx,
        lineRangesPx,
      });

      setPageStartOffsetsPx((prev) => {
        const next = starts.length > 0 ? starts : [0];
        if (
          prev.length === next.length &&
          prev.every((value, index) => value === next[index])
        ) {
          return prev;
        }
        return next;
      });
    };

    recomputePages();

    const frame = pageFrameRef.current;
    const clip = clipRef.current;
    const content = contentRef.current;
    if (!frame || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => recomputePages());
    observer.observe(frame);
    if (clip) observer.observe(clip);
    if (content) observer.observe(content);

    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) recomputePages();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [contentHtml, paperSize, letterLocale, hasLetterhead, bodyPadding]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const updateDisplayScale = () => {
      const width = root.clientWidth;
      if (width <= 0) return;
      const next = computeLetterPreviewDisplayScale(width, paperSize, variant);
      setDisplayScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };

    updateDisplayScale();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => updateDisplayScale());
    observer.observe(root);
    return () => observer.disconnect();
  }, [paperSize, variant]);

  const paperWidthPx = getLetterPaperWidthPx(paperSize);
  const paperHeightPx = getLetterPaperHeightPx(paperSize);
  const scaledPaperWidthPx = paperWidthPx * displayScale;
  const scaledPaperHeightPx = paperHeightPx * displayScale;
  const pageShellStyle = {
    width: `${paperWidthPx}px`,
    height: `${paperHeightPx}px`,
    fontFamily: LETTER_FONT_STACK[letterLocale],
    fontSize: `${getLetterPrintFontSizePx(paperSize)}px`,
    lineHeight: LETTER_PRINT_LINE_HEIGHT,
    transform: `scale(${displayScale})`,
    transformOrigin: 'top left',
  } as const;

  return (
    <div ref={rootRef} className="w-full">
      <div className="mx-auto" style={{ width: scaledPaperWidthPx }}>
        {pageStartOffsetsPx.map((startOffsetPx, pageIndex) => {
          const nextStartPx = pageStartOffsetsPx[pageIndex + 1];
          const sliceHeightPx =
            nextStartPx != null
              ? Math.max(0, nextStartPx - startOffsetPx)
              : undefined;

          return (
            <div
              key={pageIndex}
              className="shrink-0"
              style={{
                width: scaledPaperWidthPx,
                height: scaledPaperHeightPx,
                marginBottom:
                  pageIndex < pageStartOffsetsPx.length - 1
                    ? LETTER_PREVIEW_PAGE_GAP_PX
                    : undefined,
              }}
            >
              <div
                ref={pageIndex === 0 ? pageFrameRef : undefined}
                className="relative overflow-hidden rounded-lg border bg-white text-black"
                style={pageShellStyle}
              >
                {resolvedLetterhead && pageIndex === 0 ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-no-repeat"
                    style={{
                      backgroundImage: `url("${resolvedLetterhead}")`,
                      backgroundSize: '100% 100%',
                    }}
                  />
                ) : null}
                <div className="absolute inset-0" style={{ padding: bodyPadding }}>
                  <div
                    ref={pageIndex === 0 ? clipRef : undefined}
                    className="h-full overflow-hidden"
                  >
                    {/* Cap visible height at the next safe break so lines aren't clipped mid-glyph. */}
                    <div
                      className="overflow-hidden"
                      style={
                        sliceHeightPx != null ? { height: sliceHeightPx } : undefined
                      }
                    >
                      <div
                        ref={pageIndex === 0 ? contentRef : undefined}
                        className={LETTER_PREVIEW_CONTENT_CLASSES}
                        style={{
                          transform:
                            startOffsetPx > 0
                              ? `translateY(-${startOffsetPx}px)`
                              : undefined,
                        }}
                        // Letter HTML is generated from admin-editable templates stored in our database.
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
