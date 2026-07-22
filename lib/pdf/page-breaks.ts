/**
 * DOM → PDF/preview page-break helpers.
 * Break on text-line / row bottoms so glyphs are never sliced mid-line.
 */

export type AvoidSplitRangePx = {
  top: number;
  bottom: number;
};

function toScaledBottom(
  cssBottom: number,
  rootTop: number,
  scale: number,
): number | null {
  // ceil so descenders of the current line stay on this page
  const bottom = Math.ceil((cssBottom - rootTop) * scale);
  return Number.isFinite(bottom) && bottom > 0 ? bottom : null;
}

function toScaledY(cssY: number, rootTop: number, scale: number): number {
  return Math.floor((cssY - rootTop) * scale);
}

/** Bottoms of table rows + text line boxes (safe places to end a page). */
export function getContentBreakpointsPx(
  root: HTMLElement,
  scale = 1,
): number[] {
  const rectRoot = root.getBoundingClientRect();
  const rootTop = rectRoot.top;
  const bottoms = new Set<number>();

  const addBottom = (cssBottom: number) => {
    const bottom = toScaledBottom(cssBottom, rootTop, scale);
    if (bottom != null) bottoms.add(bottom);
  };

  for (const row of Array.from(
    root.querySelectorAll('tbody tr'),
  ) as HTMLElement[]) {
    addBottom(row.getBoundingClientRect().bottom);
  }

  // Line boxes from text nodes — prevents mid-glyph cuts in prose letters.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = node.textContent;
    if (text?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.height > 0) addBottom(rect.bottom);
      }
    }
    node = walker.nextNode();
  }

  // Block bottoms catch empty spacers / images without text.
  for (const el of Array.from(
    root.querySelectorAll(
      'p, div, li, h1, h2, h3, h4, h5, h6, tr, img, table, blockquote, pre',
    ),
  ) as HTMLElement[]) {
    const r = el.getBoundingClientRect();
    if (r.height > 0) addBottom(r.bottom);
  }

  return Array.from(bottoms).sort((a, b) => a - b);
}

/**
 * Regions that should stay on one page when possible (e.g. signature block).
 * Prefer breaking just above the region if a cut would split it.
 */
export function getAvoidSplitRangesPx(
  root: HTMLElement,
  scale = 1,
): AvoidSplitRangePx[] {
  const rectRoot = root.getBoundingClientRect();
  const rootTop = rectRoot.top;
  const ranges: AvoidSplitRangePx[] = [];

  for (const el of Array.from(
    root.querySelectorAll('.signature'),
  ) as HTMLElement[]) {
    const r = el.getBoundingClientRect();
    if (r.height <= 0) continue;
    ranges.push({
      top: toScaledY(r.top, rootTop, scale),
      bottom: toScaledY(r.bottom, rootTop, scale),
    });
  }

  return ranges;
}

export function pickSliceHeightPx(args: {
  renderedPx: number;
  maxSliceHeightPx: number;
  totalHeightPx: number;
  breakpointsPx: number[];
  avoidRangesPx?: AvoidSplitRangePx[];
}): number {
  const {
    renderedPx,
    maxSliceHeightPx,
    totalHeightPx,
    breakpointsPx,
    avoidRangesPx = [],
  } = args;
  const remaining = totalHeightPx - renderedPx;
  if (remaining <= 0) return 0;
  const defaultHeight = Math.min(maxSliceHeightPx, remaining);
  if (defaultHeight >= remaining) return remaining;

  const minUsefulSlicePx = 120;
  const minBreakY = renderedPx + minUsefulSlicePx;
  let targetEnd = renderedPx + defaultHeight;

  // If the default cut would split an avoid-range, prefer ending at its top.
  for (const range of avoidRangesPx) {
    if (range.top >= targetEnd || range.bottom <= targetEnd) continue;
    // Range straddles targetEnd.
    if (range.top > renderedPx) {
      targetEnd = range.top;
    }
  }

  let best: number | null = null;
  for (const bp of breakpointsPx) {
    if (bp <= minBreakY) continue;
    if (bp > targetEnd) break;
    best = bp;
  }

  // If no line break fit, but we pulled targetEnd back for an avoid-range, use that.
  if (best == null && targetEnd < renderedPx + defaultHeight && targetEnd > renderedPx) {
    return Math.max(1, Math.min(targetEnd - renderedPx, remaining));
  }

  if (best == null) return defaultHeight;
  const adjusted = best - renderedPx;
  return Math.max(1, Math.min(adjusted, remaining));
}

/** Cumulative Y offsets where each page of content begins (CSS/canvas px). */
export function computePageStartOffsetsPx(args: {
  totalHeightPx: number;
  pageHeightPx: number;
  breakpointsPx: number[];
  avoidRangesPx?: AvoidSplitRangePx[];
}): number[] {
  const { totalHeightPx, pageHeightPx, breakpointsPx, avoidRangesPx } = args;
  if (totalHeightPx <= 0 || pageHeightPx <= 0) return [0];

  const starts = [0];
  let renderedPx = 0;

  while (renderedPx < totalHeightPx) {
    const slice = pickSliceHeightPx({
      renderedPx,
      maxSliceHeightPx: pageHeightPx,
      totalHeightPx,
      breakpointsPx,
      avoidRangesPx,
    });
    if (slice <= 0) break;
    renderedPx += slice;
    if (renderedPx < totalHeightPx) {
      starts.push(renderedPx);
    }
  }

  return starts;
}
