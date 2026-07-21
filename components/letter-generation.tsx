'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  FileType,
  Calendar,
  ImageIcon,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/confirm-dialog';
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
  resolveLetterheadUrl,
  stripLetterheadFromHtml,
} from '@/lib/letters/letterhead';
import { buildRenderedLetterHtml, type LetterheadMode } from '@/lib/letters/render-template';
import { getDefaultTemplateHtml } from '@/lib/letters/default-template-html';
import {
  getDefaultLetterPaperSize,
  getLetterPaperContentWidthPx,
  getLetterPaperLabel,
  getLetterPaperWidthPx,
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
  LetterAddressField,
  type AddressMasterRow,
} from '@/components/letter-address-field';
import {
  resolveAddressTypeForLetterField,
  type LetterAddressField as LetterAddressFieldKey,
} from '@/lib/letters/letter-address-fields';
import type { LetterAddressTypeLinkRow } from '@/components/letter-address-link-manager';
import {
  AddressTranslationReviewDialog,
  type AddressTranslationReviewResult,
} from '@/components/address-translation-review-dialog';
import {
  EMPTY_ADDRESS_PARTS,
  formatAddressMaster,
  hasAddressContent,
  hasRequiredAddressFields,
  localizeAddressPartsDigits,
  mergeAddressParts,
  parseFreeTextAddressForLocale,
  sanitizeAddressPartsLocations,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import { filterLocaleText } from '@/lib/letters/locale-text';
import { letterMessage } from '@/lib/letters/letter-messages';
import {
  coerceDocumentType,
  defaultReferencePrefix,
  DOCUMENT_TYPES,
  documentTypeLabel,
  formatReference,
  formatReferenceForDisplay,
  formatReferenceNumberForLocale,
  normalizeReferencePrefix,
  parseReference,
  type DocumentType,
} from '@/lib/letters/reference-sequence';
import type { DocumentTypeMasterRow } from '@/components/document-type-master-page';
import {
  formatIndianAmount,
  toLocaleDigits,
  toWesternDigits,
} from '@/lib/locale-digits';
import { cn } from '@/lib/utils';

const ALL_LETTER_TYPES = 'all' as const;
type SavedLetterTypeFilter = LetterType | typeof ALL_LETTER_TYPES | 'ration';
const LETTER_LOCALES: LetterLocale[] = ['en', 'mr'];

type FamilyMemberRow = { name: string; age: string };

function emptyFamilyMemberRow(): FamilyMemberRow {
  return { name: '', age: '' };
}

function normalizeFamilyMemberAge(age: string): string {
  return toWesternDigits(age).replace(/\D/g, '').slice(0, 3);
}

/** Digits-only Aadhaar (max 12). Accepts Devanagari input. */
function normalizeAadhaarNo(value: string): string {
  return toWesternDigits(value).replace(/\D/g, '').slice(0, 12);
}

function formatFamilyMembersString(
  members: FamilyMemberRow[],
  locale: LetterLocale,
): string {
  return members
    .filter((member) => member.name.trim() && normalizeFamilyMemberAge(member.age))
    .map((member, index) => {
      const age = toLocaleDigits(normalizeFamilyMemberAge(member.age), locale);
      const yearsLabel = locale === 'mr' ? 'वर्षे' : 'years';
      return `${toLocaleDigits(index + 1, locale)}- ${member.name.trim()}  ${age} ${yearsLabel}`;
    })
    .join('\n');
}

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
    referencePrefix: defaultReferencePrefix(locale),
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
    salutation: resolveSalutation(locale, 'female'),
    fullName: '',
    address: '',
    familyMembers: '',
    rationOfficeAddress: '',
    rationCardNo: '',
    fromRationOffice: '',
    toRationOffice: '',
  };
}

function incomeDefaults(locale: LetterLocale): IncomeLetterFields {
  return {
    ...commonDefaults(locale),
    gender: 'male',
    salutation: resolveSalutation(locale, 'male'),
    fullName: '',
    address: '',
    officeName: '',
    officeAddress: '',
    aadhaarNo: '',
    annualIncome: '',
  };
}

function domicileDefaults(locale: LetterLocale): DomicileLetterFields {
  return {
    ...commonDefaults(locale),
    gender: 'male',
    salutation: resolveSalutation(locale, 'male'),
    fullName: '',
    address: '',
    officeName: '',
    officeAddress: '',
    aadhaarNo: '',
  };
}

function resolveSalutation(locale: LetterLocale, gender: PersonGender): string {
  if (locale === 'en') {
    if (gender === 'female') return 'Mrs.';
    if (gender === 'male') return 'Mr.';
    return 'Mr./Mrs.';
  }
  if (gender === 'female') return 'श्रीमती';
  if (gender === 'male') return 'श्री';
  return 'श्री/श्रीमती';
}

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

function createLetterExportElement(
  html: string,
  options?: {
    paperSize?: LetterPaperSize;
    letterLocale?: LetterLocale;
  },
): HTMLDivElement {
  const host = document.createElement('div');
  const contentHtml = stripLetterheadFromHtml(html);
  const paperSize = options?.paperSize ?? 'a4';
  const fontFamily = LETTER_FONT_STACK[options?.letterLocale ?? 'mr'];
  const fontSizePx = getLetterPrintFontSizePx(paperSize);

  // Letterhead is drawn per-page by the PDF exporter — capture text only so
  // margins/header clearance stay aligned with print/preview.
  host.style.position = 'relative';
  host.style.background = 'transparent';
  host.style.color = '#000';
  host.style.boxSizing = 'border-box';
  host.style.width = `${getLetterPaperContentWidthPx(paperSize)}px`;
  host.style.fontFamily = fontFamily;
  host.style.fontSize = `${fontSizePx}px`;
  host.style.lineHeight = String(LETTER_PRINT_LINE_HEIGHT);
  host.innerHTML = contentHtml;

  const letterContent = host.querySelector('.letter-content');
  if (letterContent instanceof HTMLElement) {
    letterContent.style.margin = '0';
    // Collapse template source whitespace (newlines/indent). Line breaks come
    // from <br> / block elements — pre-wrap was blowing A5 letters onto 3 pages.
    letterContent.style.whiteSpace = 'normal';
    letterContent.style.fontSize = `${fontSizePx}px`;
    // Keep template line-height when set (fees is tuned to 1.55). Forcing
    // 1.75 here made the last line sit on the page edge and get clipped in PDF.
    if (!letterContent.style.lineHeight) {
      letterContent.style.lineHeight = String(LETTER_PRINT_LINE_HEIGHT);
    }
    letterContent.style.fontFamily = fontFamily;
    letterContent.style.color = '#000';
  }

  return host;
}

