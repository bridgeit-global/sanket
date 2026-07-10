'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  FileDown,
  Calendar,
  ImageIcon,
  Loader2,
  MapPin,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/hooks/use-translations';
import {
  buildLetterBody,
  DEFAULT_OFFICE_ADDRESS,
  DEFAULT_RATION_OFFICE_ADDRESS,
  DEFAULT_SIGNATORY,
  LETTER_TYPES,
  type CommonLetterFields,
  type DomicileLetterFields,
  type FeesLetterFields,
  type IncomeLetterFields,
  type LetterLocale,
  type LetterType,
  type PersonGender,
  type RationLetterFields,
  type SchoolAdmissionLetterFields,
  type SchoolTransferLetterFields,
} from '@/lib/letters/templates';
import {
  getLetterheadContentPaddingMm,
  LETTER_PAPER_ASPECT_RATIO,
  LETTERHEAD_HEADER_HEIGHT_RATIO,
  resolveLetterheadUrl,
  stripLetterheadFromHtml,
} from '@/lib/letters/letterhead';
import { buildRenderedLetterHtml, type LetterheadMode } from '@/lib/letters/render-template';
import { getDefaultTemplateHtml } from '@/lib/letters/default-template-html';
import {
  getDefaultLetterPaperSize,
  getLetterPaperContentWidthPx,
  getLetterPaperLabel,
  LETTER_PAPER_MARGIN_MM,
  LETTER_PAPER_SIZES,
  resolveLetterPaperSize,
  type LetterPaperSize,
} from '@/lib/letters/paper-size';
import { exportElementToPdf } from '@/lib/pdf/export-element-to-pdf';
import { DateRangePicker } from '@/components/date-range-picker';
import { ModulePageHeader } from '@/components/module-page-header';
import {
  createEmptyAddressParts,
  findDefaultAddress,
  LetterAddressField,
  type AddressMasterRow,
} from '@/components/letter-address-field';
import {
  formatAddressMaster,
  hasAddressContent,
  mergeAddressParts,
  parseFreeTextAddressForLocale,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import { toWesternDigits } from '@/lib/locale-digits';
import { cn } from '@/lib/utils';

const ALL_LETTER_TYPES = 'all' as const;
type SavedLetterTypeFilter = LetterType | typeof ALL_LETTER_TYPES | 'ration';
const LETTER_LOCALES: LetterLocale[] = ['en', 'mr'];

function isRationLetterType(type: LetterType): boolean {
  return type.startsWith('ration-');
}

function matchesSavedLetterTypeFilter(
  letterType: string,
  filter: SavedLetterTypeFilter,
): boolean {
  if (filter === ALL_LETTER_TYPES) return true;
  if (filter === 'ration') {
    return letterType === 'ration' || letterType.startsWith('ration-');
  }
  return letterType === filter;
}

function getFieldsForLetterType(
  type: LetterType,
  fields: {
    feesFields: FeesLetterFields;
    schoolAdmissionFields: SchoolAdmissionLetterFields;
    schoolTransferFields: SchoolTransferLetterFields;
    rationFields: RationLetterFields;
    incomeFields: IncomeLetterFields;
    domicileFields: DomicileLetterFields;
  },
) {
  switch (type) {
    case 'fees':
      return fields.feesFields;
    case 'school-admission':
      return fields.schoolAdmissionFields;
    case 'school-transfer':
      return fields.schoolTransferFields;
    case 'income':
      return fields.incomeFields;
    case 'domicile':
      return fields.domicileFields;
    default:
      if (isRationLetterType(type)) return fields.rationFields;
      return fields.feesFields;
  }
}

function isLetterWithinDateRange(
  createdAt: string | Date,
  startDate: string,
  endDate: string,
): boolean {
  const date = new Date(createdAt);
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

function todayDisplay(letterLocale: LetterLocale) {
  return new Date().toLocaleDateString(letterLocale === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function todayIsoDate() {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatIsoForLocaleDisplay(iso: string, locale: LetterLocale) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function tryParseDisplayToIso(displayValue: string): string | null {
  // Best-effort parse for values like "09/07/2026" (ASCII digits).
  const m = displayValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : iso;
}

function LetterDatePicker({
  locale,
  value,
  onValueChange,
  placeholder,
}: {
  locale: LetterLocale;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tempIso, setTempIso] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    const parsed = tryParseDisplayToIso(value);
    setTempIso(parsed ?? '');
  }, [open, value]);

  const displayText = value?.trim() ? value : placeholder ?? '';

  const handleApply = () => {
    if (!tempIso) {
      onValueChange('');
      setOpen(false);
      return;
    }
    onValueChange(formatIsoForLocaleDisplay(tempIso, locale));
    setOpen(false);
  };

  const handleSetToday = () => {
    const iso = todayIsoDate();
    setTempIso(iso);
    onValueChange(formatIsoForLocaleDisplay(iso, locale));
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          <Calendar className="mr-2 h-4 w-4" aria-hidden />
          <span className={cn('flex-1 text-left', !value?.trim() && 'text-muted-foreground')}>
            {displayText || ' '}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="letterDatePickerValue">Date</Label>
            <Input
              id="letterDatePickerValue"
              type="date"
              value={tempIso}
              onChange={(e) => setTempIso(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleSetToday}>
              Today
            </Button>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempIso(tryParseDisplayToIso(value) ?? '');
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function commonDefaults(locale: LetterLocale) {
  return {
    referenceNo: '',
    date: todayDisplay(locale),
    signatory: DEFAULT_SIGNATORY[locale],
  };
}

function feesDefaults(locale: LetterLocale): FeesLetterFields {
  return {
    ...commonDefaults(locale),
    schoolName: '',
    schoolAddress: '',
    standard: '',
    studentName: '',
  };
}

function schoolAdmissionDefaults(locale: LetterLocale): SchoolAdmissionLetterFields {
  return {
    ...commonDefaults(locale),
    schoolName: '',
    schoolAddress: '',
    standard: '',
    studentName: '',
    parentName: '',
    address: '',
    reasonText: '',
  };
}

function schoolTransferDefaults(locale: LetterLocale): SchoolTransferLetterFields {
  return {
    ...commonDefaults(locale),
    schoolName: '',
    schoolAddress: '',
    standard: '',
    studentName: '',
    parentName: '',
    address: '',
    previousSchoolName: '',
    currentStandard: '',
    transferReason: '',
  };
}

function rationDefaults(locale: LetterLocale): RationLetterFields {
  return {
    ...commonDefaults(locale),
    gender: 'female',
    salutation: locale === 'en' ? 'Smt.' : 'श्रीमती',
    fullName: '',
    address: '',
    familyMembers: '',
    rationOfficeAddress: DEFAULT_RATION_OFFICE_ADDRESS[locale],
    rationCardNo: '',
    fromRationOffice: '',
    toRationOffice: '',
  };
}

function incomeDefaults(locale: LetterLocale): IncomeLetterFields {
  return {
    ...commonDefaults(locale),
    gender: 'male',
    salutation: locale === 'en' ? 'Shri' : 'श्री',
    fullName: '',
    address: '',
    officeAddress: DEFAULT_OFFICE_ADDRESS[locale],
    aadhaarNo: '',
    annualIncome: '',
  };
}

function domicileDefaults(locale: LetterLocale): DomicileLetterFields {
  return {
    ...commonDefaults(locale),
    gender: 'male',
    salutation: locale === 'en' ? 'Shri' : 'श्री',
    fullName: '',
    address: '',
    officeAddress: DEFAULT_OFFICE_ADDRESS[locale],
    aadhaarNo: '',
  };
}

function resolveSalutation(locale: LetterLocale, gender: PersonGender): string {
  if (locale === 'en') {
    if (gender === 'female') return 'Smt.';
    if (gender === 'male') return 'Shri';
    return 'Shri/Smt.';
  }
  if (gender === 'female') return 'श्रीमती';
  if (gender === 'male') return 'श्री';
  return 'श्री/श्रीमती';
}

const LETTER_PREVIEW_CONTENT_CLASSES =
  '[&_.letter-content]:whitespace-pre-wrap [&_.letter-content]:font-[inherit] [&_.letter-content]:text-black';

const LETTER_FONT_STACK: Record<LetterLocale, string> = {
  en: `system-ui, -apple-system, sans-serif`,
  mr: `"Noto Sans Devanagari", "Nirmala UI", system-ui, -apple-system, sans-serif`,
};

function getLetterPreviewContentClasses(letterLocale: LetterLocale): string {
  // Templates often define their own inline font-size/line-height; keep our outer spacing script-aware.
  return cn(
    LETTER_PREVIEW_CONTENT_CLASSES,
    letterLocale === 'mr'
      ? '[&_.letter-content]:text-sm [&_.letter-content]:leading-6 sm:[&_.letter-content]:text-[15px] sm:[&_.letter-content]:leading-7'
      : '[&_.letter-content]:text-sm [&_.letter-content]:leading-6 sm:[&_.letter-content]:text-[15px] sm:[&_.letter-content]:leading-6',
  );
}

function createLetterExportElement(
  html: string,
  options?: {
    paperSize?: LetterPaperSize;
    letterheadUrl?: string | null;
    includeLetterhead?: boolean;
    letterLocale?: LetterLocale;
  },
): HTMLDivElement {
  const host = document.createElement('div');
  const contentHtml = stripLetterheadFromHtml(html);
  const letterheadUrl =
    options?.includeLetterhead && options.letterheadUrl
      ? options.letterheadUrl
      : null;

  host.className = 'relative bg-white text-black';
  if (options?.letterLocale) {
    host.style.fontFamily = LETTER_FONT_STACK[options.letterLocale];
  }
  if (options?.paperSize) {
    host.style.width = `${getLetterPaperContentWidthPx(options.paperSize)}px`;
  }

  if (letterheadUrl && options?.paperSize) {
    host.style.backgroundImage = `url("${letterheadUrl}")`;
    host.style.backgroundSize = '100% 100%';
    host.style.backgroundRepeat = 'no-repeat';
    host.innerHTML = `<div class="letter-export-content" style="padding: ${getLetterheadContentPaddingMm(options.paperSize)}mm 15mm 15mm 15mm;">${contentHtml}</div>`;
  } else {
    host.className += ' p-6';
    host.innerHTML = contentHtml;
  }

  return host;
}

const LETTER_PRINT_FONT_SIZE_PX: Record<LetterPaperSize, number> = {
  a4: 15,
  a5: 13,
  b5: 14,
};

function buildLetterPrintStyles(
  paperSize: LetterPaperSize,
  options?: { letterheadUrl?: string | null; letterLocale?: LetterLocale },
): string {
  const marginMm = LETTER_PAPER_MARGIN_MM[paperSize];
  const fontSizePx = LETTER_PRINT_FONT_SIZE_PX[paperSize];
  const pageLabel = getLetterPaperLabel(paperSize);
  const paddingPx = paperSize === 'a4' ? 24 : 18;
  const letterheadUrl = options?.letterheadUrl;
  const headerPaddingMm = getLetterheadContentPaddingMm(paperSize);
  const fontFamily = LETTER_FONT_STACK[options?.letterLocale ?? 'mr'];

  const bodyStyles = letterheadUrl
    ? `margin: 0; padding: 0; font-family: ${fontFamily};
       background: #fff url("${letterheadUrl}") no-repeat;
       background-size: 100% 100%;
       -webkit-print-color-adjust: exact;
       print-color-adjust: exact;`
    : `margin: 0; padding: ${paddingPx}px; font-family: ${fontFamily}; background: #fff;`;

  const contentPadding = letterheadUrl
    ? `padding: ${headerPaddingMm}mm ${marginMm}mm ${marginMm}mm ${marginMm}mm;`
    : '';

  return `
  @page { margin: 0; size: ${pageLabel} portrait; }
  * { color: #000 !important; }
  body { ${bodyStyles} }
  .letter-print-content { ${contentPadding} }
  .letter-content { white-space: pre-wrap; font-size: ${fontSizePx}px; line-height: 1.75; }
  img { max-width: 100%; height: auto; }
`;
}

function printLetterHtml(
  html: string,
  title: string,
  paperSize: LetterPaperSize = 'a4',
  options?: {
    includeLetterhead?: boolean;
    letterheadUrl?: string | null;
    letterLocale?: LetterLocale;
  },
): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const printFrame = iframe.contentWindow;
  const doc = printFrame?.document;
  if (!doc || !printFrame) {
    iframe.remove();
    return false;
  }

  const contentHtml = stripLetterheadFromHtml(html);
  const letterheadUrl =
    options?.includeLetterhead && options.letterheadUrl
      ? options.letterheadUrl
      : null;
  const bodyHtml = letterheadUrl
    ? `<div class="letter-print-content">${contentHtml}</div>`
    : contentHtml;

  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><title>${title}</title><style>${buildLetterPrintStyles(paperSize, { letterheadUrl, letterLocale: options?.letterLocale })}</style></head><body>${bodyHtml}</body></html>`,
  );
  doc.close();

  const cleanup = () => {
    iframe.remove();
  };

  const waitForImagesAndPrint = () => {
    const images = Array.from(doc.images);

    const print = () => {
      printFrame.focus();
      printFrame.print();
      if ('onafterprint' in printFrame) {
        printFrame.addEventListener('afterprint', cleanup, { once: true });
      } else {
        setTimeout(cleanup, 1000);
      }
    };

    if (images.length === 0) {
      print();
      return;
    }

    void Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
      ),
    ).then(print);
  };

  if (doc.readyState === 'complete') {
    waitForImagesAndPrint();
  } else {
    iframe.addEventListener('load', waitForImagesAndPrint, { once: true });
  }

  return true;
}

const LETTER_PREVIEW_MAX_WIDTH_CLASS: Record<LetterPaperSize, string> = {
  a4: 'max-w-[680px]',
  a5: 'max-w-[470px]',
  b5: 'max-w-[575px]',
};

function LetterPreview({
  html,
  paperSize = 'a4',
  letterheadUrl,
  letterLocale,
}: {
  html: string;
  paperSize?: LetterPaperSize;
  letterheadUrl?: string | null;
  letterLocale: LetterLocale;
}) {
  const resolvedLetterhead = resolveLetterheadUrl(paperSize, letterheadUrl);
  const contentHtml = stripLetterheadFromHtml(html);
  const headerTop = `${LETTERHEAD_HEADER_HEIGHT_RATIO * 100}%`;

  return (
    <div
      className={cn(
        'relative mx-auto w-full overflow-hidden rounded-lg border bg-white text-black',
        LETTER_PREVIEW_MAX_WIDTH_CLASS[paperSize],
      )}
      style={{
        aspectRatio: LETTER_PAPER_ASPECT_RATIO[paperSize],
        fontFamily: LETTER_FONT_STACK[letterLocale],
      }}
    >
      {resolvedLetterhead ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-no-repeat"
          style={{
            backgroundImage: `url("${resolvedLetterhead}")`,
            backgroundSize: '100% 100%',
          }}
        />
      ) : null}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 overflow-y-auto p-4 sm:p-6',
          getLetterPreviewContentClasses(letterLocale),
        )}
        style={resolvedLetterhead ? { top: headerTop } : { inset: 0 }}
        // Letter HTML is generated from admin-editable templates stored in our database.
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
}

function FieldGroup({
  label,
  children,
  className,
  required,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">
        {label}
        {required ? ' *' : null}
      </Label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type CommonFieldErrors = {
  referenceNo?: string;
  date?: string;
};

function validateRequiredCommonFields(
  referenceNo: string,
  date: string,
  t: (key: string) => string,
  existingReferenceNos: string[] = [],
): CommonFieldErrors {
  const errors: CommonFieldErrors = {};
  const trimmedReferenceNo = referenceNo.trim();
  if (!trimmedReferenceNo) {
    errors.referenceNo = t('letterGeneration.validation.referenceNoRequired');
  } else if (
    existingReferenceNos.some((existing) => existing.trim() === trimmedReferenceNo)
  ) {
    errors.referenceNo = t('letterGeneration.validation.referenceNoDuplicate');
  }
  if (!date.trim()) {
    errors.date = t('letterGeneration.validation.dateRequired');
  }
  return errors;
}

type AddressSelectionState = {
  school: string | null;
  applicant: string | null;
  rationOffice: string | null;
  office: string | null;
};

type ManualAddressKey = keyof AddressSelectionState;
type ManualAddressParts = Record<ManualAddressKey, AddressMasterAddressParts>;

function getPincodeValidationError(
  parts: AddressMasterAddressParts,
  t: (key: string) => string,
): string | undefined {
  const cleaned = toWesternDigits(parts.pincode).replace(/\D/g, '');
  if (parts.pincode.trim() && cleaned.length !== 6) {
    return t('letterGeneration.addresses.pincodeInvalid');
  }
  return undefined;
}

function getAddressTextFromMaster(
  addresses: AddressMasterRow[],
  masterId: string | null,
  locale: LetterLocale,
): string | null {
  if (!masterId) return null;
  const address = addresses.find((item) => item.id === masterId);
  if (!address) return null;
  return formatAddressMaster(address, locale);
}

function applyMasterAddressToFields(
  addresses: AddressMasterRow[],
  selections: AddressSelectionState,
  locale: LetterLocale,
  setters: {
    setFeesFields: Dispatch<SetStateAction<FeesLetterFields>>;
    setSchoolAdmissionFields: Dispatch<SetStateAction<SchoolAdmissionLetterFields>>;
    setSchoolTransferFields: Dispatch<SetStateAction<SchoolTransferLetterFields>>;
    setRationFields: Dispatch<SetStateAction<RationLetterFields>>;
    setIncomeFields: Dispatch<SetStateAction<IncomeLetterFields>>;
    setDomicileFields: Dispatch<SetStateAction<DomicileLetterFields>>;
  },
) {
  const schoolText = getAddressTextFromMaster(addresses, selections.school, locale);
  const applicantText = getAddressTextFromMaster(
    addresses,
    selections.applicant,
    locale,
  );
  const rationOfficeText = getAddressTextFromMaster(
    addresses,
    selections.rationOffice,
    locale,
  );
  const officeText = getAddressTextFromMaster(addresses, selections.office, locale);

  if (schoolText) {
    setters.setFeesFields((prev) => ({ ...prev, schoolAddress: schoolText }));
    setters.setSchoolAdmissionFields((prev) => ({
      ...prev,
      schoolAddress: schoolText,
    }));
    setters.setSchoolTransferFields((prev) => ({
      ...prev,
      schoolAddress: schoolText,
    }));
  }

  if (applicantText) {
    setters.setSchoolAdmissionFields((prev) => ({ ...prev, address: applicantText }));
    setters.setSchoolTransferFields((prev) => ({ ...prev, address: applicantText }));
    setters.setRationFields((prev) => ({ ...prev, address: applicantText }));
    setters.setIncomeFields((prev) => ({ ...prev, address: applicantText }));
    setters.setDomicileFields((prev) => ({ ...prev, address: applicantText }));
  }

  if (rationOfficeText) {
    setters.setRationFields((prev) => ({
      ...prev,
      rationOfficeAddress: rationOfficeText,
    }));
  }

  if (officeText) {
    setters.setIncomeFields((prev) => ({ ...prev, officeAddress: officeText }));
    setters.setDomicileFields((prev) => ({ ...prev, officeAddress: officeText }));
  }
}

type SavedLetterRow = {
  id: string;
  letterMasterId: string | null;
  letterType: LetterType;
  letterLocale: LetterLocale;
  referenceNo: string;
  title: string;
  fields: unknown;
  renderedHtml: string;
  paperSize: LetterPaperSize;
  createdAt: string | Date;
};

type LetterMasterRow = {
  id: string;
  name: string;
  letterType: LetterType;
  letterLocale: LetterLocale;
  templateHtml: string;
  letterheadUrl: string | null;
  letterheadMode: LetterheadMode;
  paperSize: LetterPaperSize;
  updatedAt: string | Date;
};

export function LetterGeneration() {
  const { t, locale } = useTranslations();
  const [letterLocale, setLetterLocale] = useState<LetterLocale>(locale);
  const prevLetterLocaleRef = useRef<LetterLocale>(locale);
  const [activeTab, setActiveTab] = useState<LetterType>('fees');
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingLetterId, setDownloadingLetterId] = useState<string | null>(null);
  const [isGeneratorCollapsed, setIsGeneratorCollapsed] = useState(false);

  const [feesFields, setFeesFields] = useState<FeesLetterFields>(() =>
    feesDefaults(locale),
  );
  const [schoolAdmissionFields, setSchoolAdmissionFields] =
    useState<SchoolAdmissionLetterFields>(() => schoolAdmissionDefaults(locale));
  const [schoolTransferFields, setSchoolTransferFields] =
    useState<SchoolTransferLetterFields>(() => schoolTransferDefaults(locale));
  const [rationFields, setRationFields] = useState<RationLetterFields>(() =>
    rationDefaults(locale),
  );
  const [incomeFields, setIncomeFields] = useState<IncomeLetterFields>(() =>
    incomeDefaults(locale),
  );
  const [domicileFields, setDomicileFields] = useState<DomicileLetterFields>(
    () => domicileDefaults(locale),
  );

  const [savedLetters, setSavedLetters] = useState<SavedLetterRow[]>([]);
  const [savedLettersLoading, setSavedLettersLoading] = useState(false);
  const [letterMasters, setLetterMasters] = useState<LetterMasterRow[]>([]);
  const [letterMastersLoading, setLetterMastersLoading] = useState(false);
  const [addresses, setAddresses] = useState<AddressMasterRow[]>([]);
  const [addressSelections, setAddressSelections] = useState<AddressSelectionState>({
    school: null,
    applicant: null,
    rationOffice: null,
    office: null,
  });
  const [manualAddressParts, setManualAddressParts] = useState<ManualAddressParts>(() => ({
    school: createEmptyAddressParts(),
    applicant: createEmptyAddressParts(),
    rationOffice: createEmptyAddressParts(),
    office: createEmptyAddressParts(),
  }));
  const [addressPincodeErrors, setAddressPincodeErrors] = useState<
    Partial<Record<ManualAddressKey, string>>
  >({});
  const translateTimersRef = useRef<Partial<Record<ManualAddressKey, number>>>({});
  const translateReqIdRef = useRef<Partial<Record<ManualAddressKey, number>>>({});
  const [templateDraft, setTemplateDraft] = useState('');
  const [templateNameDraft, setTemplateNameDraft] = useState('');
  const [letterheadDraft, setLetterheadDraft] = useState<string | null>(null);
  const [letterheadModeDraft, setLetterheadModeDraft] = useState<LetterheadMode>('full');
  const [paperSizeDraft, setPaperSizeDraft] = useState<LetterPaperSize>(() =>
    getDefaultLetterPaperSize('fees'),
  );
  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);
  const letterheadInputRef = useRef<HTMLInputElement>(null);
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [regeneratingLetterId, setRegeneratingLetterId] = useState<string | null>(null);
  const [selectedSavedLetterId, setSelectedSavedLetterId] = useState<string | null>(
    null,
  );
  const [filterLetterType, setFilterLetterType] =
    useState<SavedLetterTypeFilter>(ALL_LETTER_TYPES);
  const [filterReference, setFilterReference] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [commonFieldErrors, setCommonFieldErrors] = useState<CommonFieldErrors>({});

  const deriveAddressMasterName = (rawAddress: string, fallback: string) => {
    const firstLine =
      rawAddress
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find(Boolean) ?? '';
    const trimmed = firstLine.slice(0, 60);
    return trimmed || fallback;
  };

  const createAddressMasterFromManualEntry = async ({
    addressType,
    name,
    parts,
  }: {
    addressType: AddressMasterRow['addressType'];
    name: string;
    parts: AddressMasterAddressParts;
  }): Promise<AddressMasterRow | null> => {
    const trimmedName = name.trim();
    if (!trimmedName || !hasAddressContent(parts)) return null;

    let nameEn = letterLocale === 'en' ? trimmedName : '';
    let nameMr = letterLocale === 'mr' ? trimmedName : '';
    const targetLocale: LetterLocale = letterLocale === 'en' ? 'mr' : 'en';

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: trimmedName, targetLocale }),
      });
      const json = await res.json();
      if (res.ok) {
        const translated = String(json?.translated ?? '').trim();
        if (translated) {
          if (letterLocale === 'en') nameMr = translated;
          else nameEn = translated;
        }
      }
    } catch (error) {
      console.error('Failed to translate address name for auto-save', error);
    }

    if (!nameEn) nameEn = trimmedName;

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: nameEn,
          nameMr,
          addressType,
          ...parts,
          isActive: true,
          sortOrder: 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create address');
      return (json?.address ?? null) as AddressMasterRow | null;
    } catch (error) {
      // Non-blocking: letter save should still proceed even if this fails.
      console.error('Failed to auto-save manual address to address master', error);
      return null;
    }
  };


  useEffect(() => {
    setCommonFieldErrors({});
  }, [activeTab]);

  useEffect(() => {
    const prevLocale = prevLetterLocaleRef.current;
    const prevAutoDate = todayDisplay(prevLocale);
    const nextAutoDate = todayDisplay(letterLocale);

    const signatory = DEFAULT_SIGNATORY[letterLocale];
    setFeesFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
    }));
    setSchoolAdmissionFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
    }));
    setSchoolTransferFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
    }));
    setRationFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
    }));
    setIncomeFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
    }));
    setDomicileFields((prev) => ({
      ...prev,
      signatory,
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
    }));

    applyMasterAddressToFields(addresses, addressSelections, letterLocale, {
      setFeesFields,
      setSchoolAdmissionFields,
      setSchoolTransferFields,
      setRationFields,
      setIncomeFields,
      setDomicileFields,
    });

    // For manual entry (no master selection), restore the per-locale formatted text when switching locale.
    if (!addressSelections.school) {
      const text = formatAddressMaster(manualAddressParts.school, letterLocale);
      if (text.trim()) {
        setFeesFields((prev) => ({ ...prev, schoolAddress: text }));
        setSchoolAdmissionFields((prev) => ({ ...prev, schoolAddress: text }));
        setSchoolTransferFields((prev) => ({ ...prev, schoolAddress: text }));
      }
    }
    if (!addressSelections.applicant) {
      const text = formatAddressMaster(manualAddressParts.applicant, letterLocale);
      if (text.trim()) {
        setSchoolAdmissionFields((prev) => ({ ...prev, address: text }));
        setSchoolTransferFields((prev) => ({ ...prev, address: text }));
        setRationFields((prev) => ({ ...prev, address: text }));
        setIncomeFields((prev) => ({ ...prev, address: text }));
        setDomicileFields((prev) => ({ ...prev, address: text }));
      }
    }
    if (!addressSelections.rationOffice) {
      const text = formatAddressMaster(manualAddressParts.rationOffice, letterLocale);
      if (text.trim()) {
        setRationFields((prev) => ({ ...prev, rationOfficeAddress: text }));
      }
    }
    if (!addressSelections.office) {
      const text = formatAddressMaster(manualAddressParts.office, letterLocale);
      if (text.trim()) {
        setIncomeFields((prev) => ({ ...prev, officeAddress: text }));
        setDomicileFields((prev) => ({ ...prev, officeAddress: text }));
      }
    }

    if (!addressSelections.rationOffice) {
      setRationFields((prev) => ({
        ...prev,
        rationOfficeAddress: DEFAULT_RATION_OFFICE_ADDRESS[letterLocale],
      }));
    }
    if (!addressSelections.office) {
      setIncomeFields((prev) => ({
        ...prev,
        officeAddress: DEFAULT_OFFICE_ADDRESS[letterLocale],
      }));
      setDomicileFields((prev) => ({
        ...prev,
        officeAddress: DEFAULT_OFFICE_ADDRESS[letterLocale],
      }));
    }

    prevLetterLocaleRef.current = letterLocale;
  }, [letterLocale, addresses, addressSelections, manualAddressParts]);

  const triggerAutoTranslateManualAddressParts = (
    key: ManualAddressKey,
    parts: AddressMasterAddressParts,
  ) => {
    const sourceLocale = letterLocale;
    const targetLocale: LetterLocale = sourceLocale === 'en' ? 'mr' : 'en';
    const sourceText = formatAddressMaster(parts, sourceLocale);

    if (!sourceText.trim()) return;

    // Pincode-only updates don't need translation and can be mis-parsed.
    const hasAddressLines =
      sourceLocale === 'mr'
        ? Boolean(parts.line1Mr.trim() || parts.line2Mr.trim() || parts.cityMr.trim() || parts.stateMr.trim())
        : Boolean(parts.line1En.trim() || parts.line2En.trim() || parts.cityEn.trim() || parts.stateEn.trim());
    if (!hasAddressLines) return;

    const nextReqId = (translateReqIdRef.current[key] ?? 0) + 1;
    translateReqIdRef.current[key] = nextReqId;

    const existingTimer = translateTimersRef.current[key];
    if (existingTimer) window.clearTimeout(existingTimer);

    translateTimersRef.current[key] = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text: sourceText, targetLocale }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to translate');

        if (translateReqIdRef.current[key] !== nextReqId) return;

        const translated = String(json?.translated ?? '').trim();
        if (!translated) return;

        setManualAddressParts((prev) => ({
          ...prev,
          [key]: mergeAddressParts(
            prev[key],
            parseFreeTextAddressForLocale(translated, targetLocale),
          ),
        }));
      } catch (error) {
        console.error('Failed to auto-translate address', error);
      }
    }, 450);
  };

  const applyManualAddressToLetterFields = useCallback(
    (key: ManualAddressKey, value: string) => {
      switch (key) {
        case 'school':
          setFeesFields((prev) => ({ ...prev, schoolAddress: value }));
          setSchoolAdmissionFields((prev) => ({ ...prev, schoolAddress: value }));
          setSchoolTransferFields((prev) => ({ ...prev, schoolAddress: value }));
          break;
        case 'applicant':
          setSchoolAdmissionFields((prev) => ({ ...prev, address: value }));
          setSchoolTransferFields((prev) => ({ ...prev, address: value }));
          setRationFields((prev) => ({ ...prev, address: value }));
          setIncomeFields((prev) => ({ ...prev, address: value }));
          setDomicileFields((prev) => ({ ...prev, address: value }));
          break;
        case 'rationOffice':
          setRationFields((prev) => ({ ...prev, rationOfficeAddress: value }));
          break;
        case 'office':
          setIncomeFields((prev) => ({ ...prev, officeAddress: value }));
          setDomicileFields((prev) => ({ ...prev, officeAddress: value }));
          break;
      }
    },
    [],
  );

  const handleManualAddressPartsChange = (
    key: ManualAddressKey,
    parts: AddressMasterAddressParts,
  ) => {
    setManualAddressParts((prev) => ({ ...prev, [key]: parts }));
    setAddressPincodeErrors((prev) => ({
      ...prev,
      [key]: getPincodeValidationError(parts, t),
    }));

    const formatted = formatAddressMaster(parts, letterLocale);
    applyManualAddressToLetterFields(key, formatted);
    triggerAutoTranslateManualAddressParts(key, parts);
  };

  const seedManualAddressPartsFromText = (key: ManualAddressKey, text: string) => {
    const parsed = parseFreeTextAddressForLocale(text, letterLocale);
    handleManualAddressPartsChange(key, mergeAddressParts(manualAddressParts[key], parsed));
  };

  const addressRowToParts = (address: AddressMasterRow): AddressMasterAddressParts => ({
    line1En: address.line1En,
    line1Mr: address.line1Mr,
    line2En: address.line2En,
    line2Mr: address.line2Mr,
    cityEn: address.cityEn,
    cityMr: address.cityMr,
    stateEn: address.stateEn,
    stateMr: address.stateMr,
    pincode: address.pincode,
  });

  const applySchoolAddressText = (text: string) => {
    setFeesFields((prev) => ({ ...prev, schoolAddress: text }));
    setSchoolAdmissionFields((prev) => ({ ...prev, schoolAddress: text }));
    setSchoolTransferFields((prev) => ({ ...prev, schoolAddress: text }));
  };

  const applyApplicantAddressText = (text: string) => {
    setSchoolAdmissionFields((prev) => ({ ...prev, address: text }));
    setSchoolTransferFields((prev) => ({ ...prev, address: text }));
    setRationFields((prev) => ({ ...prev, address: text }));
    setIncomeFields((prev) => ({ ...prev, address: text }));
    setDomicileFields((prev) => ({ ...prev, address: text }));
  };

  const handleSchoolAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => ({ ...prev, school: id }));
    if (id) {
      const selected = addresses.find((a) => a.id === id);
      if (selected?.name) {
        setFeesFields((prev) => ({ ...prev, schoolName: selected.name }));
        setSchoolAdmissionFields((prev) => ({ ...prev, schoolName: selected.name }));
        setSchoolTransferFields((prev) => ({ ...prev, schoolName: selected.name }));
      }
      const text = getAddressTextFromMaster(addresses, id, letterLocale);
      if (text) applySchoolAddressText(text);
      if (selected) {
        setManualAddressParts((prev) => ({ ...prev, school: addressRowToParts(selected) }));
      }
    } else {
      seedManualAddressPartsFromText('school', seedText);
    }
  };

  const handleApplicantAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => ({ ...prev, applicant: id }));
    if (id) {
      const text = getAddressTextFromMaster(addresses, id, letterLocale);
      if (text) applyApplicantAddressText(text);
      const selected = addresses.find((a) => a.id === id);
      if (selected) {
        setManualAddressParts((prev) => ({ ...prev, applicant: addressRowToParts(selected) }));
      }
    } else {
      seedManualAddressPartsFromText('applicant', seedText);
    }
  };

  const handleRationOfficeAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => ({ ...prev, rationOffice: id }));
    if (id) {
      const text = getAddressTextFromMaster(addresses, id, letterLocale);
      if (text) {
        setRationFields((prev) => ({ ...prev, rationOfficeAddress: text }));
      }
      const selected = addresses.find((a) => a.id === id);
      if (selected) {
        setManualAddressParts((prev) => ({
          ...prev,
          rationOffice: addressRowToParts(selected),
        }));
      }
    } else {
      seedManualAddressPartsFromText('rationOffice', seedText);
    }
  };

  const handleOfficeAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => ({ ...prev, office: id }));
    if (id) {
      const text = getAddressTextFromMaster(addresses, id, letterLocale);
      if (text) {
        setIncomeFields((prev) => ({ ...prev, officeAddress: text }));
        setDomicileFields((prev) => ({ ...prev, officeAddress: text }));
      }
      const selected = addresses.find((a) => a.id === id);
      if (selected) {
        setManualAddressParts((prev) => ({ ...prev, office: addressRowToParts(selected) }));
      }
    } else {
      seedManualAddressPartsFromText('office', seedText);
    }
  };

  const refreshLetterMasters = async () => {
    setLetterMastersLoading(true);
    try {
      const res = await fetch('/api/letter-masters');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letter masters');
      setLetterMasters((json?.letterMasters ?? []) as LetterMasterRow[]);
    } catch (error) {
      console.error('Failed to fetch letter masters', error);
      toast.error(t('letterGeneration.templates.fetchError'));
    } finally {
      setLetterMastersLoading(false);
    }
  };

  const refreshAddresses = async () => {
    try {
      const res = await fetch('/api/addresses?includeInactive=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch addresses');
      setAddresses((json?.addresses ?? []) as AddressMasterRow[]);
    } catch (error) {
      console.error('Failed to fetch addresses', error);
      toast.error(t('letterGeneration.addresses.fetchError'));
    }
  };

  const refreshSavedLetters = async () => {
    setSavedLettersLoading(true);
    try {
      const res = await fetch('/api/letters?limit=50');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letters');
      setSavedLetters((json?.letters ?? []) as SavedLetterRow[]);
    } catch (error) {
      console.error('Failed to fetch letters', error);
      toast.error(t('letterGeneration.savedLetters.fetchError'));
    } finally {
      setSavedLettersLoading(false);
    }
  };

  useEffect(() => {
    void refreshSavedLetters();
    void refreshLetterMasters();
    void refreshAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (addresses.length === 0) return;

    const defaultOffice = findDefaultAddress(addresses, 'office');
    const defaultRationOffice = findDefaultAddress(addresses, 'ration_office');

    setAddressSelections((prev) => ({
      school: prev.school,
      applicant: prev.applicant,
      rationOffice: prev.rationOffice ?? defaultRationOffice?.id ?? null,
      office: prev.office ?? defaultOffice?.id ?? null,
    }));

    if (defaultRationOffice) {
      const rationOfficeText = formatAddressMaster(defaultRationOffice, letterLocale);
      setRationFields((prev) =>
        prev.rationOfficeAddress === DEFAULT_RATION_OFFICE_ADDRESS[letterLocale] ||
          !prev.rationOfficeAddress.trim()
          ? { ...prev, rationOfficeAddress: rationOfficeText }
          : prev,
      );
    }

    if (defaultOffice) {
      const officeText = formatAddressMaster(defaultOffice, letterLocale);
      setIncomeFields((prev) =>
        prev.officeAddress === DEFAULT_OFFICE_ADDRESS[letterLocale] ||
          !prev.officeAddress.trim()
          ? { ...prev, officeAddress: officeText }
          : prev,
      );
      setDomicileFields((prev) =>
        prev.officeAddress === DEFAULT_OFFICE_ADDRESS[letterLocale] ||
          !prev.officeAddress.trim()
          ? { ...prev, officeAddress: officeText }
          : prev,
      );
    }
    // Apply defaults once when addresses are first loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  useEffect(() => {
    if (!addressSelections.school) return;
    if (addresses.length === 0) return;

    const selected = addresses.find((a) => a.id === addressSelections.school);
    if (!selected?.name) return;

    setFeesFields((prev) => (prev.schoolName?.trim() ? prev : { ...prev, schoolName: selected.name }));
    setSchoolAdmissionFields((prev) =>
      prev.schoolName?.trim() ? prev : { ...prev, schoolName: selected.name },
    );
    setSchoolTransferFields((prev) =>
      prev.schoolName?.trim() ? prev : { ...prev, schoolName: selected.name },
    );
  }, [addressSelections.school, addresses]);

  const activeLetterMaster = useMemo(() => {
    return (
      letterMasters.find(
        (master) =>
          master.letterType === activeTab && master.letterLocale === letterLocale,
      ) ?? null
    );
  }, [letterMasters, activeTab, letterLocale]);

  useEffect(() => {
    if (activeLetterMaster) {
      setTemplateDraft(activeLetterMaster.templateHtml);
      setTemplateNameDraft(activeLetterMaster.name);
      setLetterheadDraft(activeLetterMaster.letterheadUrl);
      setLetterheadModeDraft(activeLetterMaster.letterheadMode);
      setPaperSizeDraft(
        resolveLetterPaperSize(activeLetterMaster.paperSize, activeTab),
      );
      return;
    }
    setTemplateDraft(getDefaultTemplateHtml(activeTab, letterLocale));
    setTemplateNameDraft(t(`letterGeneration.tabs.${activeTab}`));
    setLetterheadDraft(null);
    setLetterheadModeDraft('full');
    setPaperSizeDraft(getDefaultLetterPaperSize(activeTab));
    // Only reset draft when letter type/locale/master changes — not when `t` is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLetterMaster, activeTab, letterLocale]);

  const activeTemplateHtml = templateDraft;

  const existingReferenceNos = useMemo(
    () => savedLetters.map((letter) => letter.referenceNo),
    [savedLetters],
  );

  const activeBody = useMemo(() => {
    const fields = getFieldsForLetterType(activeTab, {
      feesFields,
      schoolAdmissionFields,
      schoolTransferFields,
      rationFields,
      incomeFields,
      domicileFields,
    });

    if (activeTemplateHtml.trim()) {
      return buildRenderedLetterHtml(
        activeTab,
        activeTemplateHtml,
        fields,
        letterLocale,
      );
    }

    return buildLetterBody(activeTab, fields, letterLocale);
  }, [
    activeTab,
    letterLocale,
    feesFields,
    schoolAdmissionFields,
    schoolTransferFields,
    rationFields,
    incomeFields,
    domicileFields,
    activeTemplateHtml,
  ]);

  const activeTitle = t(`letterGeneration.tabs.${activeTab}`);
  const activePaperSize = paperSizeDraft;
  const activePaperLabel = getLetterPaperLabel(activePaperSize);
  const activeLetterheadUrl = resolveLetterheadUrl(activePaperSize, letterheadDraft);

  const activeFields = useMemo(
    () =>
      getFieldsForLetterType(activeTab, {
        feesFields,
        schoolAdmissionFields,
        schoolTransferFields,
        rationFields,
        incomeFields,
        domicileFields,
      }),
    [
      activeTab,
      domicileFields,
      feesFields,
      incomeFields,
      rationFields,
      schoolAdmissionFields,
      schoolTransferFields,
    ],
  );

  const activeReferenceNo = activeFields.referenceNo;
  const activeDate = activeFields.date;

  const validateManualAddressPincodes = () => {
    const keysToCheck: ManualAddressKey[] = [];
    if (!addressSelections.school && hasAddressContent(manualAddressParts.school)) {
      keysToCheck.push('school');
    }
    if (!addressSelections.applicant && hasAddressContent(manualAddressParts.applicant)) {
      keysToCheck.push('applicant');
    }
    if (!addressSelections.rationOffice && hasAddressContent(manualAddressParts.rationOffice)) {
      keysToCheck.push('rationOffice');
    }
    if (!addressSelections.office && hasAddressContent(manualAddressParts.office)) {
      keysToCheck.push('office');
    }

    const errors: Partial<Record<ManualAddressKey, string>> = {};
    for (const key of keysToCheck) {
      const error = getPincodeValidationError(manualAddressParts[key], t);
      if (error) errors[key] = error;
    }

    setAddressPincodeErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error(t('letterGeneration.addresses.pincodeInvalid'));
      return false;
    }
    return true;
  };

  const validateActiveCommonFields = () => {
    const errors = validateRequiredCommonFields(
      activeReferenceNo,
      activeDate,
      t,
      existingReferenceNos,
    );
    setCommonFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = errors.referenceNo ?? errors.date;
      if (firstError) toast.error(firstError);
      return false;
    }
    if (!validateManualAddressPincodes()) return false;
    return true;
  };

  const handleUploadLetterhead = async (file: File) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error(t('letterGeneration.templates.letterheadInvalidType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('letterGeneration.templates.letterheadTooLarge'));
      return;
    }

    setIsUploadingLetterhead(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      setLetterheadDraft(json.url ?? null);
      toast.success(t('letterGeneration.templates.letterheadUploadSuccess'));
    } catch (error) {
      console.error('Failed to upload letterhead', error);
      toast.error(t('letterGeneration.templates.letterheadUploadError'));
    } finally {
      setIsUploadingLetterhead(false);
      if (letterheadInputRef.current) {
        letterheadInputRef.current.value = '';
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateNameDraft.trim() || !templateDraft.trim()) {
      toast.error(t('letterGeneration.templates.validationRequired'));
      return;
    }

    setIsSavingTemplate(true);
    try {
      const payload = {
        name: templateNameDraft.trim(),
        templateHtml: templateDraft,
        letterheadUrl: letterheadDraft,
        letterheadMode: letterheadModeDraft,
        paperSize: paperSizeDraft,
      };

      const res = activeLetterMaster
        ? await fetch(
          `/api/letter-masters/${encodeURIComponent(activeLetterMaster.id)}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          },
        )
        : await fetch('/api/letter-masters', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            letterType: activeTab,
            letterLocale,
          }),
        });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save template');
      toast.success(
        t(
          activeLetterMaster
            ? 'letterGeneration.templates.saveSuccess'
            : 'letterGeneration.templates.createSuccess',
        ),
      );
      await refreshLetterMasters();
    } catch (error) {
      console.error('Failed to save letter template', error);
      toast.error(
        t(
          activeLetterMaster
            ? 'letterGeneration.templates.saveError'
            : 'letterGeneration.templates.createError',
        ),
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSaveLetter = async () => {
    if (!validateActiveCommonFields()) return;

    setIsSaving(true);
    try {
      // Auto-save manual addresses to Address Master (so they appear in dropdown next time).
      // This is intentionally done only on "Save Letter" to avoid creating rows on every edit.
      if (!addressSelections.school) {
        const schoolAddressText =
          (activeTab === 'fees'
            ? feesFields.schoolAddress
            : activeTab === 'school-admission'
              ? schoolAdmissionFields.schoolAddress
              : activeTab === 'school-transfer'
                ? schoolTransferFields.schoolAddress
                : '') ?? '';
        const schoolNameValue =
          (activeTab === 'fees'
            ? feesFields.schoolName
            : activeTab === 'school-admission'
              ? schoolAdmissionFields.schoolName
              : activeTab === 'school-transfer'
                ? schoolTransferFields.schoolName
                : '') ?? '';

        if (schoolAddressText.trim() && schoolNameValue.trim()) {
          const created = await createAddressMasterFromManualEntry({
            addressType: 'school',
            name: schoolNameValue,
            parts: manualAddressParts.school,
          });
          if (created?.id) {
            setAddresses((prev) =>
              prev.some((a) => a.id === created.id) ? prev : [created, ...prev],
            );
            setAddressSelections((prev) => ({ ...prev, school: created.id }));
          }
        }
      }

      if (!addressSelections.applicant) {
        const applicantAddressText =
          (activeTab === 'school-admission'
            ? schoolAdmissionFields.address
            : activeTab === 'school-transfer'
              ? schoolTransferFields.address
              : isRationLetterType(activeTab)
                ? rationFields.address
                : activeTab === 'income'
                  ? incomeFields.address
                  : activeTab === 'domicile'
                    ? domicileFields.address
                    : '') ?? '';

        if (applicantAddressText.trim()) {
          const created = await createAddressMasterFromManualEntry({
            addressType: 'general',
            name: deriveAddressMasterName(applicantAddressText, 'Applicant Address'),
            parts: manualAddressParts.applicant,
          });
          if (created?.id) {
            setAddresses((prev) =>
              prev.some((a) => a.id === created.id) ? prev : [created, ...prev],
            );
            setAddressSelections((prev) => ({ ...prev, applicant: created.id }));
          }
        }
      }

      if (!addressSelections.rationOffice && isRationLetterType(activeTab)) {
        const rationOfficeText = rationFields.rationOfficeAddress ?? '';
        if (rationOfficeText.trim()) {
          const created = await createAddressMasterFromManualEntry({
            addressType: 'ration_office',
            name: deriveAddressMasterName(rationOfficeText, 'Ration Office'),
            parts: manualAddressParts.rationOffice,
          });
          if (created?.id) {
            setAddresses((prev) =>
              prev.some((a) => a.id === created.id) ? prev : [created, ...prev],
            );
            setAddressSelections((prev) => ({ ...prev, rationOffice: created.id }));
          }
        }
      }

      if (!addressSelections.office && (activeTab === 'income' || activeTab === 'domicile')) {
        const officeText =
          (activeTab === 'income' ? incomeFields.officeAddress : domicileFields.officeAddress) ??
          '';
        if (officeText.trim()) {
          const created = await createAddressMasterFromManualEntry({
            addressType: 'office',
            name: deriveAddressMasterName(officeText, 'Office Address'),
            parts: manualAddressParts.office,
          });
          if (created?.id) {
            setAddresses((prev) =>
              prev.some((a) => a.id === created.id) ? prev : [created, ...prev],
            );
            setAddressSelections((prev) => ({ ...prev, office: created.id }));
          }
        }
      }

      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          letterType: activeTab,
          letterLocale,
          letterMasterId: activeLetterMaster?.id ?? null,
          referenceNo: activeReferenceNo.trim(),
          title: activeTitle,
          fields: activeFields,
          renderedHtml: activeBody,
          paperSize: paperSizeDraft,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409 || json?.error === 'referenceNo already exists') {
          const duplicateMessage = t(
            'letterGeneration.validation.referenceNoDuplicate',
          );
          setCommonFieldErrors((prev) => ({
            ...prev,
            referenceNo: duplicateMessage,
          }));
          toast.error(duplicateMessage);
          return;
        }
        throw new Error(json?.error || 'Failed to save letter');
      }
      toast.success(t('letterGeneration.savedLetters.saveSuccess'));
      await refreshSavedLetters();
      setSelectedSavedLetterId(json?.letter?.id ?? null);
    } catch (error) {
      console.error('Failed to save letter', error);
      toast.error(t('letterGeneration.savedLetters.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateSavedLetter = async (letter: SavedLetterRow) => {
    setRegeneratingLetterId(letter.id);
    try {
      const res = await fetch(
        `/api/letters/${encodeURIComponent(letter.id)}/regenerate`,
        { method: 'POST' },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to regenerate letter');
      toast.success(t('letterGeneration.savedLetters.regenerateSuccess'));
      const updated = json.letter as SavedLetterRow;
      setSavedLetters((prev) =>
        prev.map((item) => (item.id === letter.id ? { ...item, ...updated } : item)),
      );
    } catch (error) {
      console.error('Failed to regenerate letter', error);
      toast.error(t('letterGeneration.savedLetters.regenerateError'));
    } finally {
      setRegeneratingLetterId(null);
    }
  };

  const handleDeleteSavedLetter = async (id: string) => {
    try {
      const res = await fetch(`/api/letters/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete letter');
      toast.success(t('letterGeneration.savedLetters.deleteSuccess'));
      setSavedLetters((prev) => prev.filter((l) => l.id !== id));
      setSelectedSavedLetterId((prev) => (prev === id ? null : prev));
    } catch (error) {
      console.error('Failed to delete letter', error);
      toast.error(t('letterGeneration.savedLetters.deleteError'));
    }
  };

  const resolveSavedLetterPaperSize = (letter: SavedLetterRow): LetterPaperSize =>
    resolveLetterPaperSize(letter.paperSize, letter.letterType);

  const handlePrintSavedLetter = (letter: SavedLetterRow) => {
    const title = `${letter.title}${letter.referenceNo ? ` - ${letter.referenceNo}` : ''}`;
    const paperSize = resolveSavedLetterPaperSize(letter);
    const master = letterMasters.find((m) => m.id === letter.letterMasterId);
    const letterheadUrl = resolveLetterheadUrl(paperSize, master?.letterheadUrl);
    const opened = printLetterHtml(letter.renderedHtml, title, paperSize, {
      includeLetterhead: true,
      letterheadUrl,
      letterLocale: letter.letterLocale,
    });
    if (!opened) {
      toast.error(t('letterGeneration.printPopupBlocked'));
    }
  };

  const handleDownloadSavedLetter = async (letter: SavedLetterRow) => {
    setDownloadingLetterId(letter.id);
    let exportHost: HTMLDivElement | null = null;
    try {
      const paperSize = resolveSavedLetterPaperSize(letter);
      const master = letterMasters.find((m) => m.id === letter.letterMasterId);
      const letterheadUrl = resolveLetterheadUrl(paperSize, master?.letterheadUrl);
      exportHost = createLetterExportElement(letter.renderedHtml, {
        paperSize,
        letterheadUrl,
        includeLetterhead: true,
        letterLocale: letter.letterLocale,
      });
      document.body.appendChild(exportHost);
      await exportElementToPdf({
        element: exportHost,
        fileName: `${letter.title}-${letter.referenceNo || 'letter'}`,
        format: paperSize,
        orientation: 'portrait',
        marginMm: LETTER_PAPER_MARGIN_MM[paperSize],
        scale: 2,
        captureWidthPx: getLetterPaperContentWidthPx(paperSize),
      });
      toast.success(t('letterGeneration.pdfSuccess'));
    } catch (error) {
      console.error('Saved letter PDF export failed', error);
      toast.error(t('letterGeneration.pdfError'));
    } finally {
      exportHost?.remove();
      setDownloadingLetterId(null);
    }
  };

  const filteredSavedLetters = useMemo(() => {
    const referenceQuery = filterReference.trim().toLowerCase();
    return savedLetters.filter((letter) => {
      if (
        filterLetterType !== ALL_LETTER_TYPES &&
        !matchesSavedLetterTypeFilter(letter.letterType, filterLetterType)
      ) {
        return false;
      }
      if (
        referenceQuery &&
        !(letter.referenceNo ?? '').toLowerCase().includes(referenceQuery)
      ) {
        return false;
      }
      if (
        !isLetterWithinDateRange(letter.createdAt, filterStartDate, filterEndDate)
      ) {
        return false;
      }
      return true;
    });
  }, [
    savedLetters,
    filterLetterType,
    filterReference,
    filterStartDate,
    filterEndDate,
  ]);

  const hasActiveSavedLetterFilters =
    filterLetterType !== ALL_LETTER_TYPES ||
    filterReference.trim() !== '' ||
    filterStartDate !== '' ||
    filterEndDate !== '';

  useEffect(() => {
    if (
      selectedSavedLetterId &&
      !filteredSavedLetters.some((letter) => letter.id === selectedSavedLetterId)
    ) {
      setSelectedSavedLetterId(null);
    }
  }, [filteredSavedLetters, selectedSavedLetterId]);

  const selectedSavedLetter = useMemo(() => {
    if (!selectedSavedLetterId) return null;
    return filteredSavedLetters.find((l) => l.id === selectedSavedLetterId) ?? null;
  }, [filteredSavedLetters, selectedSavedLetterId]);

  const renderSavedLetterActions = (
    letter: SavedLetterRow,
    layout: 'stack' | 'inline' = 'inline',
  ) => (
    <div
      className={cn(
        'flex gap-2',
        layout === 'stack'
          ? 'flex-col'
          : 'flex-col sm:flex-row sm:flex-wrap sm:justify-end',
      )}
    >
      <Button
        size="sm"
        variant="outline"
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        onClick={() => void handleDownloadSavedLetter(letter)}
        disabled={downloadingLetterId === letter.id}
      >
        {downloadingLetterId === letter.id ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 size-4" />
        )}
        {t('letterGeneration.savedLetters.actions.download')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        onClick={() => setSelectedSavedLetterId(letter.id)}
      >
        <Eye className="mr-2 size-4" />
        {t('letterGeneration.savedLetters.actions.preview')}
      </Button>
      {/* <Button
        size="sm"
        variant="outline"
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        onClick={() => void handleRegenerateSavedLetter(letter)}
        disabled={regeneratingLetterId === letter.id}
      >
        {regeneratingLetterId === letter.id ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 size-4" />
        )}
        {t('letterGeneration.savedLetters.actions.regenerate')}
      </Button> */}
      <Button
        size="sm"
        variant="destructive"
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        onClick={() => void handleDeleteSavedLetter(letter.id)}
      >
        <Trash2 className="mr-2 size-4" />
        {t('letterGeneration.savedLetters.actions.delete')}
      </Button>
    </div>
  );

  const renderCommonFields = <T extends CommonLetterFields>(
    fields: T,
    setFields: React.Dispatch<React.SetStateAction<T>>,
  ) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup
          label={t('letterGeneration.fields.referenceNo')}
          required
          error={commonFieldErrors.referenceNo}
        >
          <Input
            value={fields.referenceNo}
            onChange={(e) => {
              setFields({ ...fields, referenceNo: e.target.value });
              if (commonFieldErrors.referenceNo) {
                setCommonFieldErrors((prev) => ({ ...prev, referenceNo: undefined }));
              }
            }}
            placeholder={t('letterGeneration.placeholders.referenceNo')}
            required
            aria-invalid={!!commonFieldErrors.referenceNo}
          />
        </FieldGroup>
        <FieldGroup
          label={t('letterGeneration.fields.date')}
          required
          error={commonFieldErrors.date}
        >
          <LetterDatePicker
            locale={letterLocale}
            value={fields.date}
            onValueChange={(next) => {
              setFields({ ...fields, date: next });
              if (commonFieldErrors.date) {
                setCommonFieldErrors((prev) => ({ ...prev, date: undefined }));
              }
            }}
            placeholder={t('letterGeneration.placeholders.date')}
          />
        </FieldGroup>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('letterGeneration.title')}
        description={t('letterGeneration.description')}
        actions={
          <Button variant="outline" asChild>
            <Link href="/modules/letter-generation/addresses">
              <MapPin className="mr-2 size-4" />
              {t('letterGeneration.addresses.manageLink')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader
          className="cursor-pointer select-none p-4 transition-colors hover:bg-muted/50 sm:p-6 rounded-t-lg"
          onClick={() => setIsGeneratorCollapsed((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsGeneratorCollapsed((v) => !v);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={!isGeneratorCollapsed}
          aria-controls="letter-generator-content"
          id="letter-generator-header"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">{t('letterGeneration.title')}</CardTitle>
              <CardDescription>{t('letterGeneration.formDescription')}</CardDescription>
            </div>
            {isGeneratorCollapsed ? (
              <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronUp className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </div>
        </CardHeader>

        {isGeneratorCollapsed ? null : (
          <CardContent
            id="letter-generator-content"
            aria-labelledby="letter-generator-header"
            className="p-4 sm:p-6"
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as LetterType)}
            >
              <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FieldGroup label={t('letterGeneration.fields.letterType')}>
                  <Select
                    value={activeTab}
                    onValueChange={(value: LetterType) => setActiveTab(value)}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('letterGeneration.placeholders.letterType')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {LETTER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`letterGeneration.tabs.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label={t('letterGeneration.fields.letterLanguage')}>
                  <Select
                    value={letterLocale}
                    onValueChange={(value: LetterLocale) => setLetterLocale(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LETTER_LOCALES.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {t(`letterGeneration.letterLanguage.${lang}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label={t('letterGeneration.fields.paperSize')}>
                  <Select
                    value={paperSizeDraft}
                    onValueChange={(value: LetterPaperSize) => setPaperSizeDraft(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LETTER_PAPER_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {t(`letterGeneration.paperSize.options.${size}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
              </div>

              <div className="mt-6 grid gap-4 md:gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg">
                      {t('letterGeneration.formTitle')}
                    </CardTitle>
                    <CardDescription>
                      {t('letterGeneration.formDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <TabsContent value="fees" className="mt-0 space-y-4">
                      {renderCommonFields(feesFields, setFeesFields)}
                      <FieldGroup label={letterLocale === 'mr' ? 'संस्था नाव' : 'Institute Name'}>
                        <Input
                          value={feesFields.schoolName}
                          onChange={(e) =>
                            setFeesFields({ ...feesFields, schoolName: e.target.value })
                          }
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={letterLocale === 'mr' ? 'संस्था पत्ता' : 'Institute Address'}
                        addressType="school"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.school}
                        addresses={addresses}
                        addressParts={manualAddressParts.school}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('school', parts)
                        }
                        pincodeError={addressPincodeErrors.school}
                        onSelectedAddressIdChange={(id) =>
                          handleSchoolAddressSelect(id, feesFields.schoolAddress)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.standard')}>
                          <Input
                            value={feesFields.standard}
                            onChange={(e) =>
                              setFeesFields({ ...feesFields, standard: e.target.value })
                            }
                            placeholder={t('letterGeneration.placeholders.standard')}
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.studentName')}>
                          <Input
                            value={feesFields.studentName}
                            onChange={(e) =>
                              setFeesFields({
                                ...feesFields,
                                studentName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                    </TabsContent>

                    <TabsContent value="school-admission" className="mt-0 space-y-4">
                      {renderCommonFields(schoolAdmissionFields, setSchoolAdmissionFields)}
                      <FieldGroup label={letterLocale === 'mr' ? 'संस्था नाव' : 'Institute Name'}>
                        <Input
                          value={schoolAdmissionFields.schoolName}
                          onChange={(e) =>
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              schoolName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={letterLocale === 'mr' ? 'संस्था पत्ता' : 'Institute Address'}
                        addressType="school"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.school}
                        addresses={addresses}
                        addressParts={manualAddressParts.school}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('school', parts)
                        }
                        pincodeError={addressPincodeErrors.school}
                        onSelectedAddressIdChange={(id) =>
                          handleSchoolAddressSelect(id, schoolAdmissionFields.schoolAddress)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.standard')}>
                          <Input
                            value={schoolAdmissionFields.standard}
                            onChange={(e) =>
                              setSchoolAdmissionFields({
                                ...schoolAdmissionFields,
                                standard: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.studentName')}>
                          <Input
                            value={schoolAdmissionFields.studentName}
                            onChange={(e) =>
                              setSchoolAdmissionFields({
                                ...schoolAdmissionFields,
                                studentName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.parentName')}>
                        <Input
                          value={schoolAdmissionFields.parentName}
                          onChange={(e) =>
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              parentName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={t('letterGeneration.fields.address')}
                        addressType="general"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.applicant}
                        addresses={addresses}
                        addressParts={manualAddressParts.applicant}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('applicant', parts)
                        }
                        pincodeError={addressPincodeErrors.applicant}
                        onSelectedAddressIdChange={(id) =>
                          handleApplicantAddressSelect(id, schoolAdmissionFields.address)
                        }
                      />
                      <FieldGroup label={t('letterGeneration.fields.reasonText')}>
                        <Textarea
                          value={schoolAdmissionFields.reasonText}
                          onChange={(e) =>
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              reasonText: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="school-transfer" className="mt-0 space-y-4">
                      {renderCommonFields(schoolTransferFields, setSchoolTransferFields)}
                      <FieldGroup label={letterLocale === 'mr' ? 'संस्था नाव' : 'Institute Name'}>
                        <Input
                          value={schoolTransferFields.schoolName}
                          onChange={(e) =>
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              schoolName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={letterLocale === 'mr' ? 'संस्था पत्ता' : 'Institute Address'}
                        addressType="school"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.school}
                        addresses={addresses}
                        addressParts={manualAddressParts.school}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('school', parts)
                        }
                        pincodeError={addressPincodeErrors.school}
                        onSelectedAddressIdChange={(id) =>
                          handleSchoolAddressSelect(id, schoolTransferFields.schoolAddress)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.standard')}>
                          <Input
                            value={schoolTransferFields.standard}
                            onChange={(e) =>
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                standard: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.studentName')}>
                          <Input
                            value={schoolTransferFields.studentName}
                            onChange={(e) =>
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                studentName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label={t('letterGeneration.fields.parentName')}>
                        <Input
                          value={schoolTransferFields.parentName}
                          onChange={(e) =>
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              parentName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={t('letterGeneration.fields.address')}
                        addressType="general"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.applicant}
                        addresses={addresses}
                        addressParts={manualAddressParts.applicant}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('applicant', parts)
                        }
                        pincodeError={addressPincodeErrors.applicant}
                        onSelectedAddressIdChange={(id) =>
                          handleApplicantAddressSelect(id, schoolTransferFields.address)
                        }
                      />
                      <FieldGroup label={t('letterGeneration.fields.previousSchoolName')}>
                        <Input
                          value={schoolTransferFields.previousSchoolName}
                          onChange={(e) =>
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              previousSchoolName: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.currentStandard')}>
                          <Input
                            value={schoolTransferFields.currentStandard}
                            onChange={(e) =>
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                currentStandard: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.transferReason')}>
                          <Input
                            value={schoolTransferFields.transferReason}
                            onChange={(e) =>
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                transferReason: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                    </TabsContent>

                    {(
                      [
                        'ration-new',
                        'ration-add-members',
                        'ration-delete-members',
                        'ration-transfer',
                      ] as const
                    ).map((rationType) => (
                      <TabsContent key={rationType} value={rationType} className="mt-0 space-y-4">
                        {renderCommonFields(rationFields, setRationFields)}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FieldGroup label={t('letterGeneration.fields.gender')}>
                            <Select
                              value={rationFields.gender}
                              onValueChange={(value: PersonGender) =>
                                setRationFields((prev) => ({
                                  ...prev,
                                  gender: value,
                                  salutation: resolveSalutation(letterLocale, value),
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">
                                  {t('letterGeneration.gender.male')}
                                </SelectItem>
                                <SelectItem value="female">
                                  {t('letterGeneration.gender.female')}
                                </SelectItem>
                                <SelectItem value="other">
                                  {t('letterGeneration.gender.other')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FieldGroup>
                          <FieldGroup label={t('letterGeneration.fields.salutation')}>
                            <Input
                              value={rationFields.salutation}
                              onChange={(e) =>
                                setRationFields({
                                  ...rationFields,
                                  salutation: e.target.value,
                                })
                              }
                            />
                          </FieldGroup>
                          <FieldGroup label={t('letterGeneration.fields.fullName')}>
                            <Input
                              value={rationFields.fullName}
                              onChange={(e) =>
                                setRationFields({
                                  ...rationFields,
                                  fullName: e.target.value,
                                })
                              }
                            />
                          </FieldGroup>
                        </div>
                        <LetterAddressField
                          label={t('letterGeneration.fields.address')}
                          addressType="general"
                          locale={letterLocale}
                          selectedAddressId={addressSelections.applicant}
                          addresses={addresses}
                          addressParts={manualAddressParts.applicant}
                          onAddressPartsChange={(parts) =>
                            handleManualAddressPartsChange('applicant', parts)
                          }
                          pincodeError={addressPincodeErrors.applicant}
                          onSelectedAddressIdChange={(id) =>
                            handleApplicantAddressSelect(id, rationFields.address)
                          }
                        />
                        {rationType !== 'ration-new' ? (
                          <FieldGroup label={t('letterGeneration.fields.rationCardNo')}>
                            <Input
                              value={rationFields.rationCardNo ?? ''}
                              onChange={(e) =>
                                setRationFields({
                                  ...rationFields,
                                  rationCardNo: e.target.value,
                                })
                              }
                            />
                          </FieldGroup>
                        ) : null}
                        {rationType === 'ration-transfer' ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <FieldGroup label={t('letterGeneration.fields.fromRationOffice')}>
                              <Input
                                value={rationFields.fromRationOffice ?? ''}
                                onChange={(e) =>
                                  setRationFields({
                                    ...rationFields,
                                    fromRationOffice: e.target.value,
                                  })
                                }
                              />
                            </FieldGroup>
                            <FieldGroup label={t('letterGeneration.fields.toRationOffice')}>
                              <Input
                                value={rationFields.toRationOffice ?? ''}
                                onChange={(e) =>
                                  setRationFields({
                                    ...rationFields,
                                    toRationOffice: e.target.value,
                                  })
                                }
                              />
                            </FieldGroup>
                          </div>
                        ) : null}
                        <FieldGroup label={t('letterGeneration.fields.familyMembers')}>
                          <Textarea
                            value={rationFields.familyMembers}
                            onChange={(e) =>
                              setRationFields({
                                ...rationFields,
                                familyMembers: e.target.value,
                              })
                            }
                            rows={4}
                            placeholder={t('letterGeneration.placeholders.familyMembers')}
                          />
                        </FieldGroup>
                        <LetterAddressField
                          label={t('letterGeneration.fields.rationOfficeAddress')}
                          addressType="ration_office"
                          locale={letterLocale}
                          selectedAddressId={addressSelections.rationOffice}
                          addresses={addresses}
                          addressParts={manualAddressParts.rationOffice}
                          onAddressPartsChange={(parts) =>
                            handleManualAddressPartsChange('rationOffice', parts)
                          }
                          pincodeError={addressPincodeErrors.rationOffice}
                          onSelectedAddressIdChange={(id) =>
                            handleRationOfficeAddressSelect(id, rationFields.rationOfficeAddress)
                          }
                        />
                      </TabsContent>
                    ))}

                    <TabsContent value="income" className="mt-0 space-y-4">
                      {renderCommonFields(incomeFields, setIncomeFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.gender')}>
                          <Select
                            value={incomeFields.gender}
                            onValueChange={(value: PersonGender) =>
                              setIncomeFields((prev) => ({
                                ...prev,
                                gender: value,
                                salutation: resolveSalutation(letterLocale, value),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">
                                {t('letterGeneration.gender.male')}
                              </SelectItem>
                              <SelectItem value="female">
                                {t('letterGeneration.gender.female')}
                              </SelectItem>
                              <SelectItem value="other">
                                {t('letterGeneration.gender.other')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.salutation')}>
                          <Input
                            value={incomeFields.salutation}
                            onChange={(e) =>
                              setIncomeFields({
                                ...incomeFields,
                                salutation: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.fullName')}>
                          <Input
                            value={incomeFields.fullName}
                            onChange={(e) =>
                              setIncomeFields({
                                ...incomeFields,
                                fullName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <LetterAddressField
                        label={t('letterGeneration.fields.address')}
                        addressType="general"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.applicant}
                        addresses={addresses}
                        addressParts={manualAddressParts.applicant}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('applicant', parts)
                        }
                        pincodeError={addressPincodeErrors.applicant}
                        onSelectedAddressIdChange={(id) =>
                          handleApplicantAddressSelect(id, incomeFields.address)
                        }
                      />
                      <LetterAddressField
                        label={t('letterGeneration.fields.officeAddress')}
                        addressType="office"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.office}
                        addresses={addresses}
                        addressParts={manualAddressParts.office}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('office', parts)
                        }
                        pincodeError={addressPincodeErrors.office}
                        onSelectedAddressIdChange={(id) =>
                          handleOfficeAddressSelect(id, incomeFields.officeAddress)
                        }
                      />
                      <FieldGroup label={t('letterGeneration.fields.aadhaarNo')}>
                        <Input
                          value={incomeFields.aadhaarNo}
                          onChange={(e) =>
                            setIncomeFields({
                              ...incomeFields,
                              aadhaarNo: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                      <FieldGroup label={t('letterGeneration.fields.annualIncome')}>
                        <Input
                          value={incomeFields.annualIncome}
                          onChange={(e) =>
                            setIncomeFields({
                              ...incomeFields,
                              annualIncome: e.target.value,
                            })
                          }
                          placeholder={t('letterGeneration.placeholders.income')}
                        />
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="domicile" className="mt-0 space-y-4">
                      {renderCommonFields(domicileFields, setDomicileFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={t('letterGeneration.fields.gender')}>
                          <Select
                            value={domicileFields.gender}
                            onValueChange={(value: PersonGender) =>
                              setDomicileFields((prev) => ({
                                ...prev,
                                gender: value,
                                salutation: resolveSalutation(letterLocale, value),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">
                                {t('letterGeneration.gender.male')}
                              </SelectItem>
                              <SelectItem value="female">
                                {t('letterGeneration.gender.female')}
                              </SelectItem>
                              <SelectItem value="other">
                                {t('letterGeneration.gender.other')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.salutation')}>
                          <Input
                            value={domicileFields.salutation}
                            onChange={(e) =>
                              setDomicileFields({
                                ...domicileFields,
                                salutation: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                        <FieldGroup label={t('letterGeneration.fields.fullName')}>
                          <Input
                            value={domicileFields.fullName}
                            onChange={(e) =>
                              setDomicileFields({
                                ...domicileFields,
                                fullName: e.target.value,
                              })
                            }
                          />
                        </FieldGroup>
                      </div>
                      <LetterAddressField
                        label={t('letterGeneration.fields.address')}
                        addressType="general"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.applicant}
                        addresses={addresses}
                        addressParts={manualAddressParts.applicant}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('applicant', parts)
                        }
                        pincodeError={addressPincodeErrors.applicant}
                        onSelectedAddressIdChange={(id) =>
                          handleApplicantAddressSelect(id, domicileFields.address)
                        }
                      />
                      <LetterAddressField
                        label={t('letterGeneration.fields.officeAddress')}
                        addressType="office"
                        locale={letterLocale}
                        selectedAddressId={addressSelections.office}
                        addresses={addresses}
                        addressParts={manualAddressParts.office}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('office', parts)
                        }
                        pincodeError={addressPincodeErrors.office}
                        onSelectedAddressIdChange={(id) =>
                          handleOfficeAddressSelect(id, domicileFields.officeAddress)
                        }
                      />
                      <FieldGroup label={t('letterGeneration.fields.aadhaarNo')}>
                        <Input
                          value={domicileFields.aadhaarNo}
                          onChange={(e) =>
                            setDomicileFields({
                              ...domicileFields,
                              aadhaarNo: e.target.value,
                            })
                          }
                        />
                      </FieldGroup>
                    </TabsContent>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">
                        {t('letterGeneration.previewTitle')}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {t('letterGeneration.paperSize.label', {
                          size: activePaperLabel,
                        })}
                        {' · '}
                        {t('letterGeneration.paperSize.hint')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={handleSaveLetter}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 size-4" />
                        )}
                        {t('letterGeneration.savedLetters.save')}
                      </Button>
                    </div>
                  </div>
                  <LetterPreview
                    html={activeBody}
                    paperSize={activePaperSize}
                    letterheadUrl={activeLetterheadUrl}
                    letterLocale={letterLocale}
                  />
                </div>
              </div>
            </Tabs>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader
          className="cursor-pointer select-none p-4 transition-colors hover:bg-muted/50 sm:p-6 rounded-t-lg"
          onClick={() => setIsTemplateEditorOpen((value) => !value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsTemplateEditorOpen((value) => !value);
            }
          }}
          role="button"
          tabIndex={0}
          aria-expanded={isTemplateEditorOpen}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {t('letterGeneration.templates.title')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.templates.description')}
              </CardDescription>
            </div>
            {isTemplateEditorOpen ? (
              <ChevronUp className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
            )}
          </div>
        </CardHeader>
        {isTemplateEditorOpen ? (
          <CardContent className="space-y-4 p-4 sm:p-6">
            {!activeLetterMaster ? (
              <p className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {t('letterGeneration.templates.noTemplateHint')}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FieldGroup label={t('letterGeneration.templates.name')}>
                <Input
                  value={templateNameDraft}
                  onChange={(e) => setTemplateNameDraft(e.target.value)}
                  placeholder={t('letterGeneration.templates.namePlaceholder')}
                />
              </FieldGroup>
              <FieldGroup label={t('letterGeneration.templates.activeTemplate')}>
                <Input
                  value={t(`letterGeneration.tabs.${activeTab}`)}
                  disabled
                />
              </FieldGroup>
              <FieldGroup label={t('letterGeneration.fields.paperSize')}>
                <Select
                  value={paperSizeDraft}
                  onValueChange={(value: LetterPaperSize) => setPaperSizeDraft(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LETTER_PAPER_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {t(`letterGeneration.paperSize.options.${size}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>
            <FieldGroup label={t('letterGeneration.templates.letterhead')}>
              <div className="space-y-3">
                {letterheadDraft ? (
                  <div className="overflow-hidden rounded-lg border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={letterheadDraft}
                      alt={t('letterGeneration.templates.letterheadPreviewAlt')}
                      className={cn(
                        'mx-auto block object-contain',
                        letterheadModeDraft === 'full'
                          ? 'w-full'
                          : 'w-1/2',
                      )}
                    />
                  </div>
                ) : (
                  <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 text-center text-sm text-muted-foreground">
                    <ImageIcon className="mr-2 size-4 shrink-0" aria-hidden />
                    {t('letterGeneration.templates.letterheadEmpty')}
                  </div>
                )}
                {letterheadDraft ? (
                  <FieldGroup label={t('letterGeneration.templates.letterheadMode')}>
                    <Select
                      value={letterheadModeDraft}
                      onValueChange={(value: LetterheadMode) =>
                        setLetterheadModeDraft(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">
                          {t('letterGeneration.templates.letterheadModeFull')}
                        </SelectItem>
                        <SelectItem value="half">
                          {t('letterGeneration.templates.letterheadModeHalf')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldGroup>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={letterheadInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadLetterhead(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => letterheadInputRef.current?.click()}
                    disabled={isUploadingLetterhead}
                  >
                    {isUploadingLetterhead ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 size-4" />
                    )}
                    {letterheadDraft
                      ? t('letterGeneration.templates.letterheadReplace')
                      : t('letterGeneration.templates.letterheadUpload')}
                  </Button>
                  {letterheadDraft ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setLetterheadDraft(null);
                        setLetterheadModeDraft('full');
                      }}
                      disabled={isUploadingLetterhead}
                    >
                      <X className="mr-2 size-4" />
                      {t('letterGeneration.templates.letterheadRemove')}
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('letterGeneration.templates.letterheadHint')}
                </p>
              </div>
            </FieldGroup>
            <FieldGroup label={t('letterGeneration.templates.html')}>
              <Textarea
                value={templateDraft}
                onChange={(e) => setTemplateDraft(e.target.value)}
                rows={16}
                className="font-mono text-xs sm:text-sm"
                placeholder={t('letterGeneration.templates.htmlPlaceholder')}
              />
            </FieldGroup>
            <p className="text-xs text-muted-foreground">
              {t('letterGeneration.templates.placeholderHint')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => void refreshLetterMasters()}
                disabled={letterMastersLoading}
              >
                {t('letterGeneration.savedLetters.refresh')}
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={() => void handleSaveTemplate()}
                disabled={
                  isSavingTemplate ||
                  !templateNameDraft.trim() ||
                  !templateDraft.trim()
                }
              >
                {isSavingTemplate ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                {activeLetterMaster
                  ? t('letterGeneration.templates.save')
                  : t('letterGeneration.templates.create')}
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                {t('letterGeneration.savedLetters.title')}
              </CardTitle>
              <CardDescription>
                {t('letterGeneration.savedLetters.description')}
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground sm:shrink-0 sm:text-right">
              {savedLettersLoading
                ? t('common.loading')
                : hasActiveSavedLetterFilters
                  ? t('letterGeneration.savedLetters.filteredCount', {
                    filtered: filteredSavedLetters.length,
                    total: savedLetters.length,
                  })
                  : t('letterGeneration.savedLetters.count', {
                    count: savedLetters.length,
                  })}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {savedLetters.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              {t('letterGeneration.savedLetters.empty')}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FieldGroup label={t('letterGeneration.fields.letterType')}>
                  <Select
                    value={filterLetterType}
                    onValueChange={(value: SavedLetterTypeFilter) =>
                      setFilterLetterType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_LETTER_TYPES}>
                        {t('letterGeneration.savedLetters.filters.allTypes')}
                      </SelectItem>
                      {LETTER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`letterGeneration.tabs.${type}`)}
                        </SelectItem>
                      ))}
                      <SelectItem value="ration">
                        {t('letterGeneration.tabs.ration')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label={t('letterGeneration.fields.referenceNo')}>
                  <Input
                    value={filterReference}
                    onChange={(e) => setFilterReference(e.target.value)}
                    placeholder={t('letterGeneration.placeholders.referenceNo')}
                  />
                </FieldGroup>

                <FieldGroup
                  label={t('letterGeneration.savedLetters.filters.dateRange')}
                  className="sm:col-span-2"
                >
                  <DateRangePicker
                    startDate={filterStartDate}
                    endDate={filterEndDate}
                    onDateRangeChange={(start, end) => {
                      setFilterStartDate(start);
                      setFilterEndDate(end);
                    }}
                  />
                </FieldGroup>
              </div>

              {filteredSavedLetters.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">
                  {t('letterGeneration.savedLetters.noFilterResults')}
                </div>
              ) : (
                <>
                  <div className="flex justify-stretch sm:justify-end">
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => void refreshSavedLetters()}
                      disabled={savedLettersLoading}
                    >
                      {t('letterGeneration.savedLetters.refresh')}
                    </Button>
                  </div>

                  <div className="space-y-3 lg:hidden">
                    {filteredSavedLetters.map((letter) => (
                      <div
                        key={letter.id}
                        className="space-y-3 rounded-lg border bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-medium">
                              {letter.referenceNo || '—'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t(`letterGeneration.tabs.${letter.letterType}`)} ·{' '}
                              {t(`letterGeneration.letterLanguage.${letter.letterLocale}`)}{' '}
                              ·{' '}
                              {getLetterPaperLabel(resolveSavedLetterPaperSize(letter))}
                            </p>
                          </div>
                          <p className="shrink-0 text-xs text-muted-foreground">
                            {new Date(letter.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                        {renderSavedLetterActions(letter, 'stack')}
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            {t('letterGeneration.savedLetters.columns.referenceNo')}
                          </TableHead>
                          <TableHead>{t('letterGeneration.savedLetters.columns.type')}</TableHead>
                          <TableHead>
                            {t('letterGeneration.savedLetters.columns.locale')}
                          </TableHead>
                          <TableHead>
                            {t('letterGeneration.savedLetters.columns.createdAt')}
                          </TableHead>
                          <TableHead className="text-right">
                            {t('letterGeneration.savedLetters.columns.actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSavedLetters.map((letter) => (
                          <TableRow key={letter.id}>
                            <TableCell className="font-medium">
                              {letter.referenceNo || '—'}
                            </TableCell>
                            <TableCell>
                              {t(`letterGeneration.tabs.${letter.letterType}`)}{' '}
                              <span className="text-muted-foreground">
                                ({getLetterPaperLabel(resolveSavedLetterPaperSize(letter))})
                              </span>
                            </TableCell>
                            <TableCell>
                              {t(`letterGeneration.letterLanguage.${letter.letterLocale}`)}
                            </TableCell>
                            <TableCell>
                              {new Date(letter.createdAt).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right">
                              {renderSavedLetterActions(letter)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Dialog
                    open={!!selectedSavedLetter}
                    onOpenChange={(open) => {
                      if (!open) setSelectedSavedLetterId(null);
                    }}
                  >
                    <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto p-4 sm:w-full sm:p-6">
                      {selectedSavedLetter ? (
                        <>
                          <DialogHeader className="space-y-4">
                            <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-1.5 text-left">
                                <DialogTitle>
                                  {selectedSavedLetter.title}{' '}
                                  {selectedSavedLetter.referenceNo
                                    ? `- ${selectedSavedLetter.referenceNo}`
                                    : ''}
                                </DialogTitle>
                                <DialogDescription>
                                  {t(`letterGeneration.tabs.${selectedSavedLetter.letterType}`)} ·{' '}
                                  {t(
                                    `letterGeneration.letterLanguage.${selectedSavedLetter.letterLocale}`,
                                  )}{' '}
                                  ·{' '}
                                  {t('letterGeneration.paperSize.label', {
                                    size: getLetterPaperLabel(
                                      resolveSavedLetterPaperSize(selectedSavedLetter),
                                    ),
                                  })}
                                </DialogDescription>
                              </div>
                              <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => handlePrintSavedLetter(selectedSavedLetter)}
                                >
                                  <Printer className="mr-2 size-4" />
                                  {t('letterGeneration.savedLetters.actions.print')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() => void handleDownloadSavedLetter(selectedSavedLetter)}
                                  disabled={downloadingLetterId === selectedSavedLetter.id}
                                >
                                  {downloadingLetterId === selectedSavedLetter.id ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                  ) : (
                                    <FileDown className="mr-2 size-4" />
                                  )}
                                  {t('letterGeneration.savedLetters.actions.download')}
                                </Button>
                              </div>
                            </div>
                          </DialogHeader>
                          <div className="min-h-[60vh]">
                            <LetterPreview
                              html={selectedSavedLetter.renderedHtml}
                              paperSize={resolveSavedLetterPaperSize(selectedSavedLetter)}
                              letterheadUrl={resolveLetterheadUrl(
                                resolveSavedLetterPaperSize(selectedSavedLetter),
                                letterMasters.find(
                                  (m) => m.id === selectedSavedLetter.letterMasterId,
                                )?.letterheadUrl,
                              )}
                              letterLocale={selectedSavedLetter.letterLocale}
                            />
                          </div>
                        </>
                      ) : null}
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
