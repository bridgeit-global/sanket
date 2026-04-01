import { jsPDF } from 'jspdf';

export type ThermalReceiptData = {
  token: string;
  createdAt: Date | string;
  name: string;
  mobile?: string | null;
  serviceName: string;
  width?: number;
};

type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled';

const DEFAULT_WIDTH = 22;

function sanitizeForThermal(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(text: string, width: number): string[] {
  const clean = sanitizeForThermal(text);
  if (!clean) return ['-'];

  const words = clean.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      if (word.length <= width) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += width) {
          lines.push(word.slice(i, i + width));
        }
      }
      continue;
    }

    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      if (word.length <= width) {
        current = word;
      } else {
        for (let i = 0; i < word.length; i += width) {
          const chunk = word.slice(i, i + width);
          if (chunk.length === width || i + width < word.length) {
            lines.push(chunk);
          } else {
            current = chunk;
          }
        }
        if (word.length % width === 0) {
          current = '';
        }
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : ['-'];
}

function formatLabelValue(label: string, value: string, width: number): string[] {
  const normalizedLabel = `${sanitizeForThermal(label)}:`;
  const labelPrefix = `${normalizedLabel} `;
  const availableWidth = Math.max(8, width - labelPrefix.length);
  const wrapped = wrapText(value, availableWidth);

  return wrapped.map((line, index) => {
    if (index === 0) {
      return `${labelPrefix}${line}`.slice(0, width);
    }
    return `${' '.repeat(labelPrefix.length)}${line}`.slice(0, width);
  });
}

function formatFreeText(value: string, width: number): string[] {
  return wrapText(value, width);
}

function getTokenSuffix(token: string): string {
  const cleanToken = sanitizeForThermal(token);
  if (!cleanToken) return 'NA';
  if (!cleanToken.includes('-')) return cleanToken;
  return cleanToken.split('-').pop() || cleanToken;
}

export function buildThermalTicketText(data: ThermalReceiptData): string {
  const rawWidth = data.width ?? DEFAULT_WIDTH;
  const width = Math.max(16, Math.min(60, Math.floor(rawWidth)));
  const separator = '-'.repeat(width);
  const date = new Date(data.createdAt);
  const dateString = date.toLocaleDateString('en-GB');
  const timeString = date
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    .toUpperCase();

  const lines: string[] = [
    separator,
    ...formatFreeText('Hon. MLA Sana Malik Shaikh', width),
    ...formatFreeText('Anushakti Nagar Constituency', width),
    separator,
    'TOKEN NO',
    getTokenSuffix(data.token),
    separator,
    ...formatLabelValue('Date', dateString, width),
    ...formatLabelValue('Time', timeString, width),
    separator,
    ...formatLabelValue('Name', data.name, width),
    ...formatLabelValue('Mobile', data.mobile || 'xxxxxxxxxx', width),
    separator,
    ...formatLabelValue('Service', data.serviceName, width),
    separator,
    ...formatFreeText('Please wait for your turn', width),
    separator,
    '',
  ];

  return lines.map((line) => line.slice(0, width)).join('\n');
}

function triggerTextDownload(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${fileName}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function shareThermalTicket(content: string, fileName: string): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      const textFile = new File([content], `${fileName}.txt`, { type: 'text/plain' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [textFile] })) {
        await navigator.share({
          title: 'Thermal Ticket',
          text: 'Share this ticket with your Bluetooth thermal printer app.',
          files: [textFile],
        });
      } else {
        await navigator.share({
          title: 'Thermal Ticket',
          text: content,
        });
      }
      return 'shared';
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content);
      return 'copied';
    } catch {
      // Fall through to download when clipboard is blocked.
    }
  }

  triggerTextDownload(content, fileName);
  return 'downloaded';
}

function buildThermalPdfBlob(content: string): Blob {
  const lines = content.split('\n');
  const mmPerLine = 4.8;
  const topBottomPadding = 6;
  const pageHeight = Math.max(60, topBottomPadding * 2 + lines.length * mmPerLine);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    // 58mm roll width produces larger, more readable thermal output.
    format: [58, pageHeight],
    compress: true,
  });

  doc.setFont('courier', 'normal');
  doc.setFontSize(11);

  let y = topBottomPadding;
  for (const line of lines) {
    doc.text(line, 2, y, { baseline: 'top' });
    y += mmPerLine;
  }

  return doc.output('blob');
}

function triggerPdfDownload(content: string, fileName: string): void {
  const blob = buildThermalPdfBlob(content);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${fileName}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function shareThermalTicketPdf(content: string, fileName: string): Promise<ShareOutcome> {
  const pdfBlob = buildThermalPdfBlob(content);
  const pdfFile = new File([pdfBlob], `${fileName}.pdf`, { type: 'application/pdf' });

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: 'Thermal Ticket PDF',
          text: 'Share this PDF with your Bluetooth thermal printer app.',
          files: [pdfFile],
        });
        return 'shared';
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  triggerPdfDownload(content, fileName);
  return 'downloaded';
}
