/**
 * DOM → PDF/preview page-break helpers.
 * Break on text-line / row bottoms so glyphs are never sliced mid-line.
 */

export type AvoidSplitRangePx = {
  top: number;
  bottom: number;
};

export type LineRangePx = {
  top: number;
  bottom: number;
};

function toScaledY(
  cssY: number,
  rootTop: number,
  scale: number,
  round: 'floor' | 'ceil' = 'floor',
): number {
  const raw = (cssY - rootTop) * scale;
  return round === 'ceil' ? Math.ceil(raw) : Math.floor(raw);
}

/** Union of cell boxes — `tr.getBoundingClientRect()` can span the whole table. */
function tableRowBounds(row: HTMLElement): { top: number; bottom: number } | null {
  const cells = row.querySelectorAll('th, td');
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  if (cells.length > 0) {
    for (const cell of Array.from(cells) as HTMLElement[]) {
      const r = cell.getBoundingClientRect();
      if (r.height <= 0) continue;
      top = Math.min(top, r.top);
      bottom = Math.max(bottom, r.bottom);
    }
  }
  if (!Number.isFinite(top) || bottom <= top) {
    const r = row.getBoundingClientRect();
    if (r.height <= 0) return null;
    return { top: r.top, bottom: r.bottom };
  }
  return { top, bottom };
}

function isDayHeading(el: HTMLElement): boolean {
  return Boolean(el.closest('.pdf-day-header, .print-date-header'));
}

function collectLineRangesPx(
  root: HTMLElement,
  scale: number,
): LineRangePx[] {
  const rectRoot = root.getBoundingClientRect();
  const rootTop = rectRoot.top;
  const lines: LineRangePx[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    // Skip non-rendered text (style/script) — getClientRects is empty/meaningless.
    const parent = node.parentElement;
    if (
      parent &&
      (parent.tagName === 'STYLE' ||
        parent.tagName === 'SCRIPT' ||
        parent.tagName === 'NOSCRIPT')
    ) {
      node = walker.nextNode();
      continue;
    }

    const text = node.textContent;
    if (text?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.height <= 1) continue;
        lines.push({
          top: toScaledY(rect.top, rootTop, scale, 'floor'),
          // ceil so descenders stay on the same page as the line
          bottom: toScaledY(rect.bottom, rootTop, scale, 'ceil'),
        });
      }
    }
    node = walker.nextNode();
  }

  lines.sort((a, b) => a.top - b.top || a.bottom - b.bottom);
  return lines;
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
    const bottom = toScaledY(cssBottom, rootTop, scale, 'ceil');
    if (Number.isFinite(bottom) && bottom > 0) bottoms.add(bottom);
  };

  for (const row of Array.from(
    root.querySelectorAll('tbody tr'),
  ) as HTMLElement[]) {
    const bounds = tableRowBounds(row);
    if (bounds) addBottom(bounds.bottom);
  }

  for (const line of collectLineRangesPx(root, scale)) {
    if (line.bottom > 0) bottoms.add(line.bottom);
  }

  // Block bottoms catch empty spacers / images without text.
  // Skip day headings — breaking after the date orphans it from its table.
  // Skip nodes inside tables: row bottoms above are the only safe table cuts
  // (inner divs sit mid-cell and fight with row keep-together).
  for (const el of Array.from(
    root.querySelectorAll(
      'p, div, li, h1, h2, h3, h4, h5, h6, tr, img, table, blockquote, pre',
    ),
  ) as HTMLElement[]) {
    if (isDayHeading(el)) continue;
    if (el.closest('table') && el.tagName !== 'TABLE') continue;
    const r = el.getBoundingClientRect();
    if (r.height > 0) addBottom(r.bottom);
  }

  return Array.from(bottoms).sort((a, b) => a - b);
}

export function getLineRangesPx(
  root: HTMLElement,
  scale = 1,
): LineRangePx[] {
  return collectLineRangesPx(root, scale);
}

type ProgrammePackUnit = {
  top: number;
  bottom: number;
};

