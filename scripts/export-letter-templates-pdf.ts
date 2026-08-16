/**
 * Export LetterMaster templates from the database as PDFs.
 *
 * Usage:
 *   npx tsx scripts/export-letter-templates-pdf.ts
 *   npx tsx scripts/export-letter-templates-pdf.ts --out tmp/letter-templates
 *   npx tsx scripts/export-letter-templates-pdf.ts --type fees --locale mr
 *   npx tsx scripts/export-letter-templates-pdf.ts --id <uuid>
 *   npx tsx scripts/export-letter-templates-pdf.ts --list
 *   npx tsx scripts/export-letter-templates-pdf.ts --no-letterhead
 *
 * Requires Chromium for Playwright:
 *   npx playwright install chromium
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';
import {
  resolveServiceRoleKey,
  resolveSupabaseUrl,
} from '../lib/supabase/config';
import {
  getLetterheadContentPaddingMm,
  resolveLetterheadUrl,
  stripLetterheadFromHtml,
} from '../lib/letters/letterhead';
import {
  LETTER_PAPER_DIMENSIONS_MM,
  LETTER_PAPER_MARGIN_MM,
  resolveLetterPaperSize,
  type LetterPaperSize,
} from '../lib/letters/paper-size';

dotenv.config({ path: '.env.local' });
dotenv.config();

const ROOT = process.cwd();
const DEFAULT_OUT_DIR = path.join(ROOT, 'tmp', 'letter-templates');

type LetterMasterRow = {
  id: string;
  name: string;
  letter_type: string;
  letter_locale: string;
  template_html: string;
  letterhead_url: string | null;
  letterhead_mode: string | null;
  paper_size: string | null;
};

type CliArgs = {
  out: string;
  type?: string;
  locale?: string;
  id?: string;
  list: boolean;
  noLetterhead: boolean;
  help: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    out: DEFAULT_OUT_DIR,
    list: false,
    noLetterhead: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token?.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    const hasValue = Boolean(next && !next.startsWith('--'));

    if (key === 'out' && hasValue) {
      args.out = path.resolve(next);
      i += 1;
      continue;
    }
    if (key === 'type' && hasValue) {
      args.type = next;
      i += 1;
      continue;
    }
    if (key === 'locale' && hasValue) {
      args.locale = next;
      i += 1;
      continue;
    }
    if (key === 'id' && hasValue) {
      args.id = next;
      i += 1;
      continue;
    }
    if (key === 'list') args.list = true;
    if (key === 'no-letterhead') args.noLetterhead = true;
    if (key === 'help' || key === 'h') args.help = true;
  }

  return args;
}

function printHelp(): void {
  console.log(`Export LetterMaster rows as PDFs.

Usage:
  npx tsx scripts/export-letter-templates-pdf.ts [options]

Options:
  --out <dir>         Output directory (default: tmp/letter-templates)
  --type <code>       Filter by letter_type (e.g. fees, general, ward)
  --locale <en|mr>    Filter by letter_locale
  --id <uuid>         Export a single LetterMaster row
  --list              Print matching templates without writing PDFs
  --no-letterhead     Skip letterhead background
  --help              Show this help
`);
}

function sanitizeFileNameSegment(value: string): string {
  return value
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

function templateFileName(row: LetterMasterRow, usedNames: Set<string>): string {
  const typePart = sanitizeFileNameSegment(row.letter_type || 'letter');
  const localePart = sanitizeFileNameSegment(row.letter_locale || 'en');
  const namePart = sanitizeFileNameSegment(row.name || 'template');
  let base = `${typePart}-${localePart}-${namePart}`;
  if (usedNames.has(base.toLowerCase())) {
    base = `${base}-${row.id.slice(0, 8)}`;
  }
  usedNames.add(base.toLowerCase());
  return `${base}.pdf`;
}

function highlightPlaceholders(html: string): string {
  return html.replace(
    /\{\{(\w+)\}\}/g,
    '<span class="tpl-var">{{$1}}</span>',
  );
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

async function fileToDataUrl(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.webp'
        ? 'image/webp'
        : ext === '.gif'
          ? 'image/gif'
          : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function resolveLetterheadSrc(
  paperSize: LetterPaperSize,
  customUrl: string | null,
): Promise<string | null> {
  const resolved = resolveLetterheadUrl(paperSize, customUrl);
  if (!resolved) return null;

  if (resolved.startsWith('data:')) return resolved;

  if (resolved.startsWith('/')) {
    const localPath = path.join(ROOT, 'public', resolved.replace(/^\//, ''));
    try {
      return await fileToDataUrl(localPath);
    } catch {
      return pathToFileURL(localPath).href;
    }
  }

  return resolved;
}

function buildTemplateHtml(options: {
  name: string;
  letterType: string;
  letterLocale: string;
  paperSize: LetterPaperSize;
  templateHtml: string;
  letterheadSrc: string | null;
  letterheadMode: 'half' | 'full';
}): string {
  const { widthMm, heightMm } = LETTER_PAPER_DIMENSIONS_MM[options.paperSize];
  const marginMm = LETTER_PAPER_MARGIN_MM[options.paperSize];
  const hasLetterhead = Boolean(options.letterheadSrc);
  const isHalf = options.letterheadMode === 'half' && hasLetterhead;
  const topPaddingMm = hasLetterhead
    ? isHalf
      ? 28
      : getLetterheadContentPaddingMm(options.paperSize)
    : marginMm;
  const fontFamily =
    options.letterLocale === 'mr'
      ? '"Noto Sans Devanagari","Kohinoor Devanagari","ITF Devanagari","Nirmala UI",system-ui,sans-serif'
      : 'system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  const fontSizePx =
    options.paperSize === 'a4' ? 16 : options.paperSize === 'b5' ? 15 : 14;

  const bodyHtml = highlightPlaceholders(
    stripLetterheadFromHtml(options.templateHtml),
  );
  const wrappedBody = /class="[^"]*letter-content/.test(bodyHtml)
    ? bodyHtml
    : `<div class="letter-content">${bodyHtml}</div>`;

  const letterheadMarkup = !options.letterheadSrc
    ? ''
    : isHalf
      ? `<img class="letterhead letterhead--half" src="${escapeHtmlAttr(options.letterheadSrc)}" alt="" />`
      : `<img class="letterhead letterhead--full" src="${escapeHtmlAttr(options.letterheadSrc)}" alt="" />`;

  return `<!DOCTYPE html>
<html lang="${options.letterLocale === 'mr' ? 'mr' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtmlAttr(options.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: ${fontFamily};
    }
    .page {
      box-sizing: border-box;
      width: ${widthMm}mm;
      min-height: ${heightMm}mm;
      padding: ${topPaddingMm}mm ${marginMm}mm 8mm ${marginMm}mm;
      position: relative;
    }
    .letterhead {
      pointer-events: none;
    }
    .letterhead--full {
      position: absolute;
      top: 0;
      left: 0;
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      object-fit: fill;
      z-index: 0;
    }
    .letterhead--half {
      display: block;
      width: 50%;
      max-width: 50%;
      height: auto;
      margin: 0 auto 8mm auto;
    }
    .letter-body {
      position: relative;
      z-index: 1;
    }
    .letter-content {
      white-space: normal;
      color: #000;
      margin: 0;
      font-size: ${fontSizePx}px;
      line-height: 1.75;
      font-family: inherit;
    }
    .letter-closing, .right-tab, .right-tab-sign, .signature, .signature-line {
      display: block !important;
      width: 100% !important;
      text-align: right !important;
    }
    .address, .recipient, .recipient-bottom {
      max-width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .tpl-var {
      font-weight: 700;
      background: #fff3bf;
      padding: 0 2px;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <div class="page">
    ${letterheadMarkup}
    <div class="letter-body">${wrappedBody}</div>
  </div>
</body>
</html>`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const supabase = createClient(resolveSupabaseUrl(), resolveServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from('LetterMaster')
    .select(
      'id, name, letter_type, letter_locale, template_html, letterhead_url, letterhead_mode, paper_size',
    )
    .order('letter_type', { ascending: true })
    .order('letter_locale', { ascending: true })
    .order('name', { ascending: true });

  if (args.id) query = query.eq('id', args.id);
  if (args.type) query = query.eq('letter_type', args.type);
  if (args.locale) query = query.eq('letter_locale', args.locale);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as LetterMasterRow[];
  if (rows.length === 0) {
    console.log('No LetterMaster rows matched.');
    return;
  }

  console.log(`Found ${rows.length} LetterMaster template(s).`);
  for (const row of rows) {
    const paperSize = resolveLetterPaperSize(row.paper_size, row.letter_type);
    console.log(
      `  - ${row.letter_type}/${row.letter_locale}  ${row.name}  [${paperSize.toUpperCase()}]  ${row.id}`,
    );
  }

  if (args.list) return;

  await mkdir(args.out, { recursive: true });

  const browser = await chromium.launch();
  const usedNames = new Set<string>();

  try {
    for (const row of rows) {
      const paperSize = resolveLetterPaperSize(row.paper_size, row.letter_type);
      const { widthMm, heightMm } = LETTER_PAPER_DIMENSIONS_MM[paperSize];
      const letterheadSrc = args.noLetterhead
        ? null
        : await resolveLetterheadSrc(paperSize, row.letterhead_url);
      const html = buildTemplateHtml({
        name: row.name,
        letterType: row.letter_type,
        letterLocale: row.letter_locale,
        paperSize,
        templateHtml: row.template_html,
        letterheadSrc,
        letterheadMode: row.letterhead_mode === 'half' ? 'half' : 'full',
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdf = await page.pdf({
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      await page.close();

      const fileName = templateFileName(row, usedNames);
      const filePath = path.join(args.out, fileName);
      await writeFile(filePath, pdf);
      console.log(`  wrote ${filePath}`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nDone. ${rows.length} PDF(s) in ${args.out}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/Executable doesn't exist|browserType.launch/i.test(message)) {
    console.error(
      'Playwright Chromium is not installed. Run: npx playwright install chromium',
    );
  } else {
    console.error('Failed to export letter templates:', error);
  }
  process.exit(1);
});
