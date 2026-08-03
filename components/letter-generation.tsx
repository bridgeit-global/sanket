'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eraser,
  ExternalLink,
  Eye,
  FileCode2,
  FileDown,
  FileType,
  Calendar,
  Loader2,
  ListTree,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from '@/components/toast';

import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  createLetterExportElement,
  getLetterPreviewDialogMaxWidthClass,
  LetterPreview,
} from '@/components/letter-preview';
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
import { Combobox } from '@/components/ui/combobox';
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
  isLetterType,
  isSpecificWardLetterType,
  isWardLetterType,
  LETTER_TYPES,
  wardIssueTypeFromLetterType,
  type CommonLetterFields,
  type DomicileLetterFields,
  type FeesLetterFields,
  type GeneralLetterFields,
  type IncomeLetterFields,
  type LetterLocale,
  type LetterType,
  type PersonGender,
  type RationLetterFields,
  type SchoolAdmissionLetterFields,
  type SchoolTransferLetterFields,
  type WardLetterFields,
} from '@/lib/letters/templates';
import {
  getDefaultWardIssueType,
  getDefaultWardToAddress,
  getDefaultWardToName,
  getWardIssueLabel,
  getWardIssueOfficerSeedName,
  getWardIssueOptions,
  resolveWardIssueType,
  resolveWardIssueTypeFromServiceName,
  wardIssueRequiresDuration,
} from '@/lib/letters/ward-issue-presets';
import {
  documentTypeForLetterType,
  letterTypeLabel,
  resolveLetterFormBase,
  type LetterTypeOption,
} from '@/lib/letters/letter-type-options';
import {
  getLetterheadContentPaddingMm,
  resolveLetterheadUrl,
} from '@/lib/letters/letterhead';
import { buildRenderedLetterHtml, type LetterheadMode } from '@/lib/letters/render-template';
import { getDefaultTemplateHtml } from '@/lib/letters/default-template-html';
import {
  getCustomTemplatePlaceholders,
  humanizePlaceholderKey,
} from '@/lib/letters/template-placeholders';
import {
  getDefaultLetterPaperSize,
  getLetterPaperContentWidthPx,
  getLetterPaperLabel,
  LETTER_PAPER_DIMENSIONS_MM,
  LETTER_PAPER_MARGIN_MM,
  resolveLetterPaperSize,
  type LetterPaperSize,
} from '@/lib/letters/paper-size';
import { letterPdfDownloadFileName, wardIssueLabelFromLetterFields } from '@/lib/letters/pdf-storage';
import { exportElementToPdf, printPdfBlob } from '@/lib/pdf/export-element-to-pdf';
import { DateRangePicker } from '@/components/date-range-picker';
import { ModulePageHeader } from '@/components/module-page-header';
import {
  createEmptyAddressParts,
  LetterAddressField,
  type AddressMasterRow,
} from '@/components/letter-address-field';
import {
  getFallbackAddressType,
  type LetterAddressField as LetterAddressFieldKey,
} from '@/lib/letters/letter-address-fields';
import {
  formatAddressMaster,
  formatAddressMasterMultiline,
  hasAddressContent,
  hasRequiredAddressFields,
  localizeAddressPartsDigits,
  mergeAddressParts,
  parseFreeTextAddressForLocale,
  sanitizeAddressPartsLocations,
  type AddressMasterAddressParts,
} from '@/lib/letters/format-address-master';
import {
  findDefaultOfficeAddress,
  findDefaultRationOfficeAddress,
} from '@/lib/letters/default-addresses';
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

type SavedLetterTypeFilter = string;

const ALL_LETTER_TYPES = 'all' as const;

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