/**
 * Greedy pack for Daily Programme PDFs: put every table row that fits on the
 * current page. Date heading + column header + first row stay together.
 * Coordinates are already in canvas (or CSS) px at `scale`.
 */
export function paginateProgrammeTableCanvasPx(args: {
  root: HTMLElement;
  scaleY: number;
  totalHeightPx: number;
  pageHeightPx: number;
  subsequentPageHeightPx?: number;
}): number[] {
  const { root, scaleY, totalHeightPx, pageHeightPx, subsequentPageHeightPx } =
    args;
  if (totalHeightPx <= 0 || pageHeightPx <= 0) return [0];

  const rectRoot = root.getBoundingClientRect();
  const rootTop = rectRoot.top;
  const toY = (css: number, round: 'floor' | 'ceil') =>
    toScaledY(css, rootTop, scaleY, round);

  const units: ProgrammePackUnit[] = [];
  const blocks = Array.from(
    root.querySelectorAll('.pdf-day-block'),
  ) as HTMLElement[];
  const sources = blocks.length > 0 ? blocks : [root];

  for (const block of sources) {
    const header = block.querySelector(
      '.pdf-day-header, .print-date-header',
    ) as HTMLElement | null;
    const table = block.querySelector('table');
    const thead = table?.querySelector('thead') as HTMLElement | null;
    const rows = Array.from(
      table?.querySelectorAll('tbody tr') ?? [],
    ) as HTMLElement[];

    const headerTop = header
      ? toY(header.getBoundingClientRect().top, 'floor')
      : null;
    const theadTop = thead
      ? toY(thead.getBoundingClientRect().top, 'floor')
      : null;

    const measured = rows
      .map((row) => tableRowBounds(row))
      .filter((b): b is { top: number; bottom: number } => b != null);
    for (let i = 0; i < measured.length; i++) {
      const next = measured[i + 1];
      if (next && measured[i]!.bottom > next.top) {
        measured[i]!.bottom = next.top;
      }
    }

    const firstTop = measured[0]?.top ?? 0;
    const stacked =
      measured.length <= 1 ||
      measured.every((b, i) => i === 0 || b.top > firstTop + 2);

    const tableRect = table?.getBoundingClientRect();
    const theadHeight = thead?.getBoundingClientRect().height ?? 0;
    const fallbackBodyTop = tableRect ? tableRect.top + theadHeight : 0;
    const fallbackBodyH = tableRect
      ? Math.max(0, tableRect.bottom - fallbackBodyTop)
      : 0;
    const fallbackRowH =
      rows.length > 0 && fallbackBodyH > 0 ? fallbackBodyH / rows.length : 0;

    rows.forEach((row, index) => {
      let rowTop: number;
      let rowBottom: number;
      const bounds = stacked ? measured[index] : null;
      if (bounds && bounds.bottom > bounds.top) {
        rowTop = toY(bounds.top, 'floor');
        rowBottom = toY(bounds.bottom, 'ceil');
      } else {
        rowTop = toY(fallbackBodyTop + fallbackRowH * index, 'floor');
        rowBottom = toY(fallbackBodyTop + fallbackRowH * (index + 1), 'ceil');
      }
      if (index === 0) {
        const top = Math.min(
          headerTop ?? theadTop ?? rowTop,
          theadTop ?? rowTop,
          rowTop,
        );
        units.push({ top, bottom: rowBottom });
        return;
      }
      units.push({ top: rowTop, bottom: rowBottom });
    });

    if (rows.length === 0 && header) {
      const r = header.getBoundingClientRect();
      units.push({
        top: toY(r.top, 'floor'),
        bottom: toY(r.bottom, 'ceil'),
      });
    }
  }

  units.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  if (units.length === 0) return [0];

  const starts = [0];
  let pageStart = 0;
  let pageIndex = 0;
  let guard = 0;
  let unitIndex = 0;

  while (pageStart < totalHeightPx && guard < 200) {
    guard += 1;
    const pageH =
      pageIndex === 0 ? pageHeightPx : (subsequentPageHeightPx ?? pageHeightPx);
    const pageEnd = pageStart + pageH;
    let lastBottom = pageStart;
    let placed = false;

    while (unitIndex < units.length) {
      const unit = units[unitIndex]!;
      if (unit.bottom <= pageStart + 0.5) {
        unitIndex += 1;
        continue;
      }
      if (unit.bottom <= pageEnd + 0.5) {
        lastBottom = Math.max(lastBottom, unit.bottom);
        placed = true;
        unitIndex += 1;
        continue;
      }
      if (!placed) {
        lastBottom = Math.min(totalHeightPx, pageEnd);
        placed = true;
      }
      break;
    }

    if (!placed || lastBottom <= pageStart) break;
    pageStart = lastBottom;
    pageIndex += 1;
    if (pageStart < totalHeightPx - 1 && unitIndex < units.length) {
      starts.push(pageStart);
    }
  }

  return starts;
}