const LETTER_PREVIEW_MAX_WIDTH_CLASS: Record<LetterPaperSize, string> = {
  a4: 'max-w-[794px]',
  a5: 'max-w-[559px]',
  b5: 'max-w-[665px]',
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

  return (
    <div
      className={cn(
        // overflow-x only — overflow-hidden was clipping the last line's descenders.
        'relative mx-auto w-full overflow-x-hidden rounded-lg border bg-white text-black',
        LETTER_PREVIEW_MAX_WIDTH_CLASS[paperSize],
      )}
      style={{
        aspectRatio: LETTER_PAPER_ASPECT_RATIO[paperSize],
        width: '100%',
        maxWidth: getLetterPaperWidthPx(paperSize),
        fontFamily: LETTER_FONT_STACK[letterLocale],
        fontSize: `${getLetterPrintFontSizePx(paperSize)}px`,
        lineHeight: LETTER_PRINT_LINE_HEIGHT,
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
          'absolute inset-0 overflow-y-auto',
          LETTER_PREVIEW_CONTENT_CLASSES,
        )}
        style={{
          // Same mm padding as print / PDF so preview is WYSIWYG.
          padding: getLetterBodyPaddingCss(paperSize, Boolean(resolvedLetterhead)),
        }}
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

/** Text input that only accepts characters for the selected letter language. */
function LocaleTextInput({
  locale,
  value,
  onValueChange,
  ...props
}: {
  locale: LetterLocale;
  value: string;
  onValueChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
  return (
    <Input
      {...props}
      value={value}
      lang={locale === 'mr' ? 'mr' : 'en'}
      onChange={(e) => onValueChange(filterLocaleText(e.target.value, locale))}
    />
  );
}

function LocaleTextarea({
  locale,
  value,
  onValueChange,
  ...props
}: {
  locale: LetterLocale;
  value: string;
  onValueChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'>) {
  return (
    <Textarea
      {...props}
      value={value}
      lang={locale === 'mr' ? 'mr' : 'en'}
      onChange={(e) => onValueChange(filterLocaleText(e.target.value, locale))}
    />
  );
}

type LetterFieldErrors = Record<string, string | undefined>;

function requireField(
  errors: LetterFieldErrors,
  key: string,
  value: string | undefined,
  message: string,
) {
  if (!value?.trim()) {
    errors[key] = message;
  }
}

function validateRequiredCommonFields(
  referencePrefix: string,
  referenceNo: string,
  date: string,
  t: (key: string) => string,
  existingReferenceNos: string[] = [],
): LetterFieldErrors {
  const errors: LetterFieldErrors = {};
  const trimmedPrefix = normalizeReferencePrefix(referencePrefix);
  const trimmedNumber = toWesternDigits(referenceNo.trim());
  if (!trimmedPrefix) {
    errors.referencePrefix = t('letterGeneration.validation.referencePrefixRequired');
  }
  if (!trimmedNumber) {
    errors.referenceNo = t('letterGeneration.validation.referenceNoRequired');
  } else {
    const fullReference = formatReference(trimmedPrefix, trimmedNumber);
    if (
      existingReferenceNos.some((existing) => existing.trim() === fullReference)
    ) {
      errors.referenceNo = t('letterGeneration.validation.referenceNoDuplicate');
    }
  }
  if (!date.trim()) {
    errors.date = t('letterGeneration.validation.dateRequired');
  }
  return errors;
}

function isAddressProvided(
  selectedId: string | null,
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  addressText = '',
): boolean {
  if (selectedId) return true;
  if (hasRequiredAddressFields(parts, locale)) return true;
  // Manual free-text only (structured parts empty)
  if (addressText.trim() && !hasAddressContent(parts)) return true;
  return false;
}

type AddressSelectionState = {
  school: string | null;
  applicant: string | null;
  rationOffice: string | null;
  office: string | null;
  fromRationOffice: string | null;
  toRationOffice: string | null;
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

function getManualAddressValidationError(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  t: (key: string) => string,
): string | undefined {
  if (!hasAddressContent(parts)) return undefined;
  if (!hasRequiredAddressFields(parts, locale)) {
    return t('letterGeneration.addresses.fieldsRequired');
  }
  return getPincodeValidationError(parts, t);
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

function getAddressMasterName(
  address: Pick<AddressMasterRow, 'name' | 'nameMr'>,
  locale: LetterLocale,
): string {
  if (locale === 'mr') {
    return address.nameMr.trim() || address.name;
  }
  return address.name;
}

function combineNameAndAddress(name: string, addressText: string): string {
  const trimmedName = name.trim();
  const trimmedAddress = addressText.trim();
  if (trimmedName && trimmedAddress) return `${trimmedName}, ${trimmedAddress}`;
  return trimmedName || trimmedAddress;
}

function formatRationOfficeWithAddress(
  address: Pick<AddressMasterRow, 'name' | 'nameMr'> & AddressMasterAddressParts,
  locale: LetterLocale,
): string {
  const name = getAddressMasterName(address, locale);
  const addressText = formatAddressMaster(address, locale);
  return combineNameAndAddress(name, addressText);
}

function getRationOfficeLabelById(
  addresses: AddressMasterRow[],
  masterId: string | null,
  locale: LetterLocale,
): string | null {
  if (!masterId) return null;
  const address = addresses.find((item) => item.id === masterId);
  if (!address) return null;
  const label = formatRationOfficeWithAddress(address, locale).trim();
  return label || null;
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
    const officeMaster = addresses.find((item) => item.id === selections.office);
    const officeName = officeMaster
      ? getAddressMasterName(officeMaster, locale)
      : '';
    setters.setIncomeFields((prev) => ({
      ...prev,
      officeName: officeName || prev.officeName,
      officeAddress: officeText,
    }));
    setters.setDomicileFields((prev) => ({
      ...prev,
      officeName: officeName || prev.officeName,
      officeAddress: officeText,
    }));
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

export type BeneficiaryServiceInfo = {
  id: string;
  serviceName: string;
  serviceType: 'individual' | 'community';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  token: string;
  description: string | null;
  createdAt: string;
};

export function LetterGeneration({
  isAdmin = false,
  beneficiaryServiceId,
  prefillName,
  prefillAddress,
  service,
}: {
  isAdmin?: boolean;
  beneficiaryServiceId?: string;
  prefillName?: string;
  prefillAddress?: string;
  service?: BeneficiaryServiceInfo;
}) {
  const { t, locale } = useTranslations();
  const [letterLocale, setLetterLocale] = useState<LetterLocale>(locale);
  /** Field labels / options follow letter language, not UI locale. */
  const lt = useCallback(
    (key: string) => letterMessage(letterLocale, key),
    [letterLocale],
  );
  const prevLetterLocaleRef = useRef<LetterLocale>(locale);
  const [activeTab, setActiveTab] = useState<LetterType>('fees');
  const [isSaving, setIsSaving] = useState(false);
  const [addingToOutwardLetterId, setAddingToOutwardLetterId] = useState<
    string | null
  >(null);
  const [outwardAddedReferenceNos, setOutwardAddedReferenceNos] = useState<
    Set<string>
  >(() => new Set());
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
  const [familyMemberRows, setFamilyMemberRows] = useState<FamilyMemberRow[]>(() => [
    emptyFamilyMemberRow(),
  ]);
  const familyMemberRowsRef = useRef(familyMemberRows);
  familyMemberRowsRef.current = familyMemberRows;
  const [incomeFields, setIncomeFields] = useState<IncomeLetterFields>(() =>
    incomeDefaults(locale),
  );
  const [domicileFields, setDomicileFields] = useState<DomicileLetterFields>(
    () => domicileDefaults(locale),
  );
  const referenceNumberAutoRef = useRef(true);
  const referenceSequenceRequestId = useRef(0);

  const [savedLetters, setSavedLetters] = useState<SavedLetterRow[]>([]);
  const [savedLettersLoading, setSavedLettersLoading] = useState(false);
  const [letterMasters, setLetterMasters] = useState<LetterMasterRow[]>([]);
  const [letterMastersLoading, setLetterMastersLoading] = useState(false);
  const [addresses, setAddresses] = useState<AddressMasterRow[]>([]);
  const [addressTypeLinks, setAddressTypeLinks] = useState<LetterAddressTypeLinkRow[]>([]);
  const addressTypeForField = useCallback(
    (field: LetterAddressFieldKey) =>
      resolveAddressTypeForLetterField(addressTypeLinks, activeTab, field),
    [addressTypeLinks, activeTab],
  );
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeMasterRow[]>([]);
  const [addressSelections, setAddressSelections] = useState<AddressSelectionState>({
    school: null,
    applicant: null,
    rationOffice: null,
    office: null,
    fromRationOffice: null,
    toRationOffice: null,
  });
  const addressSelectionsRef = useRef(addressSelections);
  addressSelectionsRef.current = addressSelections;
  const [manualAddressParts, setManualAddressParts] = useState<ManualAddressParts>(() => ({
    school: createEmptyAddressParts(),
    applicant: createEmptyAddressParts(),
    rationOffice: createEmptyAddressParts(),
    office: createEmptyAddressParts(),
    fromRationOffice: createEmptyAddressParts(),
    toRationOffice: createEmptyAddressParts(),
  }));
  const [addressPincodeErrors, setAddressPincodeErrors] = useState<
    Partial<Record<ManualAddressKey, string>>
  >({});
  // Manual entry names for ration office recipients (institute/office reuse
  // their dedicated schoolName/officeName fields instead).
  const [rationOfficeNames, setRationOfficeNames] = useState<{
    rationOffice: string;
    fromRationOffice: string;
    toRationOffice: string;
  }>({ rationOffice: '', fromRationOffice: '', toRationOffice: '' });
  const rationOfficeNamesRef = useRef(rationOfficeNames);
  rationOfficeNamesRef.current = rationOfficeNames;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<string | null>(null);
  const [filterLetterType, setFilterLetterType] =
    useState<SavedLetterTypeFilter>(ALL_LETTER_TYPES);
  const [filterReference, setFilterReference] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LetterFieldErrors>({});
  const [addressReview, setAddressReview] = useState<{
    targetLocale: LetterLocale;
    initialName: string;
    initialParts: AddressMasterAddressParts;
  } | null>(null);
  const [isConfirmingAddressReview, setIsConfirmingAddressReview] = useState(false);
  const addressReviewResolverRef = useRef<
    ((result: AddressTranslationReviewResult | null) => void) | null
  >(null);

  const requestAddressTranslationReview = (request: {
    targetLocale: LetterLocale;
    initialName: string;
    initialParts: AddressMasterAddressParts;
  }): Promise<AddressTranslationReviewResult | null> => {
    return new Promise((resolve) => {
      addressReviewResolverRef.current = resolve;
      setAddressReview(request);
    });
  };

  const resolveAddressReview = (result: AddressTranslationReviewResult | null) => {
    const resolver = addressReviewResolverRef.current;
    addressReviewResolverRef.current = null;
    setAddressReview(null);
    setIsConfirmingAddressReview(false);
    resolver?.(result);
  };

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
    const trimmedName = filterLocaleText(name.trim(), letterLocale);
    if (!trimmedName || !hasRequiredAddressFields(parts, letterLocale)) return null;

    let nameEn = letterLocale === 'en' ? trimmedName : '';
    let nameMr = letterLocale === 'mr' ? trimmedName : '';
    const targetLocale: LetterLocale = letterLocale === 'en' ? 'mr' : 'en';

    let translatedName = '';
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: trimmedName, targetLocale }),
      });
      const json = await res.json();
      if (res.ok) {
        translatedName = filterLocaleText(String(json?.translated ?? '').trim(), targetLocale);
      }
    } catch (error) {
      console.error('Failed to translate address name for auto-save', error);
    }

    let reviewParts = { ...parts };
    const hasTargetContent =
      targetLocale === 'mr'
        ? Boolean(
            parts.line1Mr.trim() ||
              parts.line2Mr.trim() ||
              parts.line3Mr.trim() ||
              parts.cityMr.trim() ||
              parts.stateMr.trim(),
          )
        : Boolean(
            parts.line1En.trim() ||
              parts.line2En.trim() ||
              parts.line3En.trim() ||
              parts.cityEn.trim() ||
              parts.stateEn.trim(),
          );

    if (!hasTargetContent) {
      const sourceText = formatAddressMaster(parts, letterLocale);
      if (sourceText.trim()) {
        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: sourceText, targetLocale }),
          });
          const json = await res.json();
          if (res.ok) {
            const translated = String(json?.translated ?? '').trim();
            if (translated) {
              reviewParts = sanitizeAddressPartsLocations(
                localizeAddressPartsDigits(
                  mergeAddressParts(
                    parts,
                    parseFreeTextAddressForLocale(translated, targetLocale),
                  ),
                  targetLocale,
                ),
              );
            }
          }
        } catch (error) {
          console.error('Failed to translate address for auto-save review', error);
        }
      }
    }

    const reviewed = await requestAddressTranslationReview({
      targetLocale,
      initialName: translatedName,
      initialParts: reviewParts,
    });
    if (!reviewed) return null;

    const reviewedName = filterLocaleText(reviewed.name, targetLocale).trim();
    if (letterLocale === 'en') {
      nameMr = reviewedName;
    } else {
      nameEn = reviewedName;
    }
    if (!nameEn) nameEn = trimmedName;

    const mergedParts = sanitizeAddressPartsLocations(
      localizeAddressPartsDigits(mergeAddressParts(parts, reviewed.parts), 'mr'),
    );

    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: nameEn,
          nameMr,
          addressType,
          ...mergedParts,
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
    setFieldErrors({});
  }, [activeTab, letterLocale]);

  const updateFamilyMemberRows = useCallback(
    (rows: FamilyMemberRow[]) => {
      const nextRows = rows.length > 0 ? rows : [emptyFamilyMemberRow()];
      setFamilyMemberRows(nextRows);
      setRationFields((prev) => ({
        ...prev,
        familyMembers: formatFamilyMembersString(nextRows, letterLocale),
      }));
      setFieldErrors((prev) =>
        prev.familyMembers ? { ...prev, familyMembers: undefined } : prev,
      );
    },
    [letterLocale],
  );

  const syncReferenceFields = useCallback((prefix: string, number: string) => {
    const patch = {
      referencePrefix: prefix,
      referenceNo: number,
    };
    setFeesFields((prev) => ({ ...prev, ...patch }));
    setSchoolAdmissionFields((prev) => ({ ...prev, ...patch }));
    setSchoolTransferFields((prev) => ({ ...prev, ...patch }));
    setRationFields((prev) => ({ ...prev, ...patch }));
    setIncomeFields((prev) => ({ ...prev, ...patch }));
    setDomicileFields((prev) => ({ ...prev, ...patch }));
  }, []);

  const refreshReferenceSequence = useCallback(
    async (prefixInput: string, { force = false }: { force?: boolean } = {}) => {
      const prefix = normalizeReferencePrefix(prefixInput);
      if (!prefix) return;
      if (!force && !referenceNumberAutoRef.current) return;

      const requestId = ++referenceSequenceRequestId.current;
      try {
        const res = await fetch(
          `/api/reference-sequence?prefix=${encodeURIComponent(prefix)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to load reference sequence');
        if (requestId !== referenceSequenceRequestId.current) return;
        if (!force && !referenceNumberAutoRef.current) return;
        referenceNumberAutoRef.current = true;
        syncReferenceFields(
          prefix,
          formatReferenceNumberForLocale(json.nextNumber ?? 1, letterLocale),
        );
      } catch (error) {
        console.error('Failed to load reference sequence', error);
      }
    },
    [letterLocale, syncReferenceFields],
  );

  useEffect(() => {
    const prevLocale = prevLetterLocaleRef.current;
    const prevAutoDate = todayDisplay(prevLocale);
    const nextAutoDate = todayDisplay(letterLocale);

    const signatoryDefault = DEFAULT_SIGNATORY[letterLocale];
    const prevSignatoryDefault = DEFAULT_SIGNATORY[prevLocale];
    const filterText = (value: string) => filterLocaleText(value, letterLocale);
    const nextSignatory = (prev: string) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === prevSignatoryDefault) return signatoryDefault;
      return filterText(prev);
    };
    const nextPrefix = (prevPrefix: string) => {
      const coerced = coerceDocumentType(prevPrefix);
      if (coerced) return coerced;
      const normalized = normalizeReferencePrefix(prevPrefix);
      return normalized || defaultReferencePrefix();
    };
    const nextReferenceNo = (prevNumber: string) =>
      formatReferenceNumberForLocale(prevNumber, letterLocale);

    setFeesFields((prev) => ({
      ...prev,
      referencePrefix: nextPrefix(prev.referencePrefix),
      referenceNo: nextReferenceNo(prev.referenceNo),
      signatory: nextSignatory(prev.signatory),
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      schoolName: filterText(prev.schoolName),
      standard: filterText(prev.standard),
      studentName: filterText(prev.studentName),
    }));
    setSchoolAdmissionFields((prev) => ({
      ...prev,
      referencePrefix: nextPrefix(prev.referencePrefix),
      referenceNo: nextReferenceNo(prev.referenceNo),
      signatory: nextSignatory(prev.signatory),
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      schoolName: filterText(prev.schoolName),
      standard: filterText(prev.standard),
      studentName: filterText(prev.studentName),
      parentName: filterText(prev.parentName),
      reasonText: filterText(prev.reasonText),
    }));
    setSchoolTransferFields((prev) => ({
      ...prev,
      referencePrefix: nextPrefix(prev.referencePrefix),
      referenceNo: nextReferenceNo(prev.referenceNo),
      signatory: nextSignatory(prev.signatory),
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      schoolName: filterText(prev.schoolName),
      standard: filterText(prev.standard),
      studentName: filterText(prev.studentName),
      parentName: filterText(prev.parentName),
      previousSchoolName: filterText(prev.previousSchoolName),
      currentStandard: filterText(prev.currentStandard),
      transferReason: filterText(prev.transferReason),
    }));
    const nextFamilyMemberRows = familyMemberRowsRef.current.map((row) => ({
      name: filterText(row.name),
      age: normalizeFamilyMemberAge(row.age),
    }));
    setFamilyMemberRows(nextFamilyMemberRows);
    setRationFields((prev) => ({
      ...prev,
      referencePrefix: nextPrefix(prev.referencePrefix),
      referenceNo: nextReferenceNo(prev.referenceNo),
      signatory: nextSignatory(prev.signatory),
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
      fullName: filterText(prev.fullName),
      familyMembers: formatFamilyMembersString(nextFamilyMemberRows, letterLocale),
      fromRationOffice:
        getRationOfficeLabelById(
          addresses,
          addressSelections.fromRationOffice,
          letterLocale,
        ) ??
        (!addressSelections.fromRationOffice
          ? formatAddressMaster(manualAddressParts.fromRationOffice, letterLocale) ||
            (prev.fromRationOffice ? filterText(prev.fromRationOffice) : prev.fromRationOffice)
          : prev.fromRationOffice),
      toRationOffice:
        getRationOfficeLabelById(
          addresses,
          addressSelections.toRationOffice,
          letterLocale,
        ) ??
        (!addressSelections.toRationOffice
          ? formatAddressMaster(manualAddressParts.toRationOffice, letterLocale) ||
            (prev.toRationOffice ? filterText(prev.toRationOffice) : prev.toRationOffice)
          : prev.toRationOffice),
    }));
    setIncomeFields((prev) => ({
      ...prev,
      referencePrefix: nextPrefix(prev.referencePrefix),
      referenceNo: nextReferenceNo(prev.referenceNo),
      signatory: nextSignatory(prev.signatory),
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
      fullName: filterText(prev.fullName),
      aadhaarNo: normalizeAadhaarNo(prev.aadhaarNo),
      annualIncome: formatIndianAmount(prev.annualIncome, letterLocale),
    }));
    setDomicileFields((prev) => ({
      ...prev,
      referencePrefix: nextPrefix(prev.referencePrefix),
      referenceNo: nextReferenceNo(prev.referenceNo),
      signatory: nextSignatory(prev.signatory),
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      salutation: resolveSalutation(letterLocale, prev.gender),
      fullName: filterText(prev.fullName),
      aadhaarNo: normalizeAadhaarNo(prev.aadhaarNo),
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
        ? Boolean(parts.line1Mr.trim() || parts.line2Mr.trim() || parts.line3Mr.trim() || parts.cityMr.trim() || parts.stateMr.trim())
        : Boolean(parts.line1En.trim() || parts.line2En.trim() || parts.line3En.trim() || parts.cityEn.trim() || parts.stateEn.trim());
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
          [key]: sanitizeAddressPartsLocations(
            localizeAddressPartsDigits(
              mergeAddressParts(
                prev[key],
                parseFreeTextAddressForLocale(translated, targetLocale),
              ),
              targetLocale,
            ),
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
        case 'fromRationOffice':
          setRationFields((prev) => ({ ...prev, fromRationOffice: value }));
          break;
        case 'toRationOffice':
          setRationFields((prev) => ({ ...prev, toRationOffice: value }));
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
      [key]: getPincodeValidationError(parts, lt),
    }));
    setFieldErrors((prev) => ({ ...prev, [`${key}Address`]: undefined }));

    // From/To letter fields keep "name, address" when a master is selected.
    if (
      (key === 'fromRationOffice' && addressSelectionsRef.current.fromRationOffice) ||
      (key === 'toRationOffice' && addressSelectionsRef.current.toRationOffice)
    ) {
      triggerAutoTranslateManualAddressParts(key, parts);
      return;
    }

    const formatted = formatAddressMaster(parts, letterLocale);
    const value =
      key === 'rationOffice' ||
      key === 'fromRationOffice' ||
      key === 'toRationOffice'
        ? combineNameAndAddress(rationOfficeNamesRef.current[key], formatted)
        : formatted;
    applyManualAddressToLetterFields(key, value);
    // The beneficiary's (applicant's) address is not translated.
    if (key !== 'applicant') {
      triggerAutoTranslateManualAddressParts(key, parts);
    }
  };

  const handleRationOfficeNameChange = (
    key: 'rationOffice' | 'fromRationOffice' | 'toRationOffice',
    name: string,
  ) => {
    setRationOfficeNames((prev) => ({ ...prev, [key]: name }));
    rationOfficeNamesRef.current = { ...rationOfficeNamesRef.current, [key]: name };
    const addressText = formatAddressMaster(manualAddressParts[key], letterLocale);
    applyManualAddressToLetterFields(key, combineNameAndAddress(name, addressText));
    setFieldErrors((prev) => ({ ...prev, [`${key}Address`]: undefined }));
  };

  // Manual entry always starts blank — don't prefill from the previously
  // selected master address text.
  const seedManualAddressPartsFromText = (key: ManualAddressKey, _text: string) => {
    handleManualAddressPartsChange(key, createEmptyAddressParts());
  };

  const addressRowToParts = (address: AddressMasterRow): AddressMasterAddressParts => ({
    line1En: address.line1En,
    line1Mr: address.line1Mr,
    line2En: address.line2En,
    line2Mr: address.line2Mr,
    line3En: address.line3En,
    line3Mr: address.line3Mr,
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
    setFieldErrors((prev) => ({ ...prev, schoolAddress: undefined }));
    if (id) {
      const selected = addresses.find((a) => a.id === id);
      if (selected) {
        const schoolName = getAddressMasterName(selected, letterLocale);
        if (schoolName) {
          setFeesFields((prev) => ({ ...prev, schoolName }));
          setSchoolAdmissionFields((prev) => ({ ...prev, schoolName }));
          setSchoolTransferFields((prev) => ({ ...prev, schoolName }));
        }
      }
      const text = getAddressTextFromMaster(addresses, id, letterLocale);
      if (text) applySchoolAddressText(text);
      if (selected) {
        setManualAddressParts((prev) => ({ ...prev, school: addressRowToParts(selected) }));
      }
    } else {
      // Manual entry starts blank — don't carry over the previous name.
      setFeesFields((prev) => ({ ...prev, schoolName: '' }));
      setSchoolAdmissionFields((prev) => ({ ...prev, schoolName: '' }));
      setSchoolTransferFields((prev) => ({ ...prev, schoolName: '' }));
      seedManualAddressPartsFromText('school', seedText);
    }
  };

  const handleApplicantAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => ({ ...prev, applicant: id }));
    setFieldErrors((prev) => ({ ...prev, applicantAddress: undefined }));
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
    setAddressSelections((prev) => {
      const next = { ...prev, rationOffice: id };
      addressSelectionsRef.current = next;
      return next;
    });
    setFieldErrors((prev) => ({ ...prev, rationOfficeAddress: undefined }));
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
      // Manual entry starts blank — don't carry over the previous name.
      setRationOfficeNames((prev) => ({ ...prev, rationOffice: '' }));
      rationOfficeNamesRef.current = {
        ...rationOfficeNamesRef.current,
        rationOffice: '',
      };
      seedManualAddressPartsFromText('rationOffice', seedText);
    }
  };

  const handleFromRationOfficeAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => {
      const next = { ...prev, fromRationOffice: id };
      addressSelectionsRef.current = next;
      return next;
    });
    setFieldErrors((prev) => ({
      ...prev,
      fromRationOffice: undefined,
      fromRationOfficeAddress: undefined,
    }));
    if (id) {
      const selected = addresses.find((a) => a.id === id);
      if (selected) {
        const label = formatRationOfficeWithAddress(selected, letterLocale);
        if (label) {
          setRationFields((prev) => ({ ...prev, fromRationOffice: label }));
        }
        setManualAddressParts((prev) => ({
          ...prev,
          fromRationOffice: addressRowToParts(selected),
        }));
      }
    } else {
      // Manual entry starts blank — don't carry over the previous name.
      setRationOfficeNames((prev) => ({ ...prev, fromRationOffice: '' }));
      rationOfficeNamesRef.current = {
        ...rationOfficeNamesRef.current,
        fromRationOffice: '',
      };
      seedManualAddressPartsFromText('fromRationOffice', seedText);
    }
  };

  const handleToRationOfficeAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => {
      const next = { ...prev, toRationOffice: id };
      addressSelectionsRef.current = next;
      return next;
    });
    setFieldErrors((prev) => ({
      ...prev,
      toRationOffice: undefined,
      toRationOfficeAddress: undefined,
    }));
    if (id) {
      const selected = addresses.find((a) => a.id === id);
      if (selected) {
        const label = formatRationOfficeWithAddress(selected, letterLocale);
        if (label) {
          setRationFields((prev) => ({ ...prev, toRationOffice: label }));
        }
        setManualAddressParts((prev) => ({
          ...prev,
          toRationOffice: addressRowToParts(selected),
        }));
      }
    } else {
      // Manual entry starts blank — don't carry over the previous name.
      setRationOfficeNames((prev) => ({ ...prev, toRationOffice: '' }));
      rationOfficeNamesRef.current = {
        ...rationOfficeNamesRef.current,
        toRationOffice: '',
      };
      seedManualAddressPartsFromText('toRationOffice', seedText);
    }
  };

  const handleOfficeAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => ({ ...prev, office: id }));
    setFieldErrors((prev) => ({ ...prev, officeAddress: undefined }));
    if (id) {
      const text = getAddressTextFromMaster(addresses, id, letterLocale);
      if (text) {
        setIncomeFields((prev) => ({ ...prev, officeAddress: text }));
        setDomicileFields((prev) => ({ ...prev, officeAddress: text }));
      }
      const selected = addresses.find((a) => a.id === id);
      if (selected) {
        const officeName = getAddressMasterName(selected, letterLocale);
        if (officeName) {
          setIncomeFields((prev) => ({ ...prev, officeName }));
          setDomicileFields((prev) => ({ ...prev, officeName }));
          setFieldErrors((prev) => ({ ...prev, officeName: undefined }));
        }
        setManualAddressParts((prev) => ({ ...prev, office: addressRowToParts(selected) }));
      }
    } else {
      // Manual entry starts blank — don't carry over the previous name.
      setIncomeFields((prev) => ({ ...prev, officeName: '' }));
      setDomicileFields((prev) => ({ ...prev, officeName: '' }));
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

  const refreshDocumentTypes = async () => {
    try {
      const res = await fetch('/api/document-types');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch document types');
      setDocumentTypes((json?.documentTypes ?? []) as DocumentTypeMasterRow[]);
    } catch (error) {
      console.error('Failed to fetch document types', error);
      toast.error(t('letterGeneration.documentTypesMaster.fetchError'));
    }
  };

  const refreshAddressTypeLinks = async () => {
    try {
      const res = await fetch('/api/letter-address-links');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letter address links');
      setAddressTypeLinks((json?.links ?? []) as LetterAddressTypeLinkRow[]);
    } catch (error) {
      console.error('Failed to fetch letter address links', error);
      toast.error(t('letterGeneration.letterAddressLinks.fetchError'));
    }
  };

  const refreshSavedLetters = async () => {
    setSavedLettersLoading(true);
    try {
      const query = beneficiaryServiceId
        ? `/api/letters?limit=50&beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
        : '/api/letters?limit=50';
      const res = await fetch(query);
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
    void refreshDocumentTypes();
    void refreshAddressTypeLinks();
    // Preload reference numbers already present in the outward register so the
    // "Add to Outward Register" action stays disabled across reloads.
    void (async () => {
      try {
        const res = await fetch('/api/register?type=outward');
        if (!res.ok) return;
        const entries = (await res.json()) as Array<{ refNo?: string | null }>;
        const refs = new Set(
          entries
            .map((entry) => entry.refNo)
            .filter((ref): ref is string => Boolean(ref)),
        );
        if (refs.size > 0) setOutwardAddedReferenceNos(refs);
      } catch {
        // best-effort; in-session guard still applies
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Best-effort prefill from the linked beneficiary/voter. Only fills empty
  // fields, and only once on mount, so operator edits are never clobbered.
  const prefillAppliedRef = useRef(false);
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const name = (prefillName ?? '').trim();
    const address = (prefillAddress ?? '').trim();
    if (!name && !address) return;
    prefillAppliedRef.current = true;
    if (name) {
      setRationFields((p) => ({ ...p, fullName: p.fullName || name }));
      setIncomeFields((p) => ({ ...p, fullName: p.fullName || name }));
      setDomicileFields((p) => ({ ...p, fullName: p.fullName || name }));
    }
    if (address) {
      setSchoolAdmissionFields((p) => ({ ...p, address: p.address || address }));
      setSchoolTransferFields((p) => ({ ...p, address: p.address || address }));
      setRationFields((p) => ({ ...p, address: p.address || address }));
      setIncomeFields((p) => ({ ...p, address: p.address || address }));
      setDomicileFields((p) => ({ ...p, address: p.address || address }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillName, prefillAddress]);

  useEffect(() => {
    if (!addressSelections.school) return;
    if (addresses.length === 0) return;

    const selected = addresses.find((a) => a.id === addressSelections.school);
    if (!selected) return;
    const schoolName = getAddressMasterName(selected, letterLocale);
    if (!schoolName.trim()) return;

    setFeesFields((prev) => (prev.schoolName?.trim() ? prev : { ...prev, schoolName }));
    setSchoolAdmissionFields((prev) =>
      prev.schoolName?.trim() ? prev : { ...prev, schoolName },
    );
    setSchoolTransferFields((prev) =>
      prev.schoolName?.trim() ? prev : { ...prev, schoolName },
    );
  }, [addressSelections.school, addresses, letterLocale]);

  useEffect(() => {
    if (!addressSelections.office) return;
    if (addresses.length === 0) return;

    const selected = addresses.find((a) => a.id === addressSelections.office);
    if (!selected) return;
    const officeName = getAddressMasterName(selected, letterLocale);
    if (!officeName.trim()) return;

    setIncomeFields((prev) => (prev.officeName?.trim() ? prev : { ...prev, officeName }));
    setDomicileFields((prev) =>
      prev.officeName?.trim() ? prev : { ...prev, officeName },
    );
  }, [addressSelections.office, addresses, letterLocale]);

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
        null,
        'full',
        documentTypes,
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
    documentTypes,
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

  const activeReferencePrefix =
    coerceDocumentType(activeFields.referencePrefix) ??
    activeFields.referencePrefix;
  const activeReferenceNo = activeFields.referenceNo;
  const activeFullReferenceNo = formatReference(
    activeReferencePrefix,
    activeReferenceNo,
  );
  const activeDate = activeFields.date;

  useEffect(() => {
    const coercePrefix = <T extends { referencePrefix: string }>(prev: T): T => {
      const next = coerceDocumentType(prev.referencePrefix);
      if (!next || next === prev.referencePrefix) return prev;
      return { ...prev, referencePrefix: next };
    };
    setFeesFields(coercePrefix);
    setSchoolAdmissionFields(coercePrefix);
    setSchoolTransferFields(coercePrefix);
    setRationFields(coercePrefix);
    setIncomeFields(coercePrefix);
    setDomicileFields(coercePrefix);
  }, []);

  useEffect(() => {
    const prefix = normalizeReferencePrefix(activeReferencePrefix);
    if (!prefix) return;
    const timer = window.setTimeout(() => {
      void refreshReferenceSequence(prefix);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [activeReferencePrefix, refreshReferenceSequence, savedLetters.length]);

  const validateActiveLetterFields = () => {
    const requiredMsg = lt('letterGeneration.validation.fieldRequired');
    const errors = validateRequiredCommonFields(
      activeReferencePrefix,
      activeReferenceNo,
      activeDate,
      lt,
      existingReferenceNos,
    );

    const addressErrors: Partial<Record<ManualAddressKey, string>> = {};
    const requireAddress = (key: ManualAddressKey, addressText: string) => {
      if (
        isAddressProvided(
          addressSelections[key],
          manualAddressParts[key],
          letterLocale,
          addressText,
        )
      ) {
        if (!addressSelections[key] && hasAddressContent(manualAddressParts[key])) {
          const error = getManualAddressValidationError(
            manualAddressParts[key],
            letterLocale,
            lt,
          );
          if (error) {
            addressErrors[key] = error;
            errors[`${key}Address`] = error;
          }
        }
        return;
      }
      addressErrors[key] = lt('letterGeneration.addresses.fieldsRequired');
      errors[`${key}Address`] = lt('letterGeneration.addresses.fieldsRequired');
    };

    if (activeTab === 'fees') {
      requireField(errors, 'schoolName', feesFields.schoolName, requiredMsg);
      requireField(errors, 'standard', feesFields.standard, requiredMsg);
      requireField(errors, 'studentName', feesFields.studentName, requiredMsg);
      requireAddress('school', feesFields.schoolAddress);
    } else if (activeTab === 'school-admission') {
      requireField(errors, 'schoolName', schoolAdmissionFields.schoolName, requiredMsg);
      requireField(errors, 'standard', schoolAdmissionFields.standard, requiredMsg);
      requireField(errors, 'studentName', schoolAdmissionFields.studentName, requiredMsg);
      requireField(errors, 'parentName', schoolAdmissionFields.parentName, requiredMsg);
      requireAddress('school', schoolAdmissionFields.schoolAddress);
      requireAddress('applicant', schoolAdmissionFields.address);
    } else if (activeTab === 'school-transfer') {
      requireField(errors, 'schoolName', schoolTransferFields.schoolName, requiredMsg);
      requireField(errors, 'standard', schoolTransferFields.standard, requiredMsg);
      requireField(errors, 'studentName', schoolTransferFields.studentName, requiredMsg);
      requireField(errors, 'parentName', schoolTransferFields.parentName, requiredMsg);
      requireField(
        errors,
        'previousSchoolName',
        schoolTransferFields.previousSchoolName,
        requiredMsg,
      );
      requireField(
        errors,
        'currentStandard',
        schoolTransferFields.currentStandard,
        requiredMsg,
      );
      requireField(
        errors,
        'transferReason',
        schoolTransferFields.transferReason,
        requiredMsg,
      );
      requireAddress('school', schoolTransferFields.schoolAddress);
      requireAddress('applicant', schoolTransferFields.address);
    } else if (isRationLetterType(activeTab)) {
      requireField(errors, 'salutation', rationFields.salutation, requiredMsg);
      requireField(errors, 'fullName', rationFields.fullName, requiredMsg);
      requireField(errors, 'familyMembers', rationFields.familyMembers, requiredMsg);
      requireAddress('applicant', rationFields.address);
      requireAddress('rationOffice', rationFields.rationOfficeAddress);
      if (activeTab !== 'ration-new') {
        requireField(errors, 'rationCardNo', rationFields.rationCardNo, requiredMsg);
      }
      if (activeTab === 'ration-transfer') {
        requireAddress('fromRationOffice', rationFields.fromRationOffice ?? '');
        requireAddress('toRationOffice', rationFields.toRationOffice ?? '');
      }
    } else if (activeTab === 'income') {
      requireField(errors, 'salutation', incomeFields.salutation, requiredMsg);
      requireField(errors, 'fullName', incomeFields.fullName, requiredMsg);
      requireField(errors, 'aadhaarNo', incomeFields.aadhaarNo, requiredMsg);
      requireField(errors, 'annualIncome', incomeFields.annualIncome, requiredMsg);
      requireField(errors, 'officeName', incomeFields.officeName, requiredMsg);
      requireAddress('applicant', incomeFields.address);
      requireAddress('office', incomeFields.officeAddress);
    } else if (activeTab === 'domicile') {
      requireField(errors, 'salutation', domicileFields.salutation, requiredMsg);
      requireField(errors, 'fullName', domicileFields.fullName, requiredMsg);
      requireField(errors, 'aadhaarNo', domicileFields.aadhaarNo, requiredMsg);
      requireField(errors, 'officeName', domicileFields.officeName, requiredMsg);
      requireAddress('applicant', domicileFields.address);
      requireAddress('office', domicileFields.officeAddress);
    }

    setFieldErrors(errors);
    setAddressPincodeErrors(addressErrors);

    const firstError =
      Object.values(errors).find(Boolean) ?? Object.values(addressErrors).find(Boolean);
    if (firstError) {
      toast.error(firstError);
      return false;
    }
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
    if (!validateActiveLetterFields()) return;

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
            addressType: addressTypeForField('school'),
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

      // The beneficiary's (applicant's) address is intentionally not auto-saved
      // to Address Master or translated during letter generation.

      if (!addressSelections.rationOffice && isRationLetterType(activeTab)) {
        const rationOfficeText = rationFields.rationOfficeAddress ?? '';
        if (rationOfficeText.trim()) {
          const created = await createAddressMasterFromManualEntry({
            addressType: addressTypeForField('rationOffice'),
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

      if (activeTab === 'ration-transfer') {
        if (!addressSelections.fromRationOffice) {
          const fromText = rationFields.fromRationOffice ?? '';
          if (fromText.trim() && hasAddressContent(manualAddressParts.fromRationOffice)) {
            const created = await createAddressMasterFromManualEntry({
              addressType: addressTypeForField('fromRationOffice'),
              name: deriveAddressMasterName(fromText, 'Ration Office'),
              parts: manualAddressParts.fromRationOffice,
            });
            if (created?.id) {
              setAddresses((prev) =>
                prev.some((a) => a.id === created.id) ? prev : [created, ...prev],
              );
              setAddressSelections((prev) => ({ ...prev, fromRationOffice: created.id }));
            }
          }
        }

        if (!addressSelections.toRationOffice) {
          const toText = rationFields.toRationOffice ?? '';
          if (toText.trim() && hasAddressContent(manualAddressParts.toRationOffice)) {
            const created = await createAddressMasterFromManualEntry({
              addressType: addressTypeForField('toRationOffice'),
              name: deriveAddressMasterName(toText, 'Ration Office'),
              parts: manualAddressParts.toRationOffice,
            });
            if (created?.id) {
              setAddresses((prev) =>
                prev.some((a) => a.id === created.id) ? prev : [created, ...prev],
              );
              setAddressSelections((prev) => ({ ...prev, toRationOffice: created.id }));
            }
          }
        }
      }

      if (!addressSelections.office && (activeTab === 'income' || activeTab === 'domicile')) {
        const officeText =
          (activeTab === 'income' ? incomeFields.officeAddress : domicileFields.officeAddress) ??
          '';
        if (officeText.trim()) {
          const created = await createAddressMasterFromManualEntry({
            addressType: addressTypeForField('office'),
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
          referenceNo: activeFullReferenceNo,
          referencePrefix: activeReferencePrefix,
          autoSequence: referenceNumberAutoRef.current,
          title: activeTitle,
          fields: activeFields,
          renderedHtml: activeBody,
          paperSize: paperSizeDraft,
          beneficiaryServiceId: beneficiaryServiceId ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409 || json?.error === 'referenceNo already exists') {
          const duplicateMessage = t(
            'letterGeneration.validation.referenceNoDuplicate',
          );
          setFieldErrors((prev) => ({
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
      const savedRef = parseReference(String(json?.letter?.referenceNo ?? ''));
      if (savedRef.prefix && savedRef.number) {
        syncReferenceFields(
          savedRef.prefix,
          formatReferenceNumberForLocale(savedRef.number, letterLocale),
        );
      }
      referenceNumberAutoRef.current = true;
      await refreshReferenceSequence(
        savedRef.prefix || activeReferencePrefix,
        { force: true },
      );
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

  const handleDeleteSavedLetter = (id: string) => {
    setLetterToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteSavedLetter = async () => {
    if (!letterToDelete) return;
    const id = letterToDelete;
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
    } finally {
      setLetterToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const resolveSavedLetterPaperSize = (letter: SavedLetterRow): LetterPaperSize =>
    resolveLetterPaperSize(letter.paperSize, letter.letterType);

  const deriveOutwardRecipient = (letter: SavedLetterRow): string => {
    const fields = (letter.fields ?? {}) as Record<string, unknown>;
    const candidates = [
      fields.schoolName,
      fields.officeAddress,
      fields.rationOfficeAddress,
      fields.toRationOffice,
      fields.fullName,
      fields.parentName,
      fields.studentName,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    return letter.title;
  };

  // Deep-link into the outward register, pre-filtered to this letter's
  // reference number so the user lands on the matching entry.
  const buildOutwardEntryHref = (letter: SavedLetterRow): string => {
    const params = new URLSearchParams({ tab: 'outward' });
    if (letter.referenceNo) params.set('search', letter.referenceNo);
    return `/modules/io-register?${params.toString()}`;
  };

  // Push a saved letter into the outward register, reusing its reference number
  // and attaching the generated PDF so the letter travels with the entry.
  const handleAddLetterToOutward = async (letter: SavedLetterRow) => {
    if (outwardAddedReferenceNos.has(letter.referenceNo)) return;
    setAddingToOutwardLetterId(letter.id);
    let exportHost: HTMLDivElement | null = null;
    try {
      const parsed = parseReference(letter.referenceNo || '');
      const entryDate = new Date(letter.createdAt);
      const dateString = Number.isNaN(entryDate.getTime())
        ? new Date().toISOString().slice(0, 10)
        : entryDate.toISOString().slice(0, 10);

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'outward',
          documentType: parsed.prefix || undefined,
          date: dateString,
          fromTo: deriveOutwardRecipient(letter),
          subject: letter.title,
          refNo: letter.referenceNo,
          autoSequence: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Failed to add letter to outward register');
      }

      const entryId = json?.id;
      if (entryId) {
        const paperSize = resolveSavedLetterPaperSize(letter);
        exportHost = createLetterExportElement(letter.renderedHtml, {
          paperSize,
          letterLocale: letter.letterLocale,
        });
        document.body.appendChild(exportHost);
        const blob = await exportElementToPdf({
          element: exportHost,
          fileName: `${letter.title}-${letter.referenceNo || 'letter'}`,
          format: paperSize,
          orientation: 'portrait',
          marginMm: LETTER_PAPER_MARGIN_MM[paperSize],
          scale: 2,
          captureWidthPx: getLetterPaperContentWidthPx(paperSize),
          destination: 'blob',
          pageBackground: {
            headerHeightMm: getLetterheadContentPaddingMm(paperSize),
          },
        });
        exportHost.remove();
        exportHost = null;

        const safeName = `${letter.referenceNo || letter.title || 'letter'}`
          .replace(/[^\w.-]+/g, '_')
          .slice(0, 80);
        const formData = new FormData();
        formData.append(
          'file',
          new File([blob], `${safeName}.pdf`, { type: 'application/pdf' }),
        );
        // Best-effort attachment; the register entry is already created.
        await fetch(`/api/register/${entryId}/attachments`, {
          method: 'POST',
          body: formData,
        });
      }

      setOutwardAddedReferenceNos((prev) => {
        const next = new Set(prev);
        next.add(letter.referenceNo);
        return next;
      });
      toast.success(t('letterGeneration.savedLetters.addToOutwardSuccess'));
    } catch (error) {
      console.error('Add letter to outward failed', error);
      toast.error(t('letterGeneration.savedLetters.addToOutwardError'));
    } finally {
      exportHost?.remove();
      setAddingToOutwardLetterId(null);
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
        onClick={() => setSelectedSavedLetterId(letter.id)}
      >
        <Eye className="mr-2 size-4" />
        {t('letterGeneration.savedLetters.actions.preview')}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        onClick={() => void handleAddLetterToOutward(letter)}
        disabled={
          addingToOutwardLetterId === letter.id ||
          outwardAddedReferenceNos.has(letter.referenceNo)
        }
      >
        {addingToOutwardLetterId === letter.id ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Send className="mr-2 size-4" />
        )}
        {outwardAddedReferenceNos.has(letter.referenceNo)
          ? t('letterGeneration.savedLetters.actions.addedToOutward')
          : t('letterGeneration.savedLetters.actions.addToOutward')}
      </Button>
      {outwardAddedReferenceNos.has(letter.referenceNo) && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        >
          <Link href={buildOutwardEntryHref(letter)}>
            <ExternalLink className="mr-2 size-4" />
            {t('letterGeneration.savedLetters.actions.viewInOutward')}
          </Link>
        </Button>
      )}
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
        onClick={() => handleDeleteSavedLetter(letter.id)}
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
          label={lt('letterGeneration.fields.referencePrefix')}
          required
          error={fieldErrors.referencePrefix}
        >
          <Select
            value={
              coerceDocumentType(fields.referencePrefix) ??
              (fields.referencePrefix || defaultReferencePrefix())
            }
            onValueChange={(value) => {
              const nextPrefix = value as DocumentType;
              referenceNumberAutoRef.current = true;
              syncReferenceFields(nextPrefix, fields.referenceNo);
              if (fieldErrors.referencePrefix || fieldErrors.referenceNo) {
                setFieldErrors((prev) => ({
                  ...prev,
                  referencePrefix: undefined,
                  referenceNo: undefined,
                }));
              }
            }}
          >
            <SelectTrigger
              aria-invalid={!!fieldErrors.referencePrefix}
              aria-required
            >
              <SelectValue
                placeholder={lt('letterGeneration.placeholders.referencePrefix')}
              />
            </SelectTrigger>
            <SelectContent>
              {(documentTypes.length > 0
                ? documentTypes.map((docType) => docType.code)
                : [...DOCUMENT_TYPES]
              ).map((docType) => (
                <SelectItem key={docType} value={docType}>
                  {documentTypeLabel(docType, letterLocale, documentTypes)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldGroup>
        <FieldGroup
          label={lt('letterGeneration.fields.referenceNo')}
          required
          error={fieldErrors.referenceNo}
        >
          <Input
            value={fields.referenceNo}
            onChange={(e) => {
              const nextNumber = formatReferenceNumberForLocale(
                e.target.value,
                letterLocale,
              );
              referenceNumberAutoRef.current = false;
              syncReferenceFields(fields.referencePrefix, nextNumber);
              if (fieldErrors.referenceNo) {
                setFieldErrors((prev) => ({ ...prev, referenceNo: undefined }));
              }
            }}
            placeholder={lt('letterGeneration.placeholders.referenceNo')}
            required
            inputMode="numeric"
            lang={letterLocale === 'mr' ? 'mr' : 'en'}
            aria-invalid={!!fieldErrors.referenceNo}
          />
        </FieldGroup>
        <FieldGroup
          label={lt('letterGeneration.fields.date')}
          required
          error={fieldErrors.date}
        >
          <LetterDatePicker
            locale={letterLocale}
            value={fields.date}
            onValueChange={(next) => {
              setFields({ ...fields, date: next });
              if (fieldErrors.date) {
                setFieldErrors((prev) => ({ ...prev, date: undefined }));
              }
            }}
            placeholder={lt('letterGeneration.placeholders.date')}
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
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link
                href={
                  beneficiaryServiceId
                    ? `/modules/letter-generation/document-types?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
                    : '/modules/letter-generation/document-types'
                }
              >
                <FileType className="mr-2 size-4" />
                {t('letterGeneration.documentTypesMaster.manageLink')}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                href={
                  beneficiaryServiceId
                    ? `/modules/letter-generation/addresses?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
                    : '/modules/letter-generation/addresses'
                }
              >
                <MapPin className="mr-2 size-4" />
                {t('letterGeneration.addresses.manageLink')}
              </Link>
            </Button>
          </div>
        }
      />

      {service ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <CardTitle className="text-base">
                  {t('letterGeneration.serviceInfo.title')}
                </CardTitle>
                <CardDescription>
                  {t('letterGeneration.serviceInfo.description')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href="/modules/operator?tab=manage">
                  <ArrowLeft className="mr-2 size-4" />
                  {t('letterGeneration.backToBeneficiary')}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {prefillName ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('letterGeneration.serviceInfo.beneficiaryName')}
                  </dt>
                  <dd className="text-sm font-medium">{prefillName}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('letterGeneration.serviceInfo.serviceName')}
                </dt>
                <dd className="text-sm font-medium">{service.serviceName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('letterGeneration.serviceInfo.serviceType')}
                </dt>
                <dd className="text-sm font-medium">
                  {t(`letterGeneration.serviceInfo.types.${service.serviceType}`)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('letterGeneration.serviceInfo.token')}
                </dt>
                <dd className="text-sm font-medium">{service.token}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('letterGeneration.serviceInfo.status')}
                </dt>
                <dd className="text-sm font-medium">
                  {t(`letterGeneration.serviceInfo.statuses.${service.status}`)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('letterGeneration.serviceInfo.priority')}
                </dt>
                <dd className="text-sm font-medium">
                  {t(`letterGeneration.serviceInfo.priorities.${service.priority}`)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('letterGeneration.serviceInfo.createdAt')}
                </dt>
                <dd className="text-sm font-medium">
                  {new Date(service.createdAt).toLocaleDateString(
                    locale === 'mr' ? 'mr-IN' : 'en-IN',
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  )}
                </dd>
              </div>
              {service.description ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('letterGeneration.serviceInfo.notes')}
                  </dt>
                  <dd className="text-sm">{service.description}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      ) : null}

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
                <FieldGroup label={lt('letterGeneration.fields.letterType')}>
                  <Select
                    value={activeTab}
                    onValueChange={(value: LetterType) => setActiveTab(value)}
                  >
                    <SelectTrigger className="[&>span]:text-left">
                      <SelectValue
                        placeholder={lt('letterGeneration.placeholders.letterType')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {LETTER_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {lt(`letterGeneration.tabs.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label={lt('letterGeneration.fields.letterLanguage')}>
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
                          {lt(`letterGeneration.letterLanguage.${lang}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup label={lt('letterGeneration.fields.paperSize')}>
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
                          {lt(`letterGeneration.paperSize.options.${size}`)}
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
                      <LetterAddressField
                        label={letterLocale === 'mr' ? 'संस्था पत्ता' : 'Institute Address'}
                        addressType={addressTypeForField('school')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.school}
                        addresses={addresses}
                        addressParts={manualAddressParts.school}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('school', parts)
                        }
                        pincodeError={addressPincodeErrors.school}
                        error={fieldErrors.schoolAddress}
                        required
                        nameLabel={letterLocale === 'mr' ? 'संस्था नाव' : 'Institute Name'}
                        namePlaceholder={
                          letterLocale === 'mr'
                            ? 'संस्था नाव टाइप करा'
                            : 'Type institute name'
                        }
                        nameValue={feesFields.schoolName}
                        nameRequired
                        nameError={fieldErrors.schoolName}
                        onNameChange={(value) => {
                          setFeesFields((prev) => ({ ...prev, schoolName: value }));
                          if (fieldErrors.schoolName) {
                            setFieldErrors((prev) => ({ ...prev, schoolName: undefined }));
                          }
                        }}
                        onSelectedAddressIdChange={(id) =>
                          handleSchoolAddressSelect(id, feesFields.schoolAddress)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup
                          label={lt('letterGeneration.fields.standard')}
                          required
                          error={fieldErrors.standard}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={feesFields.standard}
                            onValueChange={(standard) => {
                              setFeesFields({ ...feesFields, standard });
                              if (fieldErrors.standard) {
                                setFieldErrors((prev) => ({ ...prev, standard: undefined }));
                              }
                            }}
                            placeholder={lt('letterGeneration.placeholders.standard')}
                            required
                          />
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.studentName')}
                          required
                          error={fieldErrors.studentName}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={feesFields.studentName}
                            onValueChange={(studentName) => {
                              setFeesFields({ ...feesFields, studentName });
                              if (fieldErrors.studentName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  studentName: undefined,
                                }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                      </div>
                    </TabsContent>

                    <TabsContent value="school-admission" className="mt-0 space-y-4">
                      {renderCommonFields(schoolAdmissionFields, setSchoolAdmissionFields)}
                      <LetterAddressField
                        label={letterLocale === 'mr' ? 'संस्था पत्ता' : 'Institute Address'}
                        addressType={addressTypeForField('school')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.school}
                        addresses={addresses}
                        addressParts={manualAddressParts.school}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('school', parts)
                        }
                        pincodeError={addressPincodeErrors.school}
                        error={fieldErrors.schoolAddress}
                        required
                        nameLabel={letterLocale === 'mr' ? 'संस्था नाव' : 'Institute Name'}
                        namePlaceholder={
                          letterLocale === 'mr'
                            ? 'संस्था नाव टाइप करा'
                            : 'Type institute name'
                        }
                        nameValue={schoolAdmissionFields.schoolName}
                        nameRequired
                        nameError={fieldErrors.schoolName}
                        onNameChange={(value) => {
                          setSchoolAdmissionFields((prev) => ({
                            ...prev,
                            schoolName: value,
                          }));
                          if (fieldErrors.schoolName) {
                            setFieldErrors((prev) => ({ ...prev, schoolName: undefined }));
                          }
                        }}
                        onSelectedAddressIdChange={(id) =>
                          handleSchoolAddressSelect(id, schoolAdmissionFields.schoolAddress)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup
                          label={lt('letterGeneration.fields.standard')}
                          required
                          error={fieldErrors.standard}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={schoolAdmissionFields.standard}
                            onValueChange={(standard) => {
                              setSchoolAdmissionFields({
                                ...schoolAdmissionFields,
                                standard,
                              });
                              if (fieldErrors.standard) {
                                setFieldErrors((prev) => ({ ...prev, standard: undefined }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.studentName')}
                          required
                          error={fieldErrors.studentName}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={schoolAdmissionFields.studentName}
                            onValueChange={(studentName) => {
                              setSchoolAdmissionFields({
                                ...schoolAdmissionFields,
                                studentName,
                              });
                              if (fieldErrors.studentName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  studentName: undefined,
                                }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup
                        label={lt('letterGeneration.fields.parentName')}
                        required
                        error={fieldErrors.parentName}
                      >
                        <LocaleTextInput
                          locale={letterLocale}
                          value={schoolAdmissionFields.parentName}
                          onValueChange={(parentName) => {
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              parentName,
                            });
                            if (fieldErrors.parentName) {
                              setFieldErrors((prev) => ({ ...prev, parentName: undefined }));
                            }
                          }}
                          required
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={lt('letterGeneration.fields.address')}
                        addressType={addressTypeForField('applicant')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.applicant}
                        addresses={addresses}
                        addressParts={manualAddressParts.applicant}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('applicant', parts)
                        }
                        pincodeError={addressPincodeErrors.applicant}
                        error={fieldErrors.applicantAddress}
                        required
                        onSelectedAddressIdChange={(id) =>
                          handleApplicantAddressSelect(id, schoolAdmissionFields.address)
                        }
                      />
                      <FieldGroup
                        label={lt('letterGeneration.fields.reasonText')}
                        error={fieldErrors.reasonText}
                      >
                        <LocaleTextarea
                          locale={letterLocale}
                          value={schoolAdmissionFields.reasonText}
                          onValueChange={(reasonText) => {
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              reasonText,
                            });
                            if (fieldErrors.reasonText) {
                              setFieldErrors((prev) => ({ ...prev, reasonText: undefined }));
                            }
                          }}
                          rows={3}
                        />
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="school-transfer" className="mt-0 space-y-4">
                      {renderCommonFields(schoolTransferFields, setSchoolTransferFields)}
                      <LetterAddressField
                        label={letterLocale === 'mr' ? 'संस्था पत्ता' : 'Institute Address'}
                        addressType={addressTypeForField('school')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.school}
                        addresses={addresses}
                        addressParts={manualAddressParts.school}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('school', parts)
                        }
                        pincodeError={addressPincodeErrors.school}
                        error={fieldErrors.schoolAddress}
                        required
                        nameLabel={letterLocale === 'mr' ? 'संस्था नाव' : 'Institute Name'}
                        namePlaceholder={
                          letterLocale === 'mr'
                            ? 'संस्था नाव टाइप करा'
                            : 'Type institute name'
                        }
                        nameValue={schoolTransferFields.schoolName}
                        nameRequired
                        nameError={fieldErrors.schoolName}
                        onNameChange={(value) => {
                          setSchoolTransferFields((prev) => ({
                            ...prev,
                            schoolName: value,
                          }));
                          if (fieldErrors.schoolName) {
                            setFieldErrors((prev) => ({ ...prev, schoolName: undefined }));
                          }
                        }}
                        onSelectedAddressIdChange={(id) =>
                          handleSchoolAddressSelect(id, schoolTransferFields.schoolAddress)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup
                          label={lt('letterGeneration.fields.standard')}
                          required
                          error={fieldErrors.standard}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={schoolTransferFields.standard}
                            onValueChange={(standard) => {
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                standard,
                              });
                              if (fieldErrors.standard) {
                                setFieldErrors((prev) => ({ ...prev, standard: undefined }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.studentName')}
                          required
                          error={fieldErrors.studentName}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={schoolTransferFields.studentName}
                            onValueChange={(studentName) => {
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                studentName,
                              });
                              if (fieldErrors.studentName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  studentName: undefined,
                                }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup
                        label={lt('letterGeneration.fields.parentName')}
                        required
                        error={fieldErrors.parentName}
                      >
                        <LocaleTextInput
                          locale={letterLocale}
                          value={schoolTransferFields.parentName}
                          onValueChange={(parentName) => {
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              parentName,
                            });
                            if (fieldErrors.parentName) {
                              setFieldErrors((prev) => ({ ...prev, parentName: undefined }));
                            }
                          }}
                          required
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={lt('letterGeneration.fields.address')}
                        addressType={addressTypeForField('applicant')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.applicant}
                        addresses={addresses}
                        addressParts={manualAddressParts.applicant}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('applicant', parts)
                        }
                        pincodeError={addressPincodeErrors.applicant}
                        error={fieldErrors.applicantAddress}
                        required
                        onSelectedAddressIdChange={(id) =>
                          handleApplicantAddressSelect(id, schoolTransferFields.address)
                        }
                      />
                      <FieldGroup
                        label={lt('letterGeneration.fields.previousSchoolName')}
                        required
                        error={fieldErrors.previousSchoolName}
                      >
                        <LocaleTextInput
                          locale={letterLocale}
                          value={schoolTransferFields.previousSchoolName}
                          onValueChange={(previousSchoolName) => {
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              previousSchoolName,
                            });
                            if (fieldErrors.previousSchoolName) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                previousSchoolName: undefined,
                              }));
                            }
                          }}
                          required
                        />
                      </FieldGroup>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup
                          label={lt('letterGeneration.fields.currentStandard')}
                          required
                          error={fieldErrors.currentStandard}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={schoolTransferFields.currentStandard}
                            onValueChange={(currentStandard) => {
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                currentStandard,
                              });
                              if (fieldErrors.currentStandard) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  currentStandard: undefined,
                                }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.transferReason')}
                          required
                          error={fieldErrors.transferReason}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={schoolTransferFields.transferReason}
                            onValueChange={(transferReason) => {
                              setSchoolTransferFields({
                                ...schoolTransferFields,
                                transferReason,
                              });
                              if (fieldErrors.transferReason) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  transferReason: undefined,
                                }));
                              }
                            }}
                            required
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
                          <FieldGroup label={lt('letterGeneration.fields.gender')} required>
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
                                  {lt('letterGeneration.gender.male')}
                                </SelectItem>
                                <SelectItem value="female">
                                  {lt('letterGeneration.gender.female')}
                                </SelectItem>
                                <SelectItem value="other">
                                  {lt('letterGeneration.gender.other')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FieldGroup>
                          <FieldGroup
                            label={lt('letterGeneration.fields.salutation')}
                            required
                            error={fieldErrors.salutation}
                          >
                            <LocaleTextInput
                              locale={letterLocale}
                              value={rationFields.salutation}
                              onValueChange={(salutation) => {
                                setRationFields({ ...rationFields, salutation });
                                if (fieldErrors.salutation) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    salutation: undefined,
                                  }));
                                }
                              }}
                              required
                            />
                          </FieldGroup>
                          <FieldGroup
                            label={lt('letterGeneration.fields.fullName')}
                            required
                            error={fieldErrors.fullName}
                          >
                            <LocaleTextInput
                              locale={letterLocale}
                              value={rationFields.fullName}
                              onValueChange={(fullName) => {
                                setRationFields({ ...rationFields, fullName });
                                if (fieldErrors.fullName) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    fullName: undefined,
                                  }));
                                }
                              }}
                              required
                            />
                          </FieldGroup>
                        </div>
                        <LetterAddressField
                          label={lt('letterGeneration.fields.address')}
                          addressType={addressTypeForField('applicant')}
                          locale={letterLocale}
                          selectedAddressId={addressSelections.applicant}
                          addresses={addresses}
                          addressParts={manualAddressParts.applicant}
                          onAddressPartsChange={(parts) =>
                            handleManualAddressPartsChange('applicant', parts)
                          }
                          pincodeError={addressPincodeErrors.applicant}
                          error={fieldErrors.applicantAddress}
                          required
                          onSelectedAddressIdChange={(id) =>
                            handleApplicantAddressSelect(id, rationFields.address)
                          }
                        />
                        {rationType !== 'ration-new' ? (
                          <FieldGroup
                            label={lt('letterGeneration.fields.rationCardNo')}
                            required
                            error={fieldErrors.rationCardNo}
                          >
                            <Input
                              value={rationFields.rationCardNo ?? ''}
                              onChange={(e) => {
                                setRationFields({
                                  ...rationFields,
                                  rationCardNo: e.target.value,
                                });
                                if (fieldErrors.rationCardNo) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    rationCardNo: undefined,
                                  }));
                                }
                              }}
                              required
                            />
                          </FieldGroup>
                        ) : null}
                        {rationType === 'ration-transfer' ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            <LetterAddressField
                              label={lt('letterGeneration.fields.fromRationOffice')}
                              addressType={addressTypeForField('fromRationOffice')}
                              locale={letterLocale}
                              selectedAddressId={addressSelections.fromRationOffice}
                              addresses={addresses}
                              addressParts={manualAddressParts.fromRationOffice}
                              onAddressPartsChange={(parts) =>
                                handleManualAddressPartsChange('fromRationOffice', parts)
                              }
                              pincodeError={addressPincodeErrors.fromRationOffice}
                              error={
                                fieldErrors.fromRationOfficeAddress ??
                                fieldErrors.fromRationOffice
                              }
                              required
                              nameLabel={
                                letterLocale === 'mr'
                                  ? 'शिधावाटप कार्यालयाचे नाव'
                                  : 'Ration Office Name'
                              }
                              namePlaceholder={
                                letterLocale === 'mr'
                                  ? 'शिधावाटप कार्यालयाचे नाव टाइप करा'
                                  : 'Type ration office name'
                              }
                              nameValue={rationOfficeNames.fromRationOffice}
                              onNameChange={(value) =>
                                handleRationOfficeNameChange('fromRationOffice', value)
                              }
                              onSelectedAddressIdChange={(id) =>
                                handleFromRationOfficeAddressSelect(
                                  id,
                                  rationFields.fromRationOffice,
                                )
                              }
                            />
                            <LetterAddressField
                              label={lt('letterGeneration.fields.toRationOffice')}
                              addressType={addressTypeForField('toRationOffice')}
                              locale={letterLocale}
                              selectedAddressId={addressSelections.toRationOffice}
                              addresses={addresses}
                              addressParts={manualAddressParts.toRationOffice}
                              onAddressPartsChange={(parts) =>
                                handleManualAddressPartsChange('toRationOffice', parts)
                              }
                              pincodeError={addressPincodeErrors.toRationOffice}
                              error={
                                fieldErrors.toRationOfficeAddress ??
                                fieldErrors.toRationOffice
                              }
                              required
                              nameLabel={
                                letterLocale === 'mr'
                                  ? 'शिधावाटप कार्यालयाचे नाव'
                                  : 'Ration Office Name'
                              }
                              namePlaceholder={
                                letterLocale === 'mr'
                                  ? 'शिधावाटप कार्यालयाचे नाव टाइप करा'
                                  : 'Type ration office name'
                              }
                              nameValue={rationOfficeNames.toRationOffice}
                              onNameChange={(value) =>
                                handleRationOfficeNameChange('toRationOffice', value)
                              }
                              onSelectedAddressIdChange={(id) =>
                                handleToRationOfficeAddressSelect(
                                  id,
                                  rationFields.toRationOffice,
                                )
                              }
                            />
                          </div>
                        ) : null}
                        <FieldGroup
                          label={lt('letterGeneration.fields.familyMembers')}
                          required
                          error={fieldErrors.familyMembers}
                        >
                          <div className="space-y-2">
                            {familyMemberRows.map((member, index) => (
                              <div
                                key={`family-member-${index}`}
                                className="flex flex-col gap-2 sm:flex-row sm:items-start"
                              >
                                <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_7rem]">
                                  <LocaleTextInput
                                    locale={letterLocale}
                                    value={member.name}
                                    onValueChange={(name) => {
                                      const next = familyMemberRows.map((row, i) =>
                                        i === index ? { ...row, name } : row,
                                      );
                                      updateFamilyMemberRows(next);
                                    }}
                                    placeholder={lt(
                                      'letterGeneration.placeholders.familyMemberName',
                                    )}
                                    aria-label={lt(
                                      'letterGeneration.fields.familyMemberName',
                                    )}
                                    required={index === 0}
                                  />
                                  <Input
                                    value={
                                      member.age
                                        ? toLocaleDigits(member.age, letterLocale)
                                        : ''
                                    }
                                    onChange={(e) => {
                                      const age = normalizeFamilyMemberAge(e.target.value);
                                      const next = familyMemberRows.map((row, i) =>
                                        i === index ? { ...row, age } : row,
                                      );
                                      updateFamilyMemberRows(next);
                                    }}
                                    inputMode="numeric"
                                    placeholder={lt(
                                      'letterGeneration.placeholders.familyMemberAge',
                                    )}
                                    aria-label={lt(
                                      'letterGeneration.fields.familyMemberAge',
                                    )}
                                    required={index === 0}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 text-muted-foreground hover:text-destructive"
                                  disabled={familyMemberRows.length === 1}
                                  onClick={() => {
                                    updateFamilyMemberRows(
                                      familyMemberRows.filter((_, i) => i !== index),
                                    );
                                  }}
                                  aria-label={lt(
                                    'letterGeneration.fields.removeFamilyMember',
                                  )}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                updateFamilyMemberRows([
                                  ...familyMemberRows,
                                  emptyFamilyMemberRow(),
                                ]);
                              }}
                            >
                              <Plus className="mr-1.5 size-4" />
                              {lt('letterGeneration.fields.addFamilyMember')}
                            </Button>
                          </div>
                        </FieldGroup>
                        <LetterAddressField
                          label={lt('letterGeneration.fields.rationOfficeAddress')}
                          addressType={addressTypeForField('rationOffice')}
                          locale={letterLocale}
                          selectedAddressId={addressSelections.rationOffice}
                          addresses={addresses}
                          addressParts={manualAddressParts.rationOffice}
                          onAddressPartsChange={(parts) =>
                            handleManualAddressPartsChange('rationOffice', parts)
                          }
                          pincodeError={addressPincodeErrors.rationOffice}
                          error={fieldErrors.rationOfficeAddress}
                          required
                          nameLabel={
                            letterLocale === 'mr'
                              ? 'शिधावाटप कार्यालयाचे नाव'
                              : 'Ration Office Name'
                          }
                          namePlaceholder={
                            letterLocale === 'mr'
                              ? 'शिधावाटप कार्यालयाचे नाव टाइप करा'
                              : 'Type ration office name'
                          }
                          nameValue={rationOfficeNames.rationOffice}
                          onNameChange={(value) =>
                            handleRationOfficeNameChange('rationOffice', value)
                          }
                          onSelectedAddressIdChange={(id) =>
                            handleRationOfficeAddressSelect(id, rationFields.rationOfficeAddress)
                          }
                        />
                      </TabsContent>
                    ))}

                    <TabsContent value="income" className="mt-0 space-y-4">
                      {renderCommonFields(incomeFields, setIncomeFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={lt('letterGeneration.fields.gender')} required>
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
                                {lt('letterGeneration.gender.male')}
                              </SelectItem>
                              <SelectItem value="female">
                                {lt('letterGeneration.gender.female')}
                              </SelectItem>
                              <SelectItem value="other">
                                {lt('letterGeneration.gender.other')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.salutation')}
                          required
                          error={fieldErrors.salutation}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={incomeFields.salutation}
                            onValueChange={(salutation) => {
                              setIncomeFields({ ...incomeFields, salutation });
                              if (fieldErrors.salutation) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  salutation: undefined,
                                }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.fullName')}
                          required
                          error={fieldErrors.fullName}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={incomeFields.fullName}
                            onValueChange={(fullName) => {
                              setIncomeFields({ ...incomeFields, fullName });
                              if (fieldErrors.fullName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  fullName: undefined,
                                }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                      </div>
                      <LetterAddressField
                        label={lt('letterGeneration.fields.address')}
                        addressType={addressTypeForField('applicant')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.applicant}
                        addresses={addresses}
                        addressParts={manualAddressParts.applicant}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('applicant', parts)
                        }
                        pincodeError={addressPincodeErrors.applicant}
                        error={fieldErrors.applicantAddress}
                        required
                        onSelectedAddressIdChange={(id) =>
                          handleApplicantAddressSelect(id, incomeFields.address)
                        }
                      />
                      <LetterAddressField
                        label={lt('letterGeneration.fields.officeAddress')}
                        addressType={addressTypeForField('office')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.office}
                        addresses={addresses}
                        addressParts={manualAddressParts.office}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('office', parts)
                        }
                        pincodeError={addressPincodeErrors.office}
                        error={fieldErrors.officeAddress}
                        required
                        nameLabel={letterLocale === 'mr' ? 'कार्यालय नाव' : 'Office Name'}
                        namePlaceholder={
                          letterLocale === 'mr'
                            ? 'कार्यालय नाव टाइप करा'
                            : 'Type office name'
                        }
                        nameValue={incomeFields.officeName}
                        nameRequired
                        nameError={fieldErrors.officeName}
                        onNameChange={(value) => {
                          setIncomeFields((prev) => ({ ...prev, officeName: value }));
                          if (fieldErrors.officeName) {
                            setFieldErrors((prev) => ({ ...prev, officeName: undefined }));
                          }
                        }}
                        onSelectedAddressIdChange={(id) =>
                          handleOfficeAddressSelect(id, incomeFields.officeAddress)
                        }
                      />
                      <FieldGroup
                        label={lt('letterGeneration.fields.aadhaarNo')}
                        required
                        error={fieldErrors.aadhaarNo}
                      >
                        <Input
                          value={
                            incomeFields.aadhaarNo
                              ? toLocaleDigits(incomeFields.aadhaarNo, letterLocale)
                              : ''
                          }
                          onChange={(e) => {
                            setIncomeFields({
                              ...incomeFields,
                              aadhaarNo: normalizeAadhaarNo(e.target.value),
                            });
                            if (fieldErrors.aadhaarNo) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                aadhaarNo: undefined,
                              }));
                            }
                          }}
                          inputMode="numeric"
                          required
                        />
                      </FieldGroup>
                      <FieldGroup
                        label={lt('letterGeneration.fields.annualIncome')}
                        required
                        error={fieldErrors.annualIncome}
                      >
                        <Input
                          value={incomeFields.annualIncome}
                          onChange={(e) => {
                            setIncomeFields({
                              ...incomeFields,
                              annualIncome: formatIndianAmount(
                                e.target.value,
                                letterLocale,
                              ),
                            });
                            if (fieldErrors.annualIncome) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                annualIncome: undefined,
                              }));
                            }
                          }}
                          inputMode="numeric"
                          placeholder={lt('letterGeneration.placeholders.income')}
                          required
                        />
                      </FieldGroup>
                    </TabsContent>

                    <TabsContent value="domicile" className="mt-0 space-y-4">
                      {renderCommonFields(domicileFields, setDomicileFields)}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup label={lt('letterGeneration.fields.gender')} required>
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
                                {lt('letterGeneration.gender.male')}
                              </SelectItem>
                              <SelectItem value="female">
                                {lt('letterGeneration.gender.female')}
                              </SelectItem>
                              <SelectItem value="other">
                                {lt('letterGeneration.gender.other')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.salutation')}
                          required
                          error={fieldErrors.salutation}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={domicileFields.salutation}
                            onValueChange={(salutation) => {
                              setDomicileFields({ ...domicileFields, salutation });
                              if (fieldErrors.salutation) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  salutation: undefined,
                                }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.fullName')}
                          required
                          error={fieldErrors.fullName}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={domicileFields.fullName}
                            onValueChange={(fullName) => {
                              setDomicileFields({ ...domicileFields, fullName });
                              if (fieldErrors.fullName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  fullName: undefined,
                                }));
                              }
                            }}
                            required
                          />
                        </FieldGroup>
                      </div>
                      <LetterAddressField
                        label={lt('letterGeneration.fields.address')}
                        addressType={addressTypeForField('applicant')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.applicant}
                        addresses={addresses}
                        addressParts={manualAddressParts.applicant}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('applicant', parts)
                        }
                        pincodeError={addressPincodeErrors.applicant}
                        error={fieldErrors.applicantAddress}
                        required
                        onSelectedAddressIdChange={(id) =>
                          handleApplicantAddressSelect(id, domicileFields.address)
                        }
                      />
                      <LetterAddressField
                        label={lt('letterGeneration.fields.officeAddress')}
                        addressType={addressTypeForField('office')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.office}
                        addresses={addresses}
                        addressParts={manualAddressParts.office}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('office', parts)
                        }
                        pincodeError={addressPincodeErrors.office}
                        error={fieldErrors.officeAddress}
                        required
                        nameLabel={letterLocale === 'mr' ? 'कार्यालय नाव' : 'Office Name'}
                        namePlaceholder={
                          letterLocale === 'mr'
                            ? 'कार्यालय नाव टाइप करा'
                            : 'Type office name'
                        }
                        nameValue={domicileFields.officeName}
                        nameRequired
                        nameError={fieldErrors.officeName}
                        onNameChange={(value) => {
                          setDomicileFields((prev) => ({ ...prev, officeName: value }));
                          if (fieldErrors.officeName) {
                            setFieldErrors((prev) => ({ ...prev, officeName: undefined }));
                          }
                        }}
                        onSelectedAddressIdChange={(id) =>
                          handleOfficeAddressSelect(id, domicileFields.officeAddress)
                        }
                      />
                      <FieldGroup
                        label={lt('letterGeneration.fields.aadhaarNo')}
                        required
                        error={fieldErrors.aadhaarNo}
                      >
                        <Input
                          value={
                            domicileFields.aadhaarNo
                              ? toLocaleDigits(domicileFields.aadhaarNo, letterLocale)
                              : ''
                          }
                          onChange={(e) => {
                            setDomicileFields({
                              ...domicileFields,
                              aadhaarNo: normalizeAadhaarNo(e.target.value),
                            });
                            if (fieldErrors.aadhaarNo) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                aadhaarNo: undefined,
                              }));
                            }
                          }}
                          inputMode="numeric"
                          required
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

      {isAdmin ? (
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
                onClick={() => {
                  setTemplateDraft(getDefaultTemplateHtml(activeTab, letterLocale));
                  setTemplateNameDraft(
                    activeLetterMaster?.name?.trim() ||
                      t(`letterGeneration.tabs.${activeTab}`),
                  );
                  toast.success(t('letterGeneration.templates.restoreDefaultSuccess'));
                }}
              >
                {t('letterGeneration.templates.restoreDefault')}
              </Button>
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
      ) : null}
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
                              {letter.referenceNo
                                ? formatReferenceForDisplay(letter.referenceNo, locale)
                                : '—'}
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
                              {letter.referenceNo
                                ? formatReferenceForDisplay(letter.referenceNo, locale)
                                : '—'}
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
                                    ? `- ${formatReferenceForDisplay(selectedSavedLetter.referenceNo, locale)}`
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
                                  onClick={() =>
                                    void handleAddLetterToOutward(selectedSavedLetter)
                                  }
                                  disabled={
                                    addingToOutwardLetterId === selectedSavedLetter.id ||
                                    outwardAddedReferenceNos.has(
                                      selectedSavedLetter.referenceNo,
                                    )
                                  }
                                >
                                  {addingToOutwardLetterId === selectedSavedLetter.id ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                  ) : (
                                    <Send className="mr-2 size-4" />
                                  )}
                                  {outwardAddedReferenceNos.has(
                                    selectedSavedLetter.referenceNo,
                                  )
                                    ? t('letterGeneration.savedLetters.actions.addedToOutward')
                                    : t('letterGeneration.savedLetters.actions.addToOutward')}
                                </Button>
                                {outwardAddedReferenceNos.has(
                                  selectedSavedLetter.referenceNo,
                                ) && (
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                  >
                                    <Link
                                      href={buildOutwardEntryHref(selectedSavedLetter)}
                                    >
                                      <ExternalLink className="mr-2 size-4" />
                                      {t('letterGeneration.savedLetters.actions.viewInOutward')}
                                    </Link>
                                  </Button>
                                )}
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

      <AddressTranslationReviewDialog
        open={Boolean(addressReview)}
        targetLocale={addressReview?.targetLocale ?? 'mr'}
        initialName={addressReview?.initialName ?? ''}
        initialParts={addressReview?.initialParts ?? EMPTY_ADDRESS_PARTS}
        isConfirming={isConfirmingAddressReview}
        onConfirm={(result) => {
          setIsConfirmingAddressReview(true);
          resolveAddressReview(result);
        }}
        onCancel={() => resolveAddressReview(null)}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setLetterToDelete(null);
        }}
        title={t('letterGeneration.savedLetters.deleteConfirmTitle')}
        description={t('letterGeneration.savedLetters.deleteConfirmDescription')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={() => void confirmDeleteSavedLetter()}
      />
    </div>
  );
}