/** Digits-only mobile contact (max 10). Accepts Devanagari input. */
function normalizeContactNo(value: string): string {
  return toWesternDigits(value).replace(/\D/g, '').slice(0, 10);
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

function parseTextRows(value: string): string[] {
  const rows = value.split('\n');
  return rows.length > 0 ? rows : [''];
}

function formatTextRows(rows: string[]): string {
  return rows
    .map((row) => row.trim())
    .filter(Boolean)
    .join('\n');
}

function defaultSignatureParagraphRows(locale: LetterLocale): string[] {
  const signatory = DEFAULT_SIGNATORY[locale];
  if (locale === 'mr') {
    return ['आपली विश्वासू,', `(${signatory})`];
  }
  return ['Yours faithfully,', `(${signatory})`];
}

function isRationLetterType(type: LetterType | string): boolean {
  return typeof type === 'string' && type.startsWith('ration-');
}

function matchesSavedLetterTypeFilter(
  letterType: string,
  filter: SavedLetterTypeFilter,
): boolean {
  if (filter === ALL_LETTER_TYPES) return true;
  if (filter === 'ration') {
    return letterType === 'ration' || letterType.startsWith('ration-');
  }
  if (filter === 'ward') {
    return isWardLetterType(letterType);
  }
  return letterType === filter;
}

function resolveWardIssueForLetterContext(
  letterType: string | null | undefined,
  serviceName: string | null | undefined,
) {
  return (
    wardIssueTypeFromLetterType(letterType ?? undefined) ??
    resolveWardIssueTypeFromServiceName(serviceName) ??
    getDefaultWardIssueType()
  );
}

function getFieldsForLetterType(
  type: LetterType | string,
  fields: {
    generalFields: GeneralLetterFields;
    feesFields: FeesLetterFields;
    schoolAdmissionFields: SchoolAdmissionLetterFields;
    schoolTransferFields: SchoolTransferLetterFields;
    rationFields: RationLetterFields;
    incomeFields: IncomeLetterFields;
    domicileFields: DomicileLetterFields;
    wardFields: WardLetterFields;
  },
) {
  const formBase = resolveLetterFormBase(type);
  switch (formBase) {
    case 'general':
      return fields.generalFields;
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
    case 'ward':
      return fields.wardFields;
    default:
      if (isRationLetterType(formBase)) return fields.rationFields;
      return fields.generalFields;
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

function commonDefaults(locale: LetterLocale, letterType?: string | null) {
  return {
    referencePrefix: letterType
      ? documentTypeForLetterType(letterType)
      : defaultReferencePrefix(locale),
    referenceNo: '',
    date: todayDisplay(locale),
    signatory: DEFAULT_SIGNATORY[locale],
  };
}

function feesDefaults(locale: LetterLocale): FeesLetterFields {
  return {
    ...commonDefaults(locale, 'fees'),
    schoolName: '',
    schoolAddress: '',
    standard: '',
    studentName: '',
  };
}

function schoolAdmissionDefaults(locale: LetterLocale): SchoolAdmissionLetterFields {
  return {
    ...commonDefaults(locale, 'school-admission'),
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
    ...commonDefaults(locale, 'school-transfer'),
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
    ...commonDefaults(locale, 'ration-new'),
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
    ...commonDefaults(locale, 'income'),
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
    ...commonDefaults(locale, 'domicile'),
    gender: 'male',
    salutation: resolveSalutation(locale, 'male'),
    fullName: '',
    address: '',
    officeName: '',
    officeAddress: '',
    aadhaarNo: '',
  };
}

function generalDefaults(locale: LetterLocale): GeneralLetterFields {
  return {
    ...commonDefaults(locale, 'general'),
    to: '',
    subject: '',
    paragraphs: '',
    signatureParagraphs: formatTextRows(defaultSignatureParagraphRows(locale)),
  };
}

function wardDefaults(
  locale: LetterLocale,
  issueType: ReturnType<typeof resolveWardIssueType> = getDefaultWardIssueType(),
): WardLetterFields {
  const resolved = resolveWardIssueType(issueType);
  return {
    ...commonDefaults(locale, 'ward'),
    issueType: resolved,
    to: getDefaultWardToAddress(resolved, locale),
    toName: getDefaultWardToName(resolved, locale),
    complainantName: '',
    contactNo: '',
    location: '',
    duration: '',
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

/** Input with an inline clear (X) button when it has a value. */
function ClearableInput({
  value,
  onClear,
  className,
  disabled,
  ...props
}: {
  value: string;
  onClear: () => void;
} & Omit<React.ComponentProps<typeof Input>, 'value'>) {
  const showClear = Boolean(value) && !disabled;
  return (
    <div className="relative">
      <Input
        {...props}
        value={value}
        disabled={disabled}
        className={cn(showClear && 'pr-10', className)}
      />
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Clear"
          tabIndex={-1}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function hasDevanagari(text: string) {
  return /[\u0900-\u097F]/.test(text);
}

function hasLatinLetters(text: string) {
  return /[A-Za-z]/.test(text);
}

/** Phonetic Latin → Marathi Devanagari via /api/translate. Null when skip/fail. */
async function transliterateToMarathi(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (hasDevanagari(trimmed) || !hasLatinLetters(trimmed)) return null;
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: trimmed, targetLocale: 'mr' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Failed to translate');
    const translated = String(json?.translated ?? '').trim();
    return translated || null;
  } catch (error) {
    console.error('Failed to transliterate name to Marathi', error);
    return null;
  }
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
    <ClearableInput
      {...props}
      value={value}
      lang={locale === 'mr' ? 'mr' : 'en'}
      onChange={(e) => onValueChange(filterLocaleText(e.target.value, locale))}
      onClear={() => onValueChange('')}
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

/** Collapse HTML/newline breaks back to a single comma-separated line. */
function addressToSingleLine(value: string): string {
  return value
    .replace(/<span\b[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .split(/\r?\n|<br\s*\/?>/i)
    .map((line) => line.trim().replace(/,\s*$/, ''))
    .filter(Boolean)
    .join(', ');
}

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
  to: string | null;
  fromRationOffice: string | null;
  toRationOffice: string | null;
};

type ManualAddressKey = keyof AddressSelectionState;
type ManualAddressParts = Record<ManualAddressKey, AddressMasterAddressParts>;

// Recipient ("To") blocks use hard line breaks:
//   line1, / line2, city - pin  (or with line3 before city).
// Inline placeholders (applicant address, from/to ration office in body
// text) stay single-line.
const MULTILINE_ADDRESS_KEYS: ReadonlySet<ManualAddressKey> = new Set([
  'school',
  'rationOffice',
  'office',
  'to',
]);

function formatAddressForManualKey(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  key?: ManualAddressKey,
): string {
  if (key && MULTILINE_ADDRESS_KEYS.has(key)) {
    return formatAddressMasterMultiline(parts, locale);
  }
  return formatAddressMaster(parts, locale);
}

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
  multiline = false,
): string | null {
  if (!masterId) return null;
  const address = addresses.find((item) => item.id === masterId);
  if (!address) return null;
  return multiline
    ? formatAddressMasterMultiline(address, locale)
    : formatAddressMaster(address, locale);
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

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function combineNameAndAddress(
  name: string,
  addressText: string,
  separator = ', ',
  options?: { boldName?: boolean },
): string {
  const trimmedName = name.trim();
  const trimmedAddress = addressText.trim();
  const displayName =
    options?.boldName && trimmedName
      ? `<span class="var">${escapeHtmlText(trimmedName)}</span>`
      : trimmedName;
  if (displayName && trimmedAddress) return `${displayName}${separator}${trimmedAddress}`;
  return displayName || trimmedAddress;
}

function formatRationOfficeWithAddress(
  address: Pick<AddressMasterRow, 'name' | 'nameMr'> & AddressMasterAddressParts,
  locale: LetterLocale,
  /** When true, name sits on its own line above a multiline address (recipient block). */
  nameOnOwnLine = false,
): string {
  const name = getAddressMasterName(address, locale);
  const addressText = nameOnOwnLine
    ? formatAddressMasterMultiline(address, locale)
    : formatAddressMaster(address, locale);
  return combineNameAndAddress(name, addressText, nameOnOwnLine ? ',<br>' : ', ', {
    boldName: nameOnOwnLine,
  });
}

function formatWardToWithAddress(
  address: Pick<AddressMasterRow, 'name' | 'nameMr'> & AddressMasterAddressParts,
  locale: LetterLocale,
): string {
  return formatRationOfficeWithAddress(address, locale, true);
}

function findWardOfficerAddress(
  addresses: AddressMasterRow[],
  issueType: ReturnType<typeof resolveWardIssueType>,
): AddressMasterRow | undefined {
  const seedName = getWardIssueOfficerSeedName(issueType);
  return addresses.find(
    (row) =>
      row.addressType === 'office' &&
      row.isActive !== false &&
      row.name === seedName,
  );
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
    setWardFields: Dispatch<SetStateAction<WardLetterFields>>;
  },
) {
  const schoolText = getAddressTextFromMaster(addresses, selections.school, locale, true);
  const applicantText = getAddressTextFromMaster(
    addresses,
    selections.applicant,
    locale,
  );
  const rationOfficeText = getAddressTextFromMaster(
    addresses,
    selections.rationOffice,
    locale,
    true,
  );
  const officeText = getAddressTextFromMaster(addresses, selections.office, locale, true);
  const toText = getAddressTextFromMaster(addresses, selections.to, locale, true);

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
    const rationMaster = addresses.find((item) => item.id === selections.rationOffice);
    const rationOfficeAddress = rationMaster
      ? formatRationOfficeWithAddress(rationMaster, locale, true)
      : rationOfficeText;
    setters.setRationFields((prev) => ({
      ...prev,
      rationOfficeAddress,
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

  if (selections.to) {
    const toMaster = addresses.find((item) => item.id === selections.to);
    if (toMaster) {
      setters.setWardFields((prev) => ({
        ...prev,
        toName: getAddressMasterName(toMaster, locale) || prev.toName,
        to: formatWardToWithAddress(toMaster, locale),
      }));
    } else if (toText) {
      setters.setWardFields((prev) => ({ ...prev, to: toText }));
    }
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
  pdfStoragePath?: string | null;
  printedAt?: string | Date | null;
  createdAt: string | Date;
};

type LetterMasterRow = {
  id: string;
  name: string;
  letterType: string;
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
  voterId: string | null;
  createdAt: string;
};

export type LetterBeneficiaryPrefill = {
  name?: string;
  contactNo?: string;
  address?: string;
};

export function LetterGeneration({
  isAdmin = false,
  beneficiaryServiceId,
  prefillName,
  prefill,
  initialLetterType,
  catalogServiceId,
  service,
}: {
  isAdmin?: boolean;
  beneficiaryServiceId?: string;
  /** Beneficiary name shown in the service info card. */
  prefillName?: string;
  /** Voter-derived values seeded into letter form fields. */
  prefill?: LetterBeneficiaryPrefill;
  /** Letter type linked on ServiceCatalog.letter_type for this service. */
  initialLetterType?: string;
  /** ServiceCatalog row id — used to deep-link “link letter type”. */
  catalogServiceId?: string;
  service?: BeneficiaryServiceInfo;
}) {
  const { data: session } = useSession();
  const { t, locale } = useTranslations();
  /** Letters are Marathi-only. */
  const letterLocale: LetterLocale = 'mr';
  /** Field labels / options follow letter language, not UI locale. */
  const lt = useCallback(
    (key: string) => letterMessage(letterLocale, key),
    [letterLocale],
  );
  const prevLetterLocaleRef = useRef<LetterLocale>('mr');
  const linkedLetterType = initialLetterType?.trim() || null;
  const lockFixedFields = Boolean(beneficiaryServiceId);
  const voterPrefillName = (prefill?.name ?? prefillName ?? '').trim();
  const voterPrefillContact = (prefill?.contactNo ?? '').replace(/\D/g, '').slice(-10);
  const voterPrefillAddress = (prefill?.address ?? '').trim();
  const lockContactNo = lockFixedFields && Boolean(voterPrefillContact);
  /** Invalidates in-flight person-name Marathi transliteration when the operator edits. */
  const nameTranslateReqIdRef = useRef<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>(
    () => linkedLetterType ?? 'general',
  );
  /** True once service has a linked type, or operator chose General Letter. */
  const [letterTypeReady, setLetterTypeReady] = useState(
    () => Boolean(linkedLetterType),
  );
  const [letterTypeOptions, setLetterTypeOptions] = useState<LetterTypeOption[]>(
    [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [addingToOutwardLetterId, setAddingToOutwardLetterId] = useState<
    string | null
  >(null);
  const [outwardAddedReferenceNos, setOutwardAddedReferenceNos] = useState<
    Set<string>
  >(() => new Set());
  const [downloadingLetterId, setDownloadingLetterId] = useState<string | null>(
    null,
  );
  const [printingLetterId, setPrintingLetterId] = useState<string | null>(null);
  const [printPaperDialogOpen, setPrintPaperDialogOpen] = useState(false);
  const [printPaperSizeInfo, setPrintPaperSizeInfo] = useState('');
  const [reprintDialogOpen, setReprintDialogOpen] = useState(false);
  const [reprintWarning, setReprintWarning] = useState<string>('');
  const [letterPendingPrint, setLetterPendingPrint] =
    useState<SavedLetterRow | null>(null);
  const letterPendingPrintRef = useRef<SavedLetterRow | null>(null);
  const [isGeneratorCollapsed, setIsGeneratorCollapsed] = useState(false);

  const [feesFields, setFeesFields] = useState<FeesLetterFields>(() =>
    feesDefaults('mr'),
  );
  const [generalFields, setGeneralFields] = useState<GeneralLetterFields>(() =>
    generalDefaults('mr'),
  );
  const [paragraphRows, setParagraphRows] = useState<string[]>(() => ['']);
  const paragraphRowsRef = useRef(paragraphRows);
  paragraphRowsRef.current = paragraphRows;
  const [schoolAdmissionFields, setSchoolAdmissionFields] =
    useState<SchoolAdmissionLetterFields>(() => schoolAdmissionDefaults('mr'));
  const [schoolTransferFields, setSchoolTransferFields] =
    useState<SchoolTransferLetterFields>(() => schoolTransferDefaults('mr'));
  const [rationFields, setRationFields] = useState<RationLetterFields>(() =>
    rationDefaults('mr'),
  );
  const [familyMemberRows, setFamilyMemberRows] = useState<FamilyMemberRow[]>(() => [
    emptyFamilyMemberRow(),
  ]);
  const familyMemberRowsRef = useRef(familyMemberRows);
  familyMemberRowsRef.current = familyMemberRows;
  const [incomeFields, setIncomeFields] = useState<IncomeLetterFields>(() =>
    incomeDefaults('mr'),
  );
  const [domicileFields, setDomicileFields] = useState<DomicileLetterFields>(
    () => domicileDefaults('mr'),
  );
  const [wardFields, setWardFields] = useState<WardLetterFields>(() =>
    wardDefaults(
      'mr',
      resolveWardIssueForLetterContext(linkedLetterType, service?.serviceName),
    ),
  );
  /** Values for {{placeholders}} in the template that are not on the standard form. */
  const [customPlaceholderValues, setCustomPlaceholderValues] = useState<
    Record<string, string>
  >({});
  const referenceNumberAutoRef = useRef(true);
  const referenceSequenceRequestId = useRef(0);

  const [savedLetters, setSavedLetters] = useState<SavedLetterRow[]>([]);
  const [savedLettersLoading, setSavedLettersLoading] = useState(false);
  const [letterMasters, setLetterMasters] = useState<LetterMasterRow[]>([]);
  const [letterMastersLoading, setLetterMastersLoading] = useState(false);
  const [selectedLetterMasterId, setSelectedLetterMasterId] = useState<
    string | null
  >(null);
  const [addresses, setAddresses] = useState<AddressMasterRow[]>([]);
  const addressTypeForField = useCallback(
    (field: LetterAddressFieldKey) => getFallbackAddressType(activeTab, field),
    [activeTab],
  );
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeMasterRow[]>([]);
  const [addressSelections, setAddressSelections] = useState<AddressSelectionState>({
    school: null,
    applicant: null,
    rationOffice: null,
    office: null,
    to: null,
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
    to: createEmptyAddressParts(),
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
  const [paperSizeDraft, setPaperSizeDraft] = useState<LetterPaperSize>(() =>
    getDefaultLetterPaperSize('fees'),
  );
  const [regeneratingLetterId, setRegeneratingLetterId] = useState<string | null>(null);
  const [selectedSavedLetterId, setSelectedSavedLetterId] = useState<string | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<string | null>(null);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [filterLetterType, setFilterLetterType] =
    useState<SavedLetterTypeFilter>(ALL_LETTER_TYPES);
  const [filterReference, setFilterReference] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LetterFieldErrors>({});
  const deriveAddressMasterName = (rawAddress: string, fallback: string) => {
    const firstLine =
      rawAddress
        .split(/\r?\n|<br\s*\/?>/i)
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

    // Letters are Marathi-only; translate into English for bilingual address master.
    let nameMr = trimmedName;
    let nameEn = '';
    const targetLocale: LetterLocale = 'en';

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

    let translatedParts = { ...parts };
    const hasTargetContent = Boolean(
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
              translatedParts = sanitizeAddressPartsLocations(
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
          console.error('Failed to translate address for auto-save', error);
        }
      }
    }

    // Translate directly on save — no review modal.
    nameEn = filterLocaleText(translatedName, targetLocale).trim();
    if (!nameEn) nameEn = trimmedName;
    if (!nameMr) nameMr = trimmedName;

    const mergedParts = sanitizeAddressPartsLocations(
      localizeAddressPartsDigits(mergeAddressParts(parts, translatedParts), 'mr'),
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

  const updateParagraphRows = useCallback(
    (rows: string[]) => {
      const nextRows = rows.length > 0 ? rows : [''];
      setParagraphRows(nextRows);
      setGeneralFields((prev) => ({
        ...prev,
        paragraphs: formatTextRows(nextRows),
      }));
      setFieldErrors((prev) =>
        prev.paragraphs ? { ...prev, paragraphs: undefined } : prev,
      );
    },
    [],
  );

  const syncReferenceFields = useCallback((prefix: string, number: string) => {
    const patch = {
      referencePrefix: prefix,
      referenceNo: number,
    };
    setFeesFields((prev) => ({ ...prev, ...patch }));
    setGeneralFields((prev) => ({ ...prev, ...patch }));
    setSchoolAdmissionFields((prev) => ({ ...prev, ...patch }));
    setSchoolTransferFields((prev) => ({ ...prev, ...patch }));
    setRationFields((prev) => ({ ...prev, ...patch }));
    setIncomeFields((prev) => ({ ...prev, ...patch }));
    setDomicileFields((prev) => ({ ...prev, ...patch }));
    setWardFields((prev) => ({ ...prev, ...patch }));
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
    setWardFields((prev) => {
      const issueType = resolveWardIssueType(prev.issueType);
      const prevDefaultTo = getDefaultWardToAddress(issueType, prevLocale);
      const nextDefaultTo = getDefaultWardToAddress(issueType, letterLocale);
      const toTrimmed = prev.to.trim();
      const nextTo =
        !toTrimmed || toTrimmed === prevDefaultTo.trim()
          ? nextDefaultTo
          : filterText(prev.to);
      return {
        ...prev,
        referencePrefix: nextPrefix(prev.referencePrefix),
        referenceNo: nextReferenceNo(prev.referenceNo),
        signatory: nextSignatory(prev.signatory),
        date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
        issueType,
        to: nextTo,
        toName:
          !prev.toName.trim() ||
          prev.toName.trim() === getDefaultWardToName(issueType, prevLocale).trim() ||
          prev.toName.trim() === getDefaultWardToName(issueType, letterLocale).trim()
            ? getDefaultWardToName(issueType, letterLocale)
            : filterText(prev.toName),
        complainantName: filterText(prev.complainantName),
        contactNo: normalizeContactNo(prev.contactNo),
        location: filterText(prev.location),
        duration: filterText(prev.duration),
      };
    });
    const nextParagraphRows = paragraphRowsRef.current.map((row) => filterText(row));
    setParagraphRows(nextParagraphRows.length > 0 ? nextParagraphRows : ['']);
    setGeneralFields((prev) => ({
      ...prev,
      referencePrefix: nextPrefix(prev.referencePrefix),
      referenceNo: nextReferenceNo(prev.referenceNo),
      signatory: nextSignatory(prev.signatory),
      date: prev.date.trim() === '' || prev.date === prevAutoDate ? nextAutoDate : prev.date,
      to: filterText(prev.to),
      subject: filterText(prev.subject),
      paragraphs: formatTextRows(nextParagraphRows),
      signatureParagraphs: formatTextRows(defaultSignatureParagraphRows(letterLocale)),
    }));

    applyMasterAddressToFields(addresses, addressSelections, letterLocale, {
      setFeesFields,
      setSchoolAdmissionFields,
      setSchoolTransferFields,
      setRationFields,
      setIncomeFields,
      setDomicileFields,
      setWardFields,
    });

    // For manual entry (no master selection), restore the per-locale formatted text when switching locale.
    if (!addressSelections.school) {
      const text = formatAddressForManualKey(manualAddressParts.school, letterLocale, 'school');
      if (text.trim()) {
        setFeesFields((prev) => ({ ...prev, schoolAddress: text }));
        setSchoolAdmissionFields((prev) => ({ ...prev, schoolAddress: text }));
        setSchoolTransferFields((prev) => ({ ...prev, schoolAddress: text }));
      }
    }
    if (!addressSelections.applicant) {
      const text = formatAddressForManualKey(
        manualAddressParts.applicant,
        letterLocale,
        'applicant',
      );
      if (text.trim()) {
        setSchoolAdmissionFields((prev) => ({ ...prev, address: text }));
        setSchoolTransferFields((prev) => ({ ...prev, address: text }));
        setRationFields((prev) => ({ ...prev, address: text }));
        setIncomeFields((prev) => ({ ...prev, address: text }));
        setDomicileFields((prev) => ({ ...prev, address: text }));
      }
    }
    if (!addressSelections.rationOffice) {
      const text = combineNameAndAddress(
        rationOfficeNamesRef.current.rationOffice,
        formatAddressForManualKey(
          manualAddressParts.rationOffice,
          letterLocale,
          'rationOffice',
        ),
        ',<br>',
        { boldName: true },
      );
      if (text.trim()) {
        setRationFields((prev) => ({ ...prev, rationOfficeAddress: text }));
      }
    }
    if (!addressSelections.office) {
      const text = formatAddressForManualKey(manualAddressParts.office, letterLocale, 'office');
      if (text.trim()) {
        setIncomeFields((prev) => ({ ...prev, officeAddress: text }));
        setDomicileFields((prev) => ({ ...prev, officeAddress: text }));
      }
    }
    if (!addressSelections.to) {
      setWardFields((prev) => {
        const addressText = formatAddressForManualKey(
          manualAddressParts.to,
          letterLocale,
          'to',
        );
        const text = combineNameAndAddress(prev.toName, addressText, ',<br>', {
          boldName: true,
        });
        if (text.trim()) {
          return { ...prev, to: text };
        }
        const issueType = resolveWardIssueType(prev.issueType);
        return {
          ...prev,
          toName: getDefaultWardToName(issueType, letterLocale),
          to: getDefaultWardToAddress(issueType, letterLocale),
        };
      });
    }

    prevLetterLocaleRef.current = letterLocale;
  }, [letterLocale, addresses, addressSelections, manualAddressParts]);

  const triggerAutoTranslateManualAddressParts = (
    key: ManualAddressKey,
    parts: AddressMasterAddressParts,
  ) => {
    const sourceLocale = letterLocale;
    const targetLocale: LetterLocale = 'en';
    const sourceText = formatAddressMaster(parts, sourceLocale);

    if (!sourceText.trim()) return;

    // Pincode-only updates don't need translation and can be mis-parsed.
    const hasAddressLines = Boolean(
      parts.line1Mr.trim() ||
      parts.line2Mr.trim() ||
      parts.line3Mr.trim() ||
      parts.cityMr.trim() ||
      parts.stateMr.trim(),
    );
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
        case 'to':
          setWardFields((prev) => ({
            ...prev,
            to: combineNameAndAddress(prev.toName, value, ',<br>', {
              boldName: true,
            }),
          }));
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

    const formatted = formatAddressForManualKey(parts, letterLocale, key);
    const value =
      key === 'rationOffice' ||
        key === 'fromRationOffice' ||
        key === 'toRationOffice'
        ? combineNameAndAddress(
          rationOfficeNamesRef.current[key],
          formatted,
          key === 'rationOffice' ? ',<br>' : ', ',
          key === 'rationOffice' ? { boldName: true } : undefined,
        )
        : key === 'to'
          ? formatted
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
    const addressText = formatAddressForManualKey(manualAddressParts[key], letterLocale, key);
    applyManualAddressToLetterFields(
      key,
      combineNameAndAddress(
        name,
        addressText,
        key === 'rationOffice' ? ',<br>' : ', ',
        key === 'rationOffice' ? { boldName: true } : undefined,
      ),
    );
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
      const text = getAddressTextFromMaster(addresses, id, letterLocale, true);
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
      const selected = addresses.find((a) => a.id === id);
      const text = selected
        ? formatRationOfficeWithAddress(selected, letterLocale, true)
        : getAddressTextFromMaster(addresses, id, letterLocale, true);
      if (text) {
        setRationFields((prev) => ({ ...prev, rationOfficeAddress: text }));
      }
      if (selected) {
        setManualAddressParts((prev) => ({
          ...prev,
          rationOffice: addressRowToParts(selected),
        }));
        const officeName = getAddressMasterName(selected, letterLocale);
        setRationOfficeNames((prev) => ({ ...prev, rationOffice: officeName }));
        rationOfficeNamesRef.current = {
          ...rationOfficeNamesRef.current,
          rationOffice: officeName,
        };
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

  // Prefill ration office with Anushakti Nagar (400088) once addresses load.
  const defaultRationOfficeAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultRationOfficeAppliedRef.current) return;
    if (addressSelections.rationOffice) {
      defaultRationOfficeAppliedRef.current = true;
      return;
    }
    const preferred = findDefaultRationOfficeAddress(addresses);
    if (!preferred) return;
    defaultRationOfficeAppliedRef.current = true;
    handleRationOfficeAddressSelect(preferred.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

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
      const text = getAddressTextFromMaster(addresses, id, letterLocale, true);
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

  // Prefill office with Tahsildar Office, Kurla once addresses load.
  const defaultOfficeAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultOfficeAppliedRef.current) return;
    if (addressSelections.office) {
      defaultOfficeAppliedRef.current = true;
      return;
    }
    const preferred = findDefaultOfficeAddress(addresses);
    if (!preferred) return;
    defaultOfficeAppliedRef.current = true;
    handleOfficeAddressSelect(preferred.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  const handleWardToAddressSelect = (id: string | null, seedText = '') => {
    setAddressSelections((prev) => {
      const next = { ...prev, to: id };
      addressSelectionsRef.current = next;
      return next;
    });
    setFieldErrors((prev) => ({
      ...prev,
      to: undefined,
      toAddress: undefined,
      toName: undefined,
    }));
    if (id) {
      const selected = addresses.find((a) => a.id === id);
      if (selected) {
        const toName = getAddressMasterName(selected, letterLocale);
        setWardFields((prev) => ({
          ...prev,
          toName,
          to: formatWardToWithAddress(selected, letterLocale),
        }));
        setManualAddressParts((prev) => ({ ...prev, to: addressRowToParts(selected) }));
      }
    } else {
      setWardFields((prev) => ({ ...prev, toName: '', to: '' }));
      seedManualAddressPartsFromText('to', seedText);
    }
  };

  // Prefill ward recipient with the issue-type officer once addresses load.
  const defaultWardToAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultWardToAppliedRef.current) return;
    if (addressSelections.to) {
      defaultWardToAppliedRef.current = true;
      return;
    }
    const preferred = findWardOfficerAddress(
      addresses,
      resolveWardIssueType(wardFields.issueType),
    );
    if (!preferred) return;
    defaultWardToAppliedRef.current = true;
    handleWardToAddressSelect(preferred.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses, wardFields.issueType]);

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

  const refreshLetterTypes = async () => {
    try {
      const res = await fetch('/api/letter-types');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch letter types');
      setLetterTypeOptions((json?.letterTypes ?? []) as LetterTypeOption[]);
    } catch (error) {
      console.error('Failed to fetch letter types', error);
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
    void refreshLetterTypes();
    void refreshAddresses();
    void refreshDocumentTypes();
    // Preload reference numbers already present in the outward register so the
    // "Add to Outward" action stays disabled across reloads.
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

  const formTab = resolveLetterFormBase(activeTab);

  const wardIssueComboboxOptions = useMemo(
    () =>
      getWardIssueOptions(letterLocale).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [letterLocale],
  );

  const letterTypeSelectOptions = useMemo(() => {
    const active = letterTypeOptions.filter((opt) => opt.isActive);
    if (active.length > 0) return active;
    return LETTER_TYPES.map(
      (code): LetterTypeOption => ({
        code,
        labelEn: code,
        labelMr: code,
        formBase: code,
        isBuiltIn: true,
        isActive: true,
        sortOrder: 0,
      }),
    );
  }, [letterTypeOptions]);

  const letterTypeComboboxOptions = useMemo(
    () =>
      letterTypeSelectOptions.map((type) => ({
        value: type.code,
        label: letterTypeLabel(type, letterLocale),
      })),
    [letterTypeSelectOptions, letterLocale],
  );

  const savedLetterTypeFilterOptions = useMemo(
    () => [
      {
        value: ALL_LETTER_TYPES,
        label: t('letterGeneration.savedLetters.filters.allTypes'),
      },
      ...letterTypeComboboxOptions.filter(
        (opt) => !isWardLetterType(opt.value) && opt.value !== 'ration',
      ),
      {
        value: 'ration',
        label: t('letterGeneration.tabs.ration'),
      },
      {
        value: 'ward',
        label: t('letterGeneration.tabs.ward'),
      },
    ],
    [letterTypeComboboxOptions, t],
  );

  const wardIssueLocked = isSpecificWardLetterType(activeTab);

  // Keep ward issue type locked to the selected ward-* letter type.
  useEffect(() => {
    const lockedIssue = wardIssueTypeFromLetterType(activeTab);
    if (!lockedIssue || wardFields.issueType === lockedIssue) return;
    defaultWardToAppliedRef.current = false;
    setAddressSelections((prev) => (prev.to ? { ...prev, to: null } : prev));
    setWardFields((prev) => ({
      ...prev,
      issueType: lockedIssue,
      duration: wardIssueRequiresDuration(lockedIssue) ? prev.duration : '',
    }));
  }, [activeTab, wardFields.issueType]);

  const documentTypeComboboxOptions = useMemo(() => {
    const codes =
      documentTypes.length > 0
        ? documentTypes.map((docType) => docType.code)
        : [...DOCUMENT_TYPES];
    return codes.map((docType) => ({
      value: docType,
      label: documentTypeLabel(docType, letterLocale, documentTypes),
    }));
  }, [documentTypes, letterLocale]);

  const resolveTypeLabel = useCallback(
    (code: string) => {
      const option = letterTypeOptions.find((opt) => opt.code === code);
      if (option) return letterTypeLabel(option, letterLocale, code);
      if (isLetterType(code)) return lt(`letterGeneration.tabs.${code}`);
      return code;
    },
    [letterTypeOptions, letterLocale, lt],
  );

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

  const mastersForActive = useMemo(() => {
    return letterMasters
      .filter(
        (master) =>
          master.letterType === activeTab && master.letterLocale === letterLocale,
      )
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt).getTime();
        const bTime = new Date(b.updatedAt).getTime();
        return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
      });
  }, [letterMasters, activeTab, letterLocale]);

  const letterMasterComboboxOptions = useMemo(
    () =>
      mastersForActive.map((master) => ({
        value: master.id,
        label: master.name,
      })),
    [mastersForActive],
  );

  const activeLetterMaster = useMemo(() => {
    if (selectedLetterMasterId) {
      const selected = mastersForActive.find((m) => m.id === selectedLetterMasterId);
      if (selected) return selected;
    }
    return mastersForActive[0] ?? null;
  }, [mastersForActive, selectedLetterMasterId]);

  useEffect(() => {
    if (mastersForActive.length === 0) {
      setSelectedLetterMasterId(null);
      return;
    }
    setSelectedLetterMasterId((prev) => {
      if (prev && mastersForActive.some((m) => m.id === prev)) return prev;
      return mastersForActive[0]?.id ?? null;
    });
  }, [mastersForActive]);

  useEffect(() => {
    const typeDefault = getDefaultLetterPaperSize(activeTab);
    if (!activeLetterMaster) {
      setPaperSizeDraft(typeDefault);
      return;
    }
    const masterSize = resolveLetterPaperSize(activeLetterMaster.paperSize, activeTab);
    // Ward was seeded as A4 before the default moved to A5 — prefer type default
    // until LetterMaster paper_size is synced.
    if (isWardLetterType(activeTab)) {
      setPaperSizeDraft(typeDefault);
      return;
    }
    setPaperSizeDraft(masterSize);
  }, [activeLetterMaster, activeTab]);

  const activeTemplateHtml =
    activeLetterMaster?.templateHtml?.trim() ||
    getDefaultTemplateHtml(activeTab, letterLocale);

  const customPlaceholders = useMemo(
    () => getCustomTemplatePlaceholders(activeTemplateHtml, activeTab),
    [activeTemplateHtml, activeTab],
  );

  useEffect(() => {
    setCustomPlaceholderValues((prev) => {
      const next: Record<string, string> = {};
      let changed = Object.keys(prev).length !== customPlaceholders.length;
      for (const key of customPlaceholders) {
        next[key] = prev[key] ?? '';
        if (!(key in prev)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [customPlaceholders]);

  const existingReferenceNos = useMemo(
    () => savedLetters.map((letter) => letter.referenceNo),
    [savedLetters],
  );

  const activeBody = useMemo(() => {
    const fields = {
      ...getFieldsForLetterType(activeTab, {
        generalFields,
        feesFields,
        schoolAdmissionFields,
        schoolTransferFields,
        rationFields,
        incomeFields,
        domicileFields,
        wardFields,
      }),
      ...customPlaceholderValues,
    };

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
    generalFields,
    feesFields,
    schoolAdmissionFields,
    schoolTransferFields,
    rationFields,
    incomeFields,
    domicileFields,
    wardFields,
    customPlaceholderValues,
    activeTemplateHtml,
    documentTypes,
  ]);

  const activeTitle = (() => {
    const base = resolveTypeLabel(activeTab);
    // Specific ward-* types already include the complaint in the label.
    if (resolveLetterFormBase(activeTab) !== 'ward' || wardIssueLocked) {
      return base;
    }
    const issueLabel = getWardIssueLabel(
      resolveWardIssueType(wardFields.issueType),
      letterLocale,
    );
    return issueLabel ? `${base} — ${issueLabel}` : base;
  })();
  const activePaperSize = paperSizeDraft;
  const activePaperLabel = getLetterPaperLabel(activePaperSize);
  const activeLetterheadUrl = resolveLetterheadUrl(
    activePaperSize,
    activeLetterMaster?.letterheadUrl,
  );

  const activeFields = useMemo(
    () => ({
      ...getFieldsForLetterType(activeTab, {
        generalFields,
        feesFields,
        schoolAdmissionFields,
        schoolTransferFields,
        rationFields,
        incomeFields,
        domicileFields,
        wardFields,
      }),
      ...customPlaceholderValues,
    }),
    [
      activeTab,
      customPlaceholderValues,
      domicileFields,
      generalFields,
      feesFields,
      incomeFields,
      rationFields,
      schoolAdmissionFields,
      schoolTransferFields,
      wardFields,
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
    setGeneralFields(coercePrefix);
    setSchoolAdmissionFields(coercePrefix);
    setSchoolTransferFields(coercePrefix);
    setRationFields(coercePrefix);
    setIncomeFields(coercePrefix);
    setDomicileFields(coercePrefix);
    setWardFields(coercePrefix);
  }, []);

  // Beneficiary flow: document type is derived from letter family (school/income/domicile → General, else Department).
  useEffect(() => {
    if (!lockFixedFields) return;
    const nextPrefix = documentTypeForLetterType(activeTab);
    const patchPrefix = <T extends { referencePrefix: string }>(prev: T): T =>
      prev.referencePrefix === nextPrefix
        ? prev
        : { ...prev, referencePrefix: nextPrefix };
    setFeesFields(patchPrefix);
    setGeneralFields(patchPrefix);
    setSchoolAdmissionFields(patchPrefix);
    setSchoolTransferFields(patchPrefix);
    setRationFields(patchPrefix);
    setIncomeFields(patchPrefix);
    setDomicileFields(patchPrefix);
    setWardFields(patchPrefix);
    referenceNumberAutoRef.current = true;
  }, [activeTab, lockFixedFields]);

  const bumpNameTranslateReqId = useCallback((fieldKey: string) => {
    nameTranslateReqIdRef.current[fieldKey] =
      (nameTranslateReqIdRef.current[fieldKey] ?? 0) + 1;
  }, []);

  /** Phonetic Latin → Marathi; no-ops if already Devanagari or operator edited mid-flight. */
  const applyNameMarathiIfUnchanged = useCallback(
    async (
      fieldKey: string,
      source: string,
      apply: (translated: string, trimmedSource: string) => void,
    ) => {
      const trimmed = source.trim();
      if (!trimmed || hasDevanagari(trimmed) || !hasLatinLetters(trimmed)) return;

      const reqId = (nameTranslateReqIdRef.current[fieldKey] ?? 0) + 1;
      nameTranslateReqIdRef.current[fieldKey] = reqId;
      const translated = await transliterateToMarathi(trimmed);
      if (!translated) return;
      if (nameTranslateReqIdRef.current[fieldKey] !== reqId) return;

      apply(translated, trimmed);
    },
    [],
  );

  // Seed voter name / contact / address into letter fields once.
  const voterPrefillAppliedRef = useRef(false);
  useEffect(() => {
    if (voterPrefillAppliedRef.current) return;
    if (!lockFixedFields) return;
    if (!voterPrefillName && !voterPrefillContact && !voterPrefillAddress) return;
    voterPrefillAppliedRef.current = true;

    if (voterPrefillName) {
      setWardFields((prev) =>
        prev.complainantName.trim()
          ? prev
          : { ...prev, complainantName: voterPrefillName },
      );
      void applyNameMarathiIfUnchanged(
        'ward.complainantName',
        voterPrefillName,
        (translated, trimmed) => {
          setWardFields((prev) => {
            if (prev.complainantName.trim() !== trimmed) return prev;
            return { ...prev, complainantName: translated };
          });
        },
      );
      setRationFields((prev) =>
        prev.fullName.trim() ? prev : { ...prev, fullName: voterPrefillName },
      );
      void applyNameMarathiIfUnchanged(
        'ration.fullName',
        voterPrefillName,
        (translated, trimmed) => {
          setRationFields((prev) => {
            if (prev.fullName.trim() !== trimmed) return prev;
            return { ...prev, fullName: translated };
          });
        },
      );
      setIncomeFields((prev) =>
        prev.fullName.trim() ? prev : { ...prev, fullName: voterPrefillName },
      );
      void applyNameMarathiIfUnchanged(
        'income.fullName',
        voterPrefillName,
        (translated, trimmed) => {
          setIncomeFields((prev) => {
            if (prev.fullName.trim() !== trimmed) return prev;
            return { ...prev, fullName: translated };
          });
        },
      );
      setDomicileFields((prev) =>
        prev.fullName.trim() ? prev : { ...prev, fullName: voterPrefillName },
      );
      void applyNameMarathiIfUnchanged(
        'domicile.fullName',
        voterPrefillName,
        (translated, trimmed) => {
          setDomicileFields((prev) => {
            if (prev.fullName.trim() !== trimmed) return prev;
            return { ...prev, fullName: translated };
          });
        },
      );
      setSchoolAdmissionFields((prev) =>
        prev.parentName.trim()
          ? prev
          : { ...prev, parentName: voterPrefillName },
      );
      void applyNameMarathiIfUnchanged(
        'school-admission.parentName',
        voterPrefillName,
        (translated, trimmed) => {
          setSchoolAdmissionFields((prev) => {
            if (prev.parentName.trim() !== trimmed) return prev;
            return { ...prev, parentName: translated };
          });
        },
      );
      setSchoolTransferFields((prev) =>
        prev.parentName.trim()
          ? prev
          : { ...prev, parentName: voterPrefillName },
      );
      void applyNameMarathiIfUnchanged(
        'school-transfer.parentName',
        voterPrefillName,
        (translated, trimmed) => {
          setSchoolTransferFields((prev) => {
            if (prev.parentName.trim() !== trimmed) return prev;
            return { ...prev, parentName: translated };
          });
        },
      );
    }
    if (voterPrefillContact) {
      setWardFields((prev) =>
        prev.contactNo.trim()
          ? prev
          : { ...prev, contactNo: voterPrefillContact },
      );
    }
    if (voterPrefillAddress) {
      setSchoolAdmissionFields((prev) =>
        prev.address.trim() ? prev : { ...prev, address: voterPrefillAddress },
      );
      setSchoolTransferFields((prev) =>
        prev.address.trim() ? prev : { ...prev, address: voterPrefillAddress },
      );
      setRationFields((prev) =>
        prev.address.trim() ? prev : { ...prev, address: voterPrefillAddress },
      );
      setIncomeFields((prev) =>
        prev.address.trim() ? prev : { ...prev, address: voterPrefillAddress },
      );
      setDomicileFields((prev) =>
        prev.address.trim() ? prev : { ...prev, address: voterPrefillAddress },
      );
      seedManualAddressPartsFromText('applicant', voterPrefillAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lockFixedFields,
    voterPrefillName,
    voterPrefillContact,
    voterPrefillAddress,
    applyNameMarathiIfUnchanged,
  ]);

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

    if (formTab === 'general') {
      requireField(errors, 'to', generalFields.to, requiredMsg);
      requireField(errors, 'subject', generalFields.subject, requiredMsg);
      requireField(errors, 'paragraphs', generalFields.paragraphs, requiredMsg);
    } else if (formTab === 'fees') {
      requireField(errors, 'schoolName', feesFields.schoolName, requiredMsg);
      requireField(errors, 'standard', feesFields.standard, requiredMsg);
      requireField(errors, 'studentName', feesFields.studentName, requiredMsg);
      requireAddress('school', feesFields.schoolAddress);
    } else if (formTab === 'school-admission') {
      requireField(errors, 'schoolName', schoolAdmissionFields.schoolName, requiredMsg);
      requireField(errors, 'standard', schoolAdmissionFields.standard, requiredMsg);
      requireField(errors, 'studentName', schoolAdmissionFields.studentName, requiredMsg);
      requireField(errors, 'parentName', schoolAdmissionFields.parentName, requiredMsg);
      requireAddress('school', schoolAdmissionFields.schoolAddress);
      requireAddress('applicant', schoolAdmissionFields.address);
    } else if (formTab === 'school-transfer') {
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
    } else if (isRationLetterType(formTab)) {
      requireField(errors, 'salutation', rationFields.salutation, requiredMsg);
      requireField(errors, 'fullName', rationFields.fullName, requiredMsg);
      requireField(errors, 'familyMembers', rationFields.familyMembers, requiredMsg);
      requireAddress('applicant', rationFields.address);
      requireAddress('rationOffice', rationFields.rationOfficeAddress);
      if (formTab !== 'ration-new') {
        requireField(errors, 'rationCardNo', rationFields.rationCardNo, requiredMsg);
      }
      if (formTab === 'ration-transfer') {
        requireAddress('fromRationOffice', rationFields.fromRationOffice ?? '');
        requireAddress('toRationOffice', rationFields.toRationOffice ?? '');
      }
    } else if (formTab === 'income') {
      requireField(errors, 'salutation', incomeFields.salutation, requiredMsg);
      requireField(errors, 'fullName', incomeFields.fullName, requiredMsg);
      requireField(errors, 'aadhaarNo', incomeFields.aadhaarNo, requiredMsg);
      requireField(errors, 'annualIncome', incomeFields.annualIncome, requiredMsg);
      requireField(errors, 'officeName', incomeFields.officeName, requiredMsg);
      requireAddress('applicant', incomeFields.address);
      requireAddress('office', incomeFields.officeAddress);
    } else if (formTab === 'domicile') {
      requireField(errors, 'salutation', domicileFields.salutation, requiredMsg);
      requireField(errors, 'fullName', domicileFields.fullName, requiredMsg);
      requireField(errors, 'aadhaarNo', domicileFields.aadhaarNo, requiredMsg);
      requireField(errors, 'officeName', domicileFields.officeName, requiredMsg);
      requireAddress('applicant', domicileFields.address);
      requireAddress('office', domicileFields.officeAddress);
    } else if (formTab === 'ward') {
      requireField(errors, 'toName', wardFields.toName, requiredMsg);
      requireAddress('to', wardFields.to);
      requireField(errors, 'complainantName', wardFields.complainantName, requiredMsg);
      const contactDigits = normalizeContactNo(wardFields.contactNo);
      if (!contactDigits) {
        errors.contactNo = requiredMsg;
      } else if (contactDigits.length !== 10) {
        errors.contactNo = lt('letterGeneration.validation.contactNoInvalid');
      }
      requireField(errors, 'location', wardFields.location, requiredMsg);
      if (wardIssueRequiresDuration(resolveWardIssueType(wardFields.issueType))) {
        requireField(errors, 'duration', wardFields.duration, requiredMsg);
      }
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

  const resolveSavedLetterPaperSize = (letter: SavedLetterRow): LetterPaperSize =>
    resolveLetterPaperSize(letter.paperSize, letter.letterType);

  const deriveLetterSubject = (letter: SavedLetterRow): string => {
    const fields = (letter.fields ?? {}) as Record<string, unknown>;
    if (typeof fields.subject === 'string' && fields.subject.trim()) {
      return fields.subject.trim();
    }
    return letter.title;
  };

  const deriveOutwardRecipient = (letter: SavedLetterRow): string => {
    const fields = (letter.fields ?? {}) as Record<string, unknown>;
    const candidates = [
      fields.schoolName,
      fields.toName,
      fields.officeName,
      fields.officeAddress,
      fields.rationOfficeAddress,
      fields.toRationOffice,
      fields.to,
      fields.fullName,
      fields.parentName,
      fields.studentName,
      fields.complainantName,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return addressToSingleLine(candidate);
      }
    }
    return letter.title;
  };

  const resolveLetterPdfFileName = (letter: SavedLetterRow): string =>
    letterPdfDownloadFileName(
      letter.title,
      letter.referenceNo,
      wardIssueLabelFromLetterFields(
        letter.letterType,
        letter.fields,
        letter.letterLocale,
      ),
    );

  const buildLetterPdfDocumentInfo = (letter: SavedLetterRow, pdfFileName: string) => ({
    title: pdfFileName,
    author: DEFAULT_SIGNATORY.en,
    subject: deriveLetterSubject(letter),
    keywords: 'eoffice, sana malik shaikh',
    creator: session?.user?.userId ?? 'eOffice',
    producer: DEFAULT_SIGNATORY.en,
  });

  const generateLetterPdfBlob = async (letter: SavedLetterRow): Promise<Blob> => {
    const paperSize = resolveSavedLetterPaperSize(letter);
    const exportHost = createLetterExportElement(letter.renderedHtml, {
      paperSize,
      letterLocale: letter.letterLocale,
    });
    document.body.appendChild(exportHost);
    try {
      const pdfFileName = resolveLetterPdfFileName(letter).replace(/\.pdf$/i, '');
      return await exportElementToPdf({
        element: exportHost,
        fileName: pdfFileName,
        format: paperSize,
        orientation: 'portrait',
        marginMm: LETTER_PAPER_MARGIN_MM[paperSize],
        scale: 2,
        captureWidthPx: getLetterPaperContentWidthPx(paperSize),
        destination: 'blob',
        documentInfo: buildLetterPdfDocumentInfo(letter, pdfFileName),
        pageBackground: {
          headerHeightMm: getLetterheadContentPaddingMm(paperSize),
        },
      });
    } finally {
      exportHost.remove();
    }
  };

  const uploadLetterPdfToStorage = async (
    letter: SavedLetterRow,
    blob: Blob,
  ): Promise<SavedLetterRow | null> => {
    const pdfFileName = resolveLetterPdfFileName(letter);
    const formData = new FormData();
    formData.append('file', blob, pdfFileName);
    const res = await fetch(`/api/letters/${encodeURIComponent(letter.id)}/pdf`, {
      method: 'POST',
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json?.error || 'Failed to upload letter PDF');
    }
    const updated = json?.letter as SavedLetterRow | undefined;
    if (updated?.id) {
      setSavedLetters((prev) =>
        prev.map((item) =>
          item.id === letter.id ? { ...item, ...updated } : item,
        ),
      );
      return { ...letter, ...updated };
    }
    return {
      ...letter,
      pdfStoragePath: json?.letter?.pdfStoragePath ?? letter.pdfStoragePath,
    };
  };

  const markOutwardAdded = (referenceNo: string) => {
    if (!referenceNo) return;
    setOutwardAddedReferenceNos((prev) => {
      if (prev.has(referenceNo)) return prev;
      const next = new Set(prev);
      next.add(referenceNo);
      return next;
    });
  };

  // Deep-link into the outward register, pre-filtered to this letter's
  // reference number so the user lands on the matching entry.
  const buildOutwardEntryHref = (letter: SavedLetterRow): string => {
    const params = new URLSearchParams({ tab: 'outward' });
    if (letter.referenceNo) params.set('search', letter.referenceNo);
    return `/modules/io-register?${params.toString()}`;
  };

  /** Create an outward register entry for the saved letter and attach its PDF. */
  const registerLetterInOutward = async (
    letter: SavedLetterRow,
    pdfBlob: Blob,
  ): Promise<boolean> => {
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
        subject: deriveLetterSubject(letter),
        refNo: letter.referenceNo,
        autoSequence: false,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 403) {
      // User can save letters without outward module access — skip quietly.
      return false;
    }
    if (!res.ok) {
      throw new Error(json?.error || 'Failed to add letter to outward register');
    }

    const entryId = json?.id as string | undefined;
    if (!entryId) return false;

    const formData = new FormData();
    formData.append(
      'file',
      new File([pdfBlob], resolveLetterPdfFileName(letter), {
        type: 'application/pdf',
      }),
    );
    // Best-effort attachment; the register entry is already created.
    const uploadRes = await fetch(`/api/register/${entryId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (!uploadRes.ok) {
      const uploadJson = await uploadRes.json().catch(() => ({}));
      throw new Error(
        uploadJson?.error || 'Failed to attach letter PDF to outward register',
      );
    }
    return true;
  };

  const persistLetterPdf = async (
    letter: SavedLetterRow,
    options?: { registerOutward?: boolean },
  ): Promise<void> => {
    try {
      const blob = await generateLetterPdfBlob(letter);
      try {
        await uploadLetterPdfToStorage(letter, blob);
      } catch (error) {
        console.error('Failed to store letter PDF', error);
        toast.error(t('letterGeneration.savedLetters.pdfStorageError'));
      }

      if (options?.registerOutward) {
        try {
          const registered = await registerLetterInOutward(letter, blob);
          if (registered) {
            markOutwardAdded(letter.referenceNo);
            toast.success(t('letterGeneration.savedLetters.addToOutwardSuccess'));
          }
        } catch (error) {
          console.error('Failed to register letter in outward', error);
          toast.error(t('letterGeneration.savedLetters.addToOutwardError'));
        }
      }
    } catch (error) {
      console.error('Failed to generate letter PDF', error);
      toast.error(t('letterGeneration.savedLetters.pdfStorageError'));
    }
  };

  const handleAddLetterToOutward = async (letter: SavedLetterRow) => {
    if (!letter.referenceNo || outwardAddedReferenceNos.has(letter.referenceNo)) {
      return;
    }
    setAddingToOutwardLetterId(letter.id);
    try {
      const blob = await generateLetterPdfBlob(letter);
      try {
        await uploadLetterPdfToStorage(letter, blob);
      } catch (error) {
        console.error('Failed to store letter PDF', error);
      }
      const registered = await registerLetterInOutward(letter, blob);
      if (registered) {
        markOutwardAdded(letter.referenceNo);
        toast.success(t('letterGeneration.savedLetters.addToOutwardSuccess'));
      }
    } catch (error) {
      console.error('Add letter to outward failed', error);
      toast.error(t('letterGeneration.savedLetters.addToOutwardError'));
    } finally {
      setAddingToOutwardLetterId(null);
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
          (formTab === 'fees'
            ? feesFields.schoolAddress
            : formTab === 'school-admission'
              ? schoolAdmissionFields.schoolAddress
              : formTab === 'school-transfer'
                ? schoolTransferFields.schoolAddress
                : '') ?? '';
        const schoolNameValue =
          (formTab === 'fees'
            ? feesFields.schoolName
            : formTab === 'school-admission'
              ? schoolAdmissionFields.schoolName
              : formTab === 'school-transfer'
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

      if (!addressSelections.rationOffice && isRationLetterType(formTab)) {
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

      if (formTab === 'ration-transfer') {
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

      if (!addressSelections.office && (formTab === 'income' || formTab === 'domicile')) {
        const officeText =
          (formTab === 'income' ? incomeFields.officeAddress : domicileFields.officeAddress) ??
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

      if (!addressSelections.to && formTab === 'ward') {
        const toText = wardFields.to ?? '';
        if (toText.trim()) {
          const created = await createAddressMasterFromManualEntry({
            addressType: addressTypeForField('to'),
            name: wardFields.toName.trim() || deriveAddressMasterName(toText, 'Ward Officer'),
            parts: manualAddressParts.to,
          });
          if (created?.id) {
            setAddresses((prev) =>
              prev.some((a) => a.id === created.id) ? prev : [created, ...prev],
            );
            setAddressSelections((prev) => ({ ...prev, to: created.id }));
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
      const savedLetter = json?.letter as SavedLetterRow | undefined;
      setSelectedSavedLetterId(savedLetter?.id ?? null);
      if (savedLetter?.id && savedLetter.renderedHtml) {
        void persistLetterPdf(savedLetter, { registerOutward: true });
      }
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
      if (updated?.id && updated.renderedHtml) {
        void persistLetterPdf(updated);
      }
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

  const confirmClearAll = () => {
    setFeesFields(feesDefaults(letterLocale));
    setGeneralFields(generalDefaults(letterLocale));
    setSchoolAdmissionFields(schoolAdmissionDefaults(letterLocale));
    setSchoolTransferFields(schoolTransferDefaults(letterLocale));
    setRationFields(rationDefaults(letterLocale));
    setIncomeFields(incomeDefaults(letterLocale));
    setDomicileFields(domicileDefaults(letterLocale));
    setWardFields(
      wardDefaults(
        letterLocale,
        resolveWardIssueForLetterContext(activeTab, service?.serviceName),
      ),
    );
    setCustomPlaceholderValues(
      Object.fromEntries(customPlaceholders.map((key) => [key, ''])),
    );
    setParagraphRows(['']);
    setFamilyMemberRows([emptyFamilyMemberRow()]);
    setAddressSelections({
      school: null,
      applicant: null,
      rationOffice: null,
      office: null,
      to: null,
      fromRationOffice: null,
      toRationOffice: null,
    });
    setManualAddressParts({
      school: createEmptyAddressParts(),
      applicant: createEmptyAddressParts(),
      rationOffice: createEmptyAddressParts(),
      office: createEmptyAddressParts(),
      to: createEmptyAddressParts(),
      fromRationOffice: createEmptyAddressParts(),
      toRationOffice: createEmptyAddressParts(),
    });
    setAddressPincodeErrors({});
    setRationOfficeNames({
      rationOffice: '',
      fromRationOffice: '',
      toRationOffice: '',
    });
    setFieldErrors({});
    referenceNumberAutoRef.current = true;
    void refreshReferenceSequence(defaultReferencePrefix(letterLocale), {
      force: true,
    });
    const preferredRationOffice = findDefaultRationOfficeAddress(addresses);
    if (preferredRationOffice) {
      handleRationOfficeAddressSelect(preferredRationOffice.id);
    }
    const preferredOffice = findDefaultOfficeAddress(addresses);
    if (preferredOffice) {
      handleOfficeAddressSelect(preferredOffice.id);
    }
    defaultWardToAppliedRef.current = false;
    const clearedWardIssue = resolveWardIssueForLetterContext(
      activeTab,
      service?.serviceName,
    );
    const preferredWardTo = findWardOfficerAddress(addresses, clearedWardIssue);
    if (preferredWardTo) {
      defaultWardToAppliedRef.current = true;
      handleWardToAddressSelect(preferredWardTo.id);
    }
    setClearAllDialogOpen(false);
    toast.success(t('letterGeneration.clearAllSuccess'));
  };

  const executePrintSavedLetter = async (letter: SavedLetterRow) => {
    setPrintingLetterId(letter.id);
    try {
      // Print via PDF so Chrome cannot stamp URL/date headers (HTML @page cannot suppress them).
      const blob = await generateLetterPdfBlob(letter);
      // Stop loader as soon as the print dialog can open — cancel does not always fire afterprint.
      setPrintingLetterId(null);
      await printPdfBlob(blob);

      // Best-effort: record print so reprints can be detected.
      try {
        const res = await fetch(
          `/api/letters/${encodeURIComponent(letter.id)}/print`,
          { method: 'POST' },
        );
        if (res.ok) {
          const json = (await res.json()) as { letter?: SavedLetterRow };
          if (json.letter) {
            setSavedLetters((prev) =>
              prev.map((row) =>
                row.id === letter.id
                  ? {
                      ...row,
                      printedAt:
                        json.letter?.printedAt ?? new Date().toISOString(),
                    }
                  : row,
              ),
            );
          }
        }
      } catch (markError) {
        console.error('Failed to mark letter as printed', markError);
      }
    } catch (error) {
      console.error('Saved letter print failed', error);
      toast.error(t('letterGeneration.printPopupBlocked'));
    } finally {
      setPrintingLetterId(null);
    }
  };

  const handlePrintSavedLetter = (letter: SavedLetterRow) => {
    letterPendingPrintRef.current = letter;
    setLetterPendingPrint(letter);
    setReprintDialogOpen(false);
    setReprintWarning('');
    setPrintPaperDialogOpen(false);

    const paperSize = resolveSavedLetterPaperSize(letter);
    const dims = LETTER_PAPER_DIMENSIONS_MM[paperSize];
    const paperInfo = t('letterGeneration.printPaperSize.description', {
      size: t(`letterGeneration.paperSize.options.${paperSize}`),
      widthMm: dims.widthMm,
      heightMm: dims.heightMm,
      marginMm: LETTER_PAPER_MARGIN_MM[paperSize],
    });
    setPrintPaperSizeInfo(paperInfo);

    // Already printed → one dialog with reprint warning + paper size, then print.
    if (letter.printedAt) {
      setReprintWarning(
        `${t('letterGeneration.savedLetters.reprintConfirmDescription', {
          voterId: service?.voterId || '—',
          serviceName: service?.serviceName || '—',
          date: new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
          }).format(new Date(letter.printedAt)),
          referenceNos: letter.referenceNo || '—',
        })}\n\n${paperInfo}`,
      );
      setReprintDialogOpen(true);
      toast.info(t('letterGeneration.printDuplicateWarning'));
      return;
    }

    // First print → paper size info only.
    setPrintPaperDialogOpen(true);
  };

  const confirmPrintPaperSize = () => {
    const letter = letterPendingPrintRef.current ?? letterPendingPrint;
    setPrintPaperDialogOpen(false);
    setLetterPendingPrint(null);
    if (!letter) return;
    setSelectedSavedLetterId(null);
    window.setTimeout(() => {
      void executePrintSavedLetter(letter);
    }, 450);
  };

  const confirmReprintSavedLetter = () => {
    const letter = letterPendingPrintRef.current ?? letterPendingPrint;
    setReprintDialogOpen(false);
    setReprintWarning('');
    setLetterPendingPrint(null);
    if (!letter) return;
    setSelectedSavedLetterId(null);
    window.setTimeout(() => {
      void executePrintSavedLetter(letter);
    }, 450);
  };

  const triggerPdfDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSavedLetter = async (letter: SavedLetterRow) => {
    setDownloadingLetterId(letter.id);
    try {
      const pdfFileName = letterPdfDownloadFileName(
        letter.title,
        letter.referenceNo,
        wardIssueLabelFromLetterFields(
          letter.letterType,
          letter.fields,
          letter.letterLocale,
        ),
      );

      if (letter.pdfStoragePath) {
        const res = await fetch(
          `/api/letters/${encodeURIComponent(letter.id)}/pdf`,
        );
        if (res.ok) {
          const blob = await res.blob();
          triggerPdfDownload(blob, pdfFileName);
          toast.success(t('letterGeneration.pdfSuccess'));
          return;
        }
      }

      const blob = await generateLetterPdfBlob(letter);
      triggerPdfDownload(blob, pdfFileName);
      toast.success(t('letterGeneration.pdfSuccess'));
      void uploadLetterPdfToStorage(letter, blob).catch((error) => {
        console.error('Failed to store letter PDF after download', error);
      });
    } catch (error) {
      console.error('Saved letter PDF export failed', error);
      toast.error(t('letterGeneration.pdfError'));
    } finally {
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
      {outwardAddedReferenceNos.has(letter.referenceNo) ? (
        <Button
          asChild
          size="sm"
          variant="outline"
          className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
        >
          <Link href={buildOutwardEntryHref(letter)}>
            <ExternalLink className="mr-2 size-4" />
            {t('letterGeneration.savedLetters.actions.goToOutward')}
          </Link>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className={layout === 'stack' ? 'w-full' : 'w-full sm:w-auto'}
          onClick={() => void handleAddLetterToOutward(letter)}
          disabled={addingToOutwardLetterId === letter.id}
        >
          {addingToOutwardLetterId === letter.id ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Send className="mr-2 size-4" />
          )}
          {t('letterGeneration.savedLetters.actions.addToOutward')}
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
          {lockFixedFields ? (
            <Input
              value={documentTypeLabel(
                coerceDocumentType(fields.referencePrefix) ??
                  fields.referencePrefix,
                letterLocale,
                documentTypes,
              )}
              readOnly
              disabled
              aria-required
            />
          ) : (
            <Combobox
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
              options={documentTypeComboboxOptions}
              placeholder={lt('letterGeneration.placeholders.referencePrefix')}
              aria-invalid={!!fieldErrors.referencePrefix}
              aria-required
            />
          )}
        </FieldGroup>
        <FieldGroup
          label={lt('letterGeneration.fields.referenceNo')}
          required
          error={fieldErrors.referenceNo}
        >
          <ClearableInput
            value={fields.referenceNo}
            onChange={(e) => {
              if (lockFixedFields) return;
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
            onClear={() => {
              if (lockFixedFields) return;
              referenceNumberAutoRef.current = false;
              syncReferenceFields(fields.referencePrefix, '');
              if (fieldErrors.referenceNo) {
                setFieldErrors((prev) => ({ ...prev, referenceNo: undefined }));
              }
            }}
            placeholder={lt('letterGeneration.placeholders.referenceNo')}
            required
            readOnly={lockFixedFields}
            disabled={lockFixedFields}
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
          {lockFixedFields ? (
            <Input value={fields.date} readOnly disabled aria-required />
          ) : (
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
          )}
        </FieldGroup>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <ModulePageHeader
        title={t('letterGeneration.title')}
        description={t('letterGeneration.description')}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link
            href={
              beneficiaryServiceId
                ? `/modules/letter-generation/service-catalog?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}`
                : '/modules/letter-generation/service-catalog'
            }
          >
            <ListTree className="mr-2 size-4" />
            {t('letterGeneration.serviceCatalogMaster.manageLink')}
          </Link>
        </Button>
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
        {isAdmin ? (
          <Button variant="outline" asChild>
            <Link
              href={
                beneficiaryServiceId
                  ? `/modules/letter-generation/templates?beneficiaryServiceId=${encodeURIComponent(beneficiaryServiceId)}&letterType=${encodeURIComponent(activeTab)}&letterLocale=${encodeURIComponent(letterLocale)}`
                  : `/modules/letter-generation/templates?letterType=${encodeURIComponent(activeTab)}&letterLocale=${encodeURIComponent(letterLocale)}`
              }
            >
              <FileCode2 className="mr-2 size-4" />
              {t('letterGeneration.templates.manageLink')}
            </Link>
          </Button>
        ) : null}
      </div>
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
            <Tabs value={formTab} onValueChange={(value) => setActiveTab(value)}>
              {!letterTypeReady ? (
                <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base">
                      {t('letterGeneration.letterTypeLink.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('letterGeneration.letterTypeLink.description', {
                        serviceName: service?.serviceName ?? '',
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 p-4 pt-0 sm:p-6 sm:pt-0">
                    <Button variant="default" asChild>
                      <Link
                        href={(() => {
                          const params = new URLSearchParams();
                          if (beneficiaryServiceId) {
                            params.set(
                              'beneficiaryServiceId',
                              beneficiaryServiceId,
                            );
                          }
                          if (catalogServiceId) {
                            params.set('editId', catalogServiceId);
                          } else if (service?.serviceName) {
                            params.set('serviceName', service.serviceName);
                          }
                          const qs = params.toString();
                          return qs
                            ? `/modules/letter-generation/service-catalog?${qs}`
                            : '/modules/letter-generation/service-catalog';
                        })()}
                      >
                        <ListTree className="mr-2 size-4" />
                        {t('letterGeneration.letterTypeLink.linkService')}
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setActiveTab('general');
                        setLetterTypeReady(true);
                      }}
                    >
                      {t('letterGeneration.letterTypeLink.useGeneral')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
              <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FieldGroup label={lt('letterGeneration.fields.letterType')}>
                  <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                    {resolveTypeLabel(activeTab)}
                  </div>
                </FieldGroup>
                {mastersForActive.length > 1 ? (
                  <FieldGroup label={t('letterGeneration.templates.selectTemplate')}>
                    <Combobox
                      value={activeLetterMaster?.id ?? undefined}
                      onValueChange={setSelectedLetterMasterId}
                      disabled={letterMastersLoading}
                      options={letterMasterComboboxOptions}
                      placeholder={t(
                        'letterGeneration.templates.selectTemplatePlaceholder',
                      )}
                    />
                  </FieldGroup>
                ) : null}
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
                    <TabsContent value="general" className="mt-0 space-y-4">
                      {renderCommonFields(generalFields, setGeneralFields)}
                      <FieldGroup
                        label={lt('letterGeneration.fields.to')}
                        required
                        error={fieldErrors.to}
                      >
                        <LocaleTextarea
                          locale={letterLocale}
                          value={generalFields.to}
                          onValueChange={(to) => {
                            setGeneralFields({ ...generalFields, to });
                            if (fieldErrors.to) {
                              setFieldErrors((prev) => ({ ...prev, to: undefined }));
                            }
                          }}
                          rows={4}
                          required
                        />
                      </FieldGroup>
                      <FieldGroup
                        label={lt('letterGeneration.fields.subject')}
                        required
                        error={fieldErrors.subject}
                      >
                        <LocaleTextInput
                          locale={letterLocale}
                          value={generalFields.subject}
                          onValueChange={(subject) => {
                            setGeneralFields({ ...generalFields, subject });
                            if (fieldErrors.subject) {
                              setFieldErrors((prev) => ({ ...prev, subject: undefined }));
                            }
                          }}
                          required
                        />
                      </FieldGroup>
                      <FieldGroup
                        label={lt('letterGeneration.fields.paragraph')}
                        required
                        error={fieldErrors.paragraphs}
                      >
                        <div className="space-y-2">
                          {paragraphRows.map((paragraph, index) => (
                            <div
                              key={`paragraph-${index}`}
                              className="flex flex-col gap-2 sm:flex-row sm:items-start"
                            >
                              <div className="flex-1">
                                <LocaleTextarea
                                  locale={letterLocale}
                                  value={paragraph}
                                  onValueChange={(value) => {
                                    const next = paragraphRows.map((row, i) =>
                                      i === index ? value : row,
                                    );
                                    updateParagraphRows(next);
                                  }}
                                  rows={3}
                                  aria-label={lt('letterGeneration.fields.paragraph')}
                                  required={index === 0}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                disabled={paragraphRows.length === 1}
                                onClick={() => {
                                  updateParagraphRows(
                                    paragraphRows.filter((_, i) => i !== index),
                                  );
                                }}
                                aria-label={lt('letterGeneration.fields.removeParagraph')}
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
                              updateParagraphRows([...paragraphRows, '']);
                            }}
                          >
                            <Plus className="mr-1.5 size-4" />
                            {lt('letterGeneration.fields.addParagraph')}
                          </Button>
                        </div>
                      </FieldGroup>
                    </TabsContent>

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
                              bumpNameTranslateReqId('fees.studentName');
                              setFeesFields({ ...feesFields, studentName });
                              if (fieldErrors.studentName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  studentName: undefined,
                                }));
                              }
                            }}
                            onBlur={() => {
                              void applyNameMarathiIfUnchanged(
                                'fees.studentName',
                                feesFields.studentName,
                                (translated, trimmed) => {
                                  setFeesFields((prev) => {
                                    if (prev.studentName.trim() !== trimmed) return prev;
                                    return { ...prev, studentName: translated };
                                  });
                                },
                              );
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
                              bumpNameTranslateReqId('school-admission.studentName');
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
                            onBlur={() => {
                              void applyNameMarathiIfUnchanged(
                                'school-admission.studentName',
                                schoolAdmissionFields.studentName,
                                (translated, trimmed) => {
                                  setSchoolAdmissionFields((prev) => {
                                    if (prev.studentName.trim() !== trimmed) return prev;
                                    return { ...prev, studentName: translated };
                                  });
                                },
                              );
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
                            bumpNameTranslateReqId('school-admission.parentName');
                            setSchoolAdmissionFields({
                              ...schoolAdmissionFields,
                              parentName,
                            });
                            if (fieldErrors.parentName) {
                              setFieldErrors((prev) => ({ ...prev, parentName: undefined }));
                            }
                          }}
                          onBlur={() => {
                            void applyNameMarathiIfUnchanged(
                              'school-admission.parentName',
                              schoolAdmissionFields.parentName,
                              (translated, trimmed) => {
                                setSchoolAdmissionFields((prev) => {
                                  if (prev.parentName.trim() !== trimmed) return prev;
                                  return { ...prev, parentName: translated };
                                });
                              },
                            );
                          }}
                          required
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={lt('letterGeneration.fields.address')}
                        addressType={addressTypeForField('applicant')}
                        entryMode="structured"
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
                              bumpNameTranslateReqId('school-transfer.studentName');
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
                            onBlur={() => {
                              void applyNameMarathiIfUnchanged(
                                'school-transfer.studentName',
                                schoolTransferFields.studentName,
                                (translated, trimmed) => {
                                  setSchoolTransferFields((prev) => {
                                    if (prev.studentName.trim() !== trimmed) return prev;
                                    return { ...prev, studentName: translated };
                                  });
                                },
                              );
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
                            bumpNameTranslateReqId('school-transfer.parentName');
                            setSchoolTransferFields({
                              ...schoolTransferFields,
                              parentName,
                            });
                            if (fieldErrors.parentName) {
                              setFieldErrors((prev) => ({ ...prev, parentName: undefined }));
                            }
                          }}
                          onBlur={() => {
                            void applyNameMarathiIfUnchanged(
                              'school-transfer.parentName',
                              schoolTransferFields.parentName,
                              (translated, trimmed) => {
                                setSchoolTransferFields((prev) => {
                                  if (prev.parentName.trim() !== trimmed) return prev;
                                  return { ...prev, parentName: translated };
                                });
                              },
                            );
                          }}
                          required
                        />
                      </FieldGroup>
                      <LetterAddressField
                        label={lt('letterGeneration.fields.address')}
                        addressType={addressTypeForField('applicant')}
                        entryMode="structured"
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
                                bumpNameTranslateReqId('ration.fullName');
                                setRationFields({ ...rationFields, fullName });
                                if (fieldErrors.fullName) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    fullName: undefined,
                                  }));
                                }
                              }}
                              onBlur={() => {
                                void applyNameMarathiIfUnchanged(
                                  'ration.fullName',
                                  rationFields.fullName,
                                  (translated, trimmed) => {
                                    setRationFields((prev) => {
                                      if (prev.fullName.trim() !== trimmed) return prev;
                                      return { ...prev, fullName: translated };
                                    });
                                  },
                                );
                              }}
                              required
                            />
                          </FieldGroup>
                        </div>
                        <LetterAddressField
                          label={lt('letterGeneration.fields.address')}
                          addressType={addressTypeForField('applicant')}
                          entryMode="structured"
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
                          <div className="flex flex-col gap-4">
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
                                      bumpNameTranslateReqId(
                                        `ration.familyMember.${index}`,
                                      );
                                      const next = familyMemberRows.map((row, i) =>
                                        i === index ? { ...row, name } : row,
                                      );
                                      updateFamilyMemberRows(next);
                                    }}
                                    onBlur={() => {
                                      const fieldKey = `ration.familyMember.${index}`;
                                      const source = member.name;
                                      void applyNameMarathiIfUnchanged(
                                        fieldKey,
                                        source,
                                        (translated, trimmed) => {
                                          const current = familyMemberRowsRef.current;
                                          if (
                                            !current[index] ||
                                            current[index].name.trim() !== trimmed
                                          ) {
                                            return;
                                          }
                                          updateFamilyMemberRows(
                                            current.map((row, i) =>
                                              i === index
                                                ? { ...row, name: translated }
                                                : row,
                                            ),
                                          );
                                        },
                                      );
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
                              bumpNameTranslateReqId('income.fullName');
                              setIncomeFields({ ...incomeFields, fullName });
                              if (fieldErrors.fullName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  fullName: undefined,
                                }));
                              }
                            }}
                            onBlur={() => {
                              void applyNameMarathiIfUnchanged(
                                'income.fullName',
                                incomeFields.fullName,
                                (translated, trimmed) => {
                                  setIncomeFields((prev) => {
                                    if (prev.fullName.trim() !== trimmed) return prev;
                                    return { ...prev, fullName: translated };
                                  });
                                },
                              );
                            }}
                            required
                          />
                        </FieldGroup>
                      </div>
                      <LetterAddressField
                        label={lt('letterGeneration.fields.address')}
                        addressType={addressTypeForField('applicant')}
                        entryMode="structured"
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
                              bumpNameTranslateReqId('domicile.fullName');
                              setDomicileFields({ ...domicileFields, fullName });
                              if (fieldErrors.fullName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  fullName: undefined,
                                }));
                              }
                            }}
                            onBlur={() => {
                              void applyNameMarathiIfUnchanged(
                                'domicile.fullName',
                                domicileFields.fullName,
                                (translated, trimmed) => {
                                  setDomicileFields((prev) => {
                                    if (prev.fullName.trim() !== trimmed) return prev;
                                    return { ...prev, fullName: translated };
                                  });
                                },
                              );
                            }}
                            required
                          />
                        </FieldGroup>
                      </div>
                      <LetterAddressField
                        label={lt('letterGeneration.fields.address')}
                        addressType={addressTypeForField('applicant')}
                        entryMode="structured"
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

                    <TabsContent value="ward" className="mt-0 space-y-4">
                      {renderCommonFields(wardFields, setWardFields)}
                      {wardIssueLocked ? null : (
                      <FieldGroup
                        label={lt('letterGeneration.fields.issueType')}
                        required
                      >
                        <Combobox
                          value={wardFields.issueType}
                          onValueChange={(value) => {
                            const issueType = resolveWardIssueType(value);
                            setFieldErrors((prev) => ({
                              ...prev,
                              duration: undefined,
                            }));
                            const preferred = findWardOfficerAddress(addresses, issueType);
                            if (preferred) {
                              setWardFields((prev) => ({
                                ...prev,
                                issueType,
                                duration: wardIssueRequiresDuration(issueType)
                                  ? prev.duration
                                  : '',
                              }));
                              handleWardToAddressSelect(preferred.id);
                              return;
                            }
                            setWardFields((prev) => ({
                              ...prev,
                              issueType,
                              toName: addressSelections.to
                                ? prev.toName
                                : getDefaultWardToName(issueType, letterLocale),
                              to: addressSelections.to
                                ? prev.to
                                : getDefaultWardToAddress(issueType, letterLocale),
                              duration: wardIssueRequiresDuration(issueType)
                                ? prev.duration
                                : '',
                            }));
                          }}
                          options={wardIssueComboboxOptions}
                          placeholder={lt('letterGeneration.placeholders.issueType')}
                        />
                      </FieldGroup>
                      )}
                      <LetterAddressField
                        label={lt('letterGeneration.fields.to')}
                        addressType={addressTypeForField('to')}
                        locale={letterLocale}
                        selectedAddressId={addressSelections.to}
                        addresses={addresses}
                        addressParts={manualAddressParts.to}
                        onAddressPartsChange={(parts) =>
                          handleManualAddressPartsChange('to', parts)
                        }
                        pincodeError={addressPincodeErrors.to}
                        error={fieldErrors.toAddress ?? fieldErrors.to}
                        required
                        nameLabel={lt('letterGeneration.fields.toName')}
                        namePlaceholder={lt('letterGeneration.placeholders.toName')}
                        nameValue={wardFields.toName}
                        nameRequired
                        nameError={fieldErrors.toName}
                        onNameChange={(value) => {
                          setWardFields((prev) => {
                            const addressText = formatAddressForManualKey(
                              manualAddressParts.to,
                              letterLocale,
                              'to',
                            );
                            return {
                              ...prev,
                              toName: value,
                              to: combineNameAndAddress(value, addressText, ',<br>', {
                                boldName: true,
                              }),
                            };
                          });
                          if (fieldErrors.toName) {
                            setFieldErrors((prev) => ({ ...prev, toName: undefined }));
                          }
                        }}
                        onSelectedAddressIdChange={(id) =>
                          handleWardToAddressSelect(id, wardFields.to)
                        }
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FieldGroup
                          label={lt('letterGeneration.fields.complainantName')}
                          required
                          error={fieldErrors.complainantName}
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={wardFields.complainantName}
                            onValueChange={(complainantName) => {
                              bumpNameTranslateReqId('ward.complainantName');
                              setWardFields((prev) => ({ ...prev, complainantName }));
                              if (fieldErrors.complainantName) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  complainantName: undefined,
                                }));
                              }
                            }}
                            onBlur={() => {
                              void applyNameMarathiIfUnchanged(
                                'ward.complainantName',
                                wardFields.complainantName,
                                (translated, trimmed) => {
                                  setWardFields((prev) => {
                                    if (prev.complainantName.trim() !== trimmed) return prev;
                                    return { ...prev, complainantName: translated };
                                  });
                                },
                              );
                            }}
                            required
                          />
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.contactNo')}
                          required
                          error={fieldErrors.contactNo}
                        >
                          <Input
                            value={
                              wardFields.contactNo
                                ? toLocaleDigits(wardFields.contactNo, letterLocale)
                                : ''
                            }
                            onChange={(e) => {
                              if (lockContactNo) return;
                              setWardFields((prev) => ({
                                ...prev,
                                contactNo: normalizeContactNo(e.target.value),
                              }));
                              if (fieldErrors.contactNo) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  contactNo: undefined,
                                }));
                              }
                            }}
                            inputMode="numeric"
                            maxLength={10}
                            placeholder={lt('letterGeneration.placeholders.contactNo')}
                            required
                            readOnly={lockContactNo}
                            disabled={lockContactNo}
                          />
                        </FieldGroup>
                        <FieldGroup
                          label={lt('letterGeneration.fields.location')}
                          required
                          error={fieldErrors.location}
                          className="sm:col-span-2"
                        >
                          <LocaleTextInput
                            locale={letterLocale}
                            value={wardFields.location}
                            onValueChange={(location) => {
                              setWardFields((prev) => ({ ...prev, location }));
                              if (fieldErrors.location) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  location: undefined,
                                }));
                              }
                            }}
                            placeholder={lt('letterGeneration.placeholders.location')}
                            required
                          />
                        </FieldGroup>
                        {wardIssueRequiresDuration(
                          resolveWardIssueType(wardFields.issueType),
                        ) ? (
                          <FieldGroup
                            label={lt('letterGeneration.fields.duration')}
                            required
                            error={fieldErrors.duration}
                            className="sm:col-span-2"
                          >
                            <LocaleTextInput
                              locale={letterLocale}
                              value={wardFields.duration}
                              onValueChange={(duration) => {
                                setWardFields((prev) => ({ ...prev, duration }));
                                if (fieldErrors.duration) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    duration: undefined,
                                  }));
                                }
                              }}
                              placeholder={lt('letterGeneration.placeholders.duration')}
                              required
                            />
                          </FieldGroup>
                        ) : null}
                      </div>
                    </TabsContent>

                    {customPlaceholders.length > 0 ? (
                      <div className="mt-6 space-y-4 border-t pt-4">
                        <div className="space-y-1">
                          <h3 className="text-sm font-medium">
                            {t('letterGeneration.customFields.title')}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t('letterGeneration.customFields.description')}
                          </p>
                        </div>
                        {customPlaceholders.map((key) => (
                          <FieldGroup
                            key={key}
                            label={humanizePlaceholderKey(key)}
                          >
                            <LocaleTextInput
                              locale={letterLocale}
                              value={customPlaceholderValues[key] ?? ''}
                              onValueChange={(value) => {
                                setCustomPlaceholderValues((prev) => ({
                                  ...prev,
                                  [key]: value,
                                }));
                              }}
                              placeholder={t(
                                'letterGeneration.customFields.placeholder',
                                { key },
                              )}
                            />
                          </FieldGroup>
                        ))}
                      </div>
                    ) : null}
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
                        onClick={() => setClearAllDialogOpen(true)}
                      >
                        <Eraser className="mr-2 size-4" />
                        {t('letterGeneration.clearAll')}
                      </Button>
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
                    variant="inline"
                  />
                </div>
              </div>
                </>
              )}
            </Tabs>
          </CardContent>
        )}
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
                  <Combobox
                    value={filterLetterType}
                    onValueChange={(value: SavedLetterTypeFilter) =>
                      setFilterLetterType(value)
                    }
                    options={savedLetterTypeFilterOptions}
                  />
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
                              {letter.printedAt ? (
                                <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-400">
                                  ({t('letterGeneration.savedLetters.printedBadge')})
                                </span>
                              ) : null}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {resolveTypeLabel(letter.letterType)} ·{' '}
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
                              {letter.printedAt ? (
                                <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-400">
                                  ({t('letterGeneration.savedLetters.printedBadge')})
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              {resolveTypeLabel(letter.letterType)}{' '}
                              <span className="text-muted-foreground">
                                ({getLetterPaperLabel(resolveSavedLetterPaperSize(letter))})
                              </span>
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
                    <DialogContent
                      className={cn(
                        'max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto p-4 sm:w-full sm:p-6',
                        selectedSavedLetter
                          ? getLetterPreviewDialogMaxWidthClass(
                            resolveSavedLetterPaperSize(selectedSavedLetter),
                          )
                          : 'max-w-3xl',
                      )}
                    >
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
                                  {resolveTypeLabel(selectedSavedLetter.letterType)} ·{' '}
                                  {t('letterGeneration.paperSize.label', {
                                    size: getLetterPaperLabel(
                                      resolveSavedLetterPaperSize(selectedSavedLetter),
                                    ),
                                  })}
                                </DialogDescription>
                              </div>
                              <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center">
                                {outwardAddedReferenceNos.has(
                                  selectedSavedLetter.referenceNo,
                                ) ? (
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
                                      {t(
                                        'letterGeneration.savedLetters.actions.goToOutward',
                                      )}
                                    </Link>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() =>
                                      void handleAddLetterToOutward(selectedSavedLetter)
                                    }
                                    disabled={
                                      addingToOutwardLetterId === selectedSavedLetter.id
                                    }
                                  >
                                    {addingToOutwardLetterId ===
                                    selectedSavedLetter.id ? (
                                      <Loader2 className="mr-2 size-4 animate-spin" />
                                    ) : (
                                      <Send className="mr-2 size-4" />
                                    )}
                                    {t(
                                      'letterGeneration.savedLetters.actions.addToOutward',
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() =>
                                    void handlePrintSavedLetter(selectedSavedLetter)
                                  }
                                  disabled={
                                    printingLetterId === selectedSavedLetter.id
                                  }
                                >
                                  {printingLetterId === selectedSavedLetter.id ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                  ) : (
                                    <Printer className="mr-2 size-4" />
                                  )}
                                  {t('letterGeneration.savedLetters.actions.print')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  onClick={() =>
                                    void handleDownloadSavedLetter(selectedSavedLetter)
                                  }
                                  disabled={
                                    downloadingLetterId === selectedSavedLetter.id
                                  }
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
                          <div className="w-full">
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
                              variant="modal"
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

      <ConfirmDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        title={t('letterGeneration.clearAllConfirmTitle')}
        description={t('letterGeneration.clearAllConfirmDescription')}
        confirmText={t('letterGeneration.clearAll')}
        cancelText={t('common.cancel')}
        variant="destructive"
        onConfirm={confirmClearAll}
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

      <ConfirmDialog
        open={printPaperDialogOpen}
        onOpenChange={(open) => {
          setPrintPaperDialogOpen(open);
          if (!open) setLetterPendingPrint(null);
        }}
        title={t('letterGeneration.printPaperSize.title')}
        description={printPaperSizeInfo}
        confirmText={t('letterGeneration.printPaperSize.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmPrintPaperSize}
      />

      <ConfirmDialog
        open={reprintDialogOpen}
        onOpenChange={(open) => {
          setReprintDialogOpen(open);
          if (!open) {
            setLetterPendingPrint(null);
            setReprintWarning('');
          }
        }}
        title={t('letterGeneration.savedLetters.reprintConfirmTitle')}
        description={reprintWarning}
        confirmText={t('letterGeneration.savedLetters.actions.reprintConfirm')}
        cancelText={t('common.cancel')}
        onConfirm={confirmReprintSavedLetter}
      />
    </div>
  );
}