/**
 * Regions that should stay on one page when possible (signature / closing).
 * Prefer breaking just above the region if a cut would split it.
 */
export function getAvoidSplitRangesPx(
  root: HTMLElement,
  scale = 1,
): AvoidSplitRangePx[] {
  const rectRoot = root.getBoundingClientRect();
  const rootTop = rectRoot.top;
  const ranges: AvoidSplitRangePx[] = [];

  const pushEl = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    if (r.height <= 0) return;
    ranges.push({
      top: toScaledY(r.top, rootTop, scale, 'floor'),
      bottom: toScaledY(r.bottom, rootTop, scale, 'ceil'),
    });
  };

  const pushCssRange = (topCss: number, bottomCss: number) => {
    if (!(bottomCss > topCss)) return;
    ranges.push({
      top: toScaledY(topCss, rootTop, scale, 'floor'),
      bottom: toScaledY(bottomCss, rootTop, scale, 'ceil'),
    });
  };

  for (const el of Array.from(
    root.querySelectorAll('.signature, .letter-closing'),
  ) as HTMLElement[]) {
    pushEl(el);
  }

  // Keep table rows on one page so slices never cut through a cell.
  // Clamp each row to the next so one bad cell rect cannot swallow the table.
  const rowBounds = (
    Array.from(root.querySelectorAll('tbody tr, thead tr')) as HTMLElement[]
  )
    .map((row) => tableRowBounds(row))
    .filter((b): b is { top: number; bottom: number } => b != null)
    .sort((a, b) => a.top - b.top);
  for (let i = 0; i < rowBounds.length; i++) {
    const current = rowBounds[i]!;
    const next = rowBounds[i + 1];
    if (next && current.bottom > next.top) current.bottom = next.top;
    pushCssRange(current.top, current.bottom);
  }

  // Date heading + table start must travel together. Otherwise the date sits
  // alone at the bottom of a page and the table opens on the next page.
  // Never fall back to the whole table — that taller-than-page range would
  // skip remaining rows and leave a half-empty sheet.
  for (const header of Array.from(
    root.querySelectorAll('.pdf-day-header, .print-date-header'),
  ) as HTMLElement[]) {
    const headerRect = header.getBoundingClientRect();
    if (headerRect.height <= 0) continue;
    const block =
      header.closest('.pdf-day-block, .print-date-section') ??
      header.parentElement;
    const table = block?.querySelector('table');
    const firstBody = table?.querySelector('tbody tr') as HTMLElement | null;
    const firstHead = table?.querySelector('thead tr') as HTMLElement | null;
    const endBounds =
      (firstBody && tableRowBounds(firstBody)) ||
      (firstHead && tableRowBounds(firstHead));
    pushCssRange(
      headerRect.top,
      Math.max(headerRect.bottom, endBounds ? endBounds.bottom : headerRect.bottom),
    );
  }

  /**
   * Merge a run of sibling closing/signature rows into one avoid block
   * (includes the large margin between "Yours faithfully," and the name).
   */
  const pushSiblingRun = (
    start: HTMLElement,
    isContinuation: (el: HTMLElement) => boolean,
  ) => {
    if (start.closest('.letter-closing, .signature')) return;
    const r1 = start.getBoundingClientRect();
    if (r1.height <= 0) return;
    let top = toScaledY(r1.top, rootTop, scale, 'floor');
    let bottom = toScaledY(r1.bottom, rootTop, scale, 'ceil');
    let sibling = start.nextElementSibling;
    while (sibling instanceof HTMLElement && isContinuation(sibling)) {
      const r2 = sibling.getBoundingClientRect();
      if (r2.height > 0) {
        bottom = toScaledY(r2.bottom, rootTop, scale, 'ceil');
      }
      sibling = sibling.nextElementSibling;
    }
    ranges.push({ top, bottom });
  };

  // Fees / school letters: .right-tab + .right-tab-sign
  for (const tab of Array.from(
    root.querySelectorAll('.right-tab'),
  ) as HTMLElement[]) {
    const prev = tab.previousElementSibling;
    if (prev instanceof HTMLElement && prev.classList.contains('right-tab')) {
      continue;
    }
    pushSiblingRun(
      tab,
      (el) =>
        el.classList.contains('right-tab') ||
        el.classList.contains('right-tab-sign'),
    );
  }

  // Orphan .right-tab-sign (no preceding .right-tab handled above).
  for (const el of Array.from(
    root.querySelectorAll('.right-tab-sign'),
  ) as HTMLElement[]) {
    const prev = el.previousElementSibling;
    if (
      prev instanceof HTMLElement &&
      (prev.classList.contains('right-tab') ||
        prev.classList.contains('right-tab-sign'))
    ) {
      continue;
    }
    if (el.closest('.letter-closing, .signature')) continue;
    pushEl(el);
  }

  // General letters: consecutive .signature-line rows ("Yours faithfully," + name).
  for (const line of Array.from(
    root.querySelectorAll('.signature-line'),
  ) as HTMLElement[]) {
    const prev = line.previousElementSibling;
    if (
      prev instanceof HTMLElement &&
      prev.classList.contains('signature-line')
    ) {
      continue;
    }
    pushSiblingRun(line, (el) => el.classList.contains('signature-line'));
  }

  return ranges;
}

