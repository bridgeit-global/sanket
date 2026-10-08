import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';

/** Optional table a user can attach to a general letter. */
export type GeneralLetterTable = {
  /** Line printed above the table. Empty omits it. */
  caption: string;
  columns: string[];
  rows: string[][];
  /** Leading अनु. क्र. / Sr. column. */
  showSerial: boolean;
  /** Closing row that sums the last column when those cells are numbers. */
  showTotal: boolean;
};

export const GENERAL_LETTER_TABLE_MAX_COLUMNS = 6;
export const GENERAL_LETTER_TABLE_MAX_ROWS = 25;

export function createEmptyGeneralLetterTable(): GeneralLetterTable {
  return {
    caption: '',
    columns: ['', ''],
    rows: [
      ['', ''],
      ['', ''],
      ['', ''],
    ],
    showSerial: true,
    showTotal: false,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Restore a saved table. Empty or invalid JSON means the user did not add one. */
export function parseGeneralLetterTable(raw: unknown): GeneralLetterTable | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (!isStringArray(record.columns) || record.columns.length === 0) return null;
  if (!Array.isArray(record.rows)) return null;

  const columns = record.columns.map((column) => column);
  const rows = record.rows
    .filter((row): row is string[] => isStringArray(row))
    .map((row) => columns.map((_, index) => row[index] ?? ''));
  if (rows.length === 0) return null;

  return {
    caption: typeof record.caption === 'string' ? record.caption : '',
    columns,
    rows,
    showSerial: record.showSerial !== false,
    showTotal: record.showTotal === true,
  };
}

export function serializeGeneralLetterTable(
  table: GeneralLetterTable | null,
): string {
  if (!table) return '';
  return JSON.stringify(table);
}

export function filterGeneralLetterTableText(
  raw: string,
  filterText: (value: string) => string,
): string {
  const table = parseGeneralLetterTable(raw);
  if (!table) return '';
  return serializeGeneralLetterTable({
    ...table,
    caption: filterText(table.caption),
    columns: table.columns.map((column) => filterText(column)),
    rows: table.rows.map((row) => row.map((cell) => filterText(cell))),
  });
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseTableAmount(value: string): number | null {
  const western = toWesternDigits(value).replace(/,/g, '').replace(/\s/g, '').trim();
  if (!western || !/^-?\d+(\.\d+)?$/.test(western)) return null;
  const amount = Number(western);
  return Number.isFinite(amount) ? amount : null;
}

function formatTableAmount(amount: number, locale: LetterLocale): string {
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString('en-IN')
    : amount.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
  return toLocaleDigits(formatted, locale);
}

function formatTableCell(value: string, locale: LetterLocale): string {
  const trimmed = value.trim();
  if (!trimmed) return '&nbsp;';
  const amount = parseTableAmount(trimmed);
  if (amount !== null) return escapeHtmlText(formatTableAmount(amount, locale));
  return escapeHtmlText(toLocaleDigits(trimmed, locale));
}

/** HTML inserted after the paragraphs. Empty when the user has not added a table. */
export function formatGeneralLetterTableHtml(
  raw: unknown,
  locale: LetterLocale,
): string {
  const table = parseGeneralLetterTable(raw);
  if (!table) return '';

  const serialHeader = locale === 'mr' ? 'अनु. क्र.' : 'Sr.';
  const totalLabel = locale === 'mr' ? 'एकूण' : 'Total';
  const border =
    'border:1px solid #000;padding:4px 6px;vertical-align:top;font-weight:normal;overflow-wrap:anywhere;word-break:break-word;';
  const head = `${border}font-weight:bold;text-align:center;`;
  const columnCount = table.columns.length + (table.showSerial ? 1 : 0);

  const headerCells = [
    ...(table.showSerial
      ? [`<th style="${head}width:56px;">${serialHeader}</th>`]
      : []),
    ...table.columns.map(
      (column) => `<th style="${head}">${escapeHtmlText(column) || '&nbsp;'}</th>`,
    ),
  ].join('');

  const bodyRows = table.rows
    .map((row, index) => {
      const cells = [
        ...(table.showSerial
          ? [
              `<td style="${border}text-align:center;width:56px;">${escapeHtmlText(toLocaleDigits(index + 1, locale))}</td>`,
            ]
          : []),
        ...table.columns.map((_, columnIndex) => {
          const align =
            table.showTotal && columnIndex === table.columns.length - 1
              ? 'text-align:right;'
              : 'text-align:left;';
          return `<td style="${border}${align}">${formatTableCell(row[columnIndex] ?? '', locale)}</td>`;
        }),
      ];
      return `<tr>${cells.join('')}</tr>`;
    })
    .join('');

  let totalRow = '';
  if (table.showTotal && columnCount > 0) {
    const lastValues = table.rows.map(
      (row) => row[table.columns.length - 1] ?? '',
    );
    const amounts = lastValues
      .map((value) => parseTableAmount(value))
      .filter((value): value is number => value !== null);
    const sumText =
      amounts.length > 0
        ? escapeHtmlText(
            formatTableAmount(
              Math.round(amounts.reduce((sum, amount) => sum + amount, 0) * 100) / 100,
              locale,
            ),
          )
        : '&nbsp;';
    if (columnCount === 1) {
      totalRow = `<tr><td style="${border}text-align:right;font-weight:bold;">${totalLabel}: ${sumText}</td></tr>`;
    } else {
      totalRow = `<tr><td colspan="${columnCount - 1}" style="${border}text-align:right;font-weight:bold;">${totalLabel}</td><td style="${border}text-align:right;font-weight:bold;">${sumText}</td></tr>`;
    }
  }

  const caption = table.caption.trim()
    ? `<p class="paragraph" style="text-indent:0;margin:8px 0;">${escapeHtmlText(toLocaleDigits(table.caption.trim(), locale))}</p>`
    : '';

  return `${caption}<table class="letter-table" style="width:100%;border-collapse:collapse;margin:8px 0 16px;"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}${totalRow}</tbody></table>`;
}