/**
 * If cutY falls through the interior of a text line, snap to that line's top
 * (previous page ends before the line) or bottom if the line starts this page.
 */
function snapCutOutOfLineInterior(
  cutY: number,
  renderedPx: number,
  lineRangesPx: LineRangePx[],
  /** Pull cut slightly above line.top to absorb DOM↔canvas drift. */
  safetyPx = 2,
): number {
  for (const line of lineRangesPx) {
    if (cutY <= line.top || cutY >= line.bottom) continue;
    // Mid-glyph cut — push the whole line to the next page when possible.
    if (line.top > renderedPx + 1) {
      return Math.max(renderedPx + 1, line.top - safetyPx);
    }
    return line.bottom;
  }
  return cutY;
}

/**
 * Place a cut in the safe middle of a line gap (away from anti-aliased ink on
 * both sides). If the cut is mid-glyph, move the whole line to the next page
 * when it fits; otherwise end after its ink inside the following gap.
 */
export function snapCutToNearestLineGap(
  cutY: number,
  renderedPx: number,
  lineRangesPx: LineRangePx[],
  maxCutY: number,
  clearancePx = 2,
): number {
  if (lineRangesPx.length === 0) return cutY;

  let y = Math.min(Math.max(cutY, renderedPx), maxCutY);

  const gapCutAfter = (lineIndex: number): number => {
    const line = lineRangesPx[lineIndex]!;
    const next = lineRangesPx[lineIndex + 1];
    const gapStart = line.bottom;
    const gapEnd = next ? next.top : maxCutY;
    if (gapEnd > gapStart + 1) {
      // Mid-gap — maximum distance from both glyph edges (DOM + canvas).
      return Math.min(maxCutY, (gapStart + Math.min(gapEnd, maxCutY)) / 2);
    }
    return Math.min(maxCutY, gapStart + Math.min(clearancePx, 1));
  };

  for (let i = 0; i < lineRangesPx.length; i++) {
    const line = lineRangesPx[i]!;
    const next = lineRangesPx[i + 1];
    const gapStart = line.bottom;
    const gapEnd = next ? next.top : maxCutY;

    // Mid-glyph → prefer pushing the line to the next page.
    if (y > line.top && y < line.bottom) {
      if (line.top > renderedPx + 1) {
        // End in the gap *before* this line (after previous line).
        return i > 0
          ? gapCutAfter(i - 1)
          : Math.min(line.top, maxCutY);
      }
      // Line started on this page — keep it and cut in the following gap.
      return gapCutAfter(i);
    }

    // Already in the gap after this line — park at mid-gap.
    if (y >= gapStart && y <= gapEnd) {
      return gapCutAfter(i);
    }
  }

  return Math.min(Math.max(y, renderedPx), maxCutY);
}

/** Ensure every page-start offset sits in a line gap (not mid-glyph). */
export function sanitizePageStartOffsetsPx(
  starts: number[],
  lineRangesPx: LineRangePx[],
  totalHeightPx: number,
  clearancePx = 2,
): number[] {
  if (starts.length === 0) return [0];
  const next = starts.map((start, index) => {
    if (index === 0) return 0;
    const prev = starts[index - 1] ?? 0;
    return snapCutToNearestLineGap(
      start,
      prev,
      lineRangesPx,
      totalHeightPx,
      clearancePx,
    );
  });
  // Drop duplicates / non-advancing cuts.
  const deduped: number[] = [0];
  for (let i = 1; i < next.length; i++) {
    const y = next[i]!;
    if (y > deduped[deduped.length - 1]! + 1 && y < totalHeightPx) {
      deduped.push(y);
    }
  }

  // Drop a trailing page start that only leaves an empty/descender sliver.
  const sampleLine = lineRangesPx[0];
  const minTailPx = sampleLine
    ? Math.max(12, sampleLine.bottom - sampleLine.top)
    : 12;
  while (deduped.length > 1) {
    const last = deduped[deduped.length - 1]!;
    if (totalHeightPx - last >= minTailPx) break;
    deduped.pop();
  }

  return deduped;
}

export function pickSliceHeightPx(args: {
  renderedPx: number;
  maxSliceHeightPx: number;
  totalHeightPx: number;
  breakpointsPx: number[];
  avoidRangesPx?: AvoidSplitRangePx[];
  lineRangesPx?: LineRangePx[];
}): number {
  const {
    renderedPx,
    maxSliceHeightPx,
    totalHeightPx,
    breakpointsPx,
    avoidRangesPx = [],
    lineRangesPx = [],
  } = args;
  const remaining = totalHeightPx - renderedPx;
  if (remaining <= 0) return 0;
  const defaultHeight = Math.min(maxSliceHeightPx, remaining);
  if (defaultHeight >= remaining) return remaining;

  const minUsefulSlicePx = 80;
  const minBreakY = renderedPx + minUsefulSlicePx;
  let targetEnd = renderedPx + defaultHeight;

  // If the default cut would split an avoid-range, prefer ending at its top.
  // Take the earliest such top so nested/overlapping ranges stay intact.
  // Skip ranges taller than a page — pulling to their top would leave the
  // rest of the page blank (e.g. row 5 of 10 shoved to the next sheet).
  for (const range of avoidRangesPx) {
    if (range.top >= targetEnd || range.bottom <= targetEnd) continue;
    if (range.bottom - range.top > maxSliceHeightPx) continue;
    if (range.top > renderedPx) {
      targetEnd = Math.min(targetEnd, range.top);
    }
  }

  // Never end inside a glyph — snap out of any line interior.
  // Safety grows with line height so DOM↔html2canvas drift doesn't re-cut glyphs.
  const sampleLine = lineRangesPx[0];
  const safetyPx = sampleLine
    ? Math.max(4, Math.round((sampleLine.bottom - sampleLine.top) * 0.2))
    : 4;
  const clearancePx = sampleLine
    ? Math.max(2, Math.round((sampleLine.bottom - sampleLine.top) * 0.12))
    : 2;
  const pageEndLimit = renderedPx + defaultHeight;

  targetEnd = snapCutOutOfLineInterior(
    targetEnd,
    renderedPx,
    lineRangesPx,
    safetyPx,
  );

  let best: number | null = null;
  for (const bp of breakpointsPx) {
    if (bp <= minBreakY) continue;
    if (bp > targetEnd) break;
    best = bp;
  }

  let cutY = best ?? targetEnd;

  // Final safety: if we still landed inside a line (e.g. no breakpoints), snap again.
  cutY = snapCutOutOfLineInterior(
    cutY,
    renderedPx,
    lineRangesPx,
    safetyPx,
  );
  cutY = snapCutToNearestLineGap(
    cutY,
    renderedPx,
    lineRangesPx,
    pageEndLimit,
    clearancePx,
  );

  // Never start the next page inside an avoid-range (e.g. signature gap).
  for (const range of avoidRangesPx) {
    if (range.bottom - range.top > maxSliceHeightPx) continue;
    if (cutY > range.top + 1 && cutY < range.bottom - 1 && range.top > renderedPx) {
      cutY = range.top;
    }
  }

  // Re-check lines after avoid snap (signature top may land mid-body-line).
  cutY = snapCutToNearestLineGap(
    cutY,
    renderedPx,
    lineRangesPx,
    pageEndLimit,
    clearancePx,
  );

  // Clamp: must advance, must not exceed remaining / default page window too wildly.
  // Allow shorter-than-default pages when we snap back for avoid/line safety.
  const slice = cutY - renderedPx;
  if (slice <= 0) return defaultHeight;
  return Math.min(slice, remaining);
}

/**
 * Shared preview + PDF pagination from a laid-out letter content root.
 * Both callers must pass an identically styled measure host for WYSIWYG breaks.
 */
export function paginateLetterContentRoot(
  root: HTMLElement,
  pageHeightPx: number,
  subsequentPageHeightPx?: number,
): number[] {
  return computePageStartOffsetsPx({
    totalHeightPx: root.scrollHeight,
    pageHeightPx,
    subsequentPageHeightPx,
    breakpointsPx: getContentBreakpointsPx(root, 1),
    avoidRangesPx: getAvoidSplitRangesPx(root, 1),
    lineRangesPx: getLineRangesPx(root, 1),
  });
}

/** Cumulative Y offsets where each page of content begins (CSS/canvas px). */
export function computePageStartOffsetsPx(args: {
  totalHeightPx: number;
  /** Content-area height for the first page (e.g. below letterhead). */
  pageHeightPx: number;
  /**
   * Content-area height for page 2+ when taller than the first page
   * (e.g. no letterhead clearance on continuation pages).
   */
  subsequentPageHeightPx?: number;
  breakpointsPx: number[];
  avoidRangesPx?: AvoidSplitRangePx[];
  lineRangesPx?: LineRangePx[];
}): number[] {
  const {
    totalHeightPx,
    pageHeightPx,
    subsequentPageHeightPx,
    breakpointsPx,
    avoidRangesPx,
    lineRangesPx,
  } = args;
  if (totalHeightPx <= 0 || pageHeightPx <= 0) return [0];

  const sampleLine = lineRangesPx?.[0];
  const sampleClearancePx = sampleLine
    ? Math.max(2, Math.round((sampleLine.bottom - sampleLine.top) * 0.12))
    : 2;

  const starts = [0];
  let renderedPx = 0;
  let guard = 0;

  while (renderedPx < totalHeightPx && guard < 100) {
    guard += 1;
    const pageIndex = starts.length - 1;
    const maxSliceHeightPx =
      pageIndex === 0
        ? pageHeightPx
        : (subsequentPageHeightPx ?? pageHeightPx);
    if (maxSliceHeightPx <= 0) break;
    const slice = pickSliceHeightPx({
      renderedPx,
      maxSliceHeightPx,
      totalHeightPx,
      breakpointsPx,
      avoidRangesPx,
      lineRangesPx,
    });
    if (slice <= 0) break;
    renderedPx += slice;
    // pickSliceHeightPx already line-snapped — don't snap again here or
    // clearance can cascade into following line boxes and add extra pages.
    if (renderedPx < totalHeightPx) {
      starts.push(renderedPx);
    }
  }

  return sanitizePageStartOffsetsPx(
    starts,
    lineRangesPx ?? [],
    totalHeightPx,
    sampleClearancePx,
  );
}

/**
 * Final safety net for PDF slicing: walk up the canvas from proposedCutY until
 * a blank (ink-free) row is found so glyphs are never split mid-line even when
 * DOM getClientRects drift from html2canvas output.
 */
function isInsideAvoidRangeInterior(
  y: number,
  avoidRangesPx: AvoidSplitRangePx[],
): boolean {
  for (const range of avoidRangesPx) {
    if (y > range.top + 1 && y < range.bottom - 1) return true;
  }
  return false;
}

export function snapCanvasCutToBlankRow(args: {
  canvas: HTMLCanvasElement;
  proposedCutY: number;
  minCutY: number;
  /**
   * How far to search for a blank gap (canvas px). Prefer downward so we clear
   * descender anti-alias without pulling the previous line onto the next page.
   */
  searchWindowPx?: number;
  /** Do not snap into interior blank gaps (e.g. signature spacing). */
  avoidRangesPx?: AvoidSplitRangePx[];
}): number {
  const { canvas, proposedCutY, minCutY } = args;
  const searchWindowPx = args.searchWindowPx ?? 16;
  const avoidRangesPx = args.avoidRangesPx ?? [];
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return proposedCutY;

  const width = canvas.width;
  const height = canvas.height;
  // Bias past DOM cut so subpixel / anti-alias ink stays on the previous page.
  const cut = Math.min(Math.max(Math.ceil(proposedCutY), 0), height);
  const downLimit = Math.min(height - 1, cut + searchWindowPx);
  // Upward rescue only for true mid-glyph drift — never a whole line.
  const upLimit = Math.max(Math.ceil(minCutY), cut - Math.min(3, searchWindowPx));

  const isBlankRow = (y: number): boolean => {
    if (y < 0 || y >= height) return true;
    const data = ctx.getImageData(0, y, width, 1).data;
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3] ?? 0;
      if (a < 8) continue;
      const r = data[i] ?? 255;
      const g = data[i + 1] ?? 255;
      const b = data[i + 2] ?? 255;
      if (r < 248 || g < 248 || b < 248) return false;
    }
    return true;
  };

  const isValidBlankCut = (y: number): boolean =>
    isBlankRow(y) && !isInsideAvoidRangeInterior(y, avoidRangesPx);

  /** First ink row after a blank band starting at blankY (exclusive end cut). */
  const cutAfterBlankBand = (blankY: number): number => {
    let y = blankY;
    while (y + 1 <= downLimit && isValidBlankCut(y + 1)) {
      y += 1;
    }
    // Next page starts on the first non-blank row after the gap.
    return Math.min(height, y + 1);
  };

  // Already in a gap (or one px into descender hairline) — consume the whole gap.
  for (const start of [cut, cut - 1, cut + 1]) {
    if (start < upLimit || start >= height) continue;
    if (isValidBlankCut(start)) {
      return Math.max(minCutY + 1, cutAfterBlankBand(start));
    }
  }

  // In ink: search downward for the next gap (keep current line on this page).
  for (let y = cut + 1; y <= downLimit; y++) {
    if (isValidBlankCut(y)) {
      return Math.max(minCutY + 1, cutAfterBlankBand(y));
    }
  }

  // Last resort: tiny upward step only (DOM↔canvas drift of a couple px).
  for (let y = cut - 1; y >= upLimit; y--) {
    if (isValidBlankCut(y)) {
      return Math.max(minCutY + 1, y + 1);
    }
  }

  return cut;
}
